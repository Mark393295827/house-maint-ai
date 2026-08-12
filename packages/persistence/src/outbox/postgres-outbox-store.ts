import { createHash, randomUUID } from 'node:crypto';
import { DeliveryEnvelopeSchema, DeliveryReceiptSchema } from './wire-types.js';
import type { SqlClient, TransactionalSql } from '../runs/types.js';
import {
    OutboxError,
    type EffectIntent,
    type IngressReceipt,
    type OutboxClaim,
    type OutboxClock,
    type OutboxEntry,
    type OutboxIds,
    type OutboxStore,
} from './types.js';
import type { DeliveryReceipt } from './wire-types.js';

interface OutboxRow {
    delivery_id: string;
    effect_key: string;
    effect_kind: OutboxEntry['effect_kind'];
    run_id: string | null;
    scope_id: string;
    policy_version: string;
    action: OutboxEntry['action'];
    proposal_hash: string;
    envelope_json: unknown;
    fingerprint: string;
    state: OutboxEntry['state'];
    attempt_count: number | string;
    max_attempts: number | string;
    next_attempt_at: string | Date;
    lease_owner: string | null;
    lease_token: string | null;
    lease_expires_at: string | Date | null;
    terminal_reason: string | null;
    created_at: string | Date;
    updated_at: string | Date;
}

const COLUMNS = `delivery_id, effect_key, effect_kind, run_id, scope_id, policy_version,
    action, proposal_hash, envelope_json, fingerprint, state, attempt_count,
    max_attempts, next_attempt_at, lease_owner, lease_token, lease_expires_at,
    terminal_reason, created_at, updated_at`;

const systemClock: OutboxClock = { now: () => new Date() };
const randomIds: OutboxIds = { next: () => `lease:${randomUUID()}` };

function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(',')}}`;
    return JSON.stringify(value);
}

function hash(value: unknown): string {
    return createHash('sha256').update(stable(value)).digest('hex');
}

function parsedJson(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { throw new OutboxError('invalid_state', 'Stored outbox JSON is malformed'); }
}

function iso(value: string | Date | null): string | null {
    if (value === null) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(parsed.getTime())) throw new OutboxError('invalid_state', 'Stored outbox instant is invalid');
    return parsed.toISOString();
}

function integer(value: unknown, label: string): number {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new OutboxError('invalid_state', `${label} is invalid`);
    return number;
}

function entryFrom(row: OutboxRow, duplicate = false): OutboxEntry {
    return {
        effect_key: row.effect_key, effect_kind: row.effect_kind, run_id: row.run_id,
        scope_id: row.scope_id, policy_version: row.policy_version, action: row.action,
        proposal_hash: row.proposal_hash, envelope: DeliveryEnvelopeSchema.parse(parsedJson(row.envelope_json)),
        max_attempts: integer(row.max_attempts, 'max attempts'), state: row.state,
        attempts: integer(row.attempt_count, 'attempt count'), next_attempt_at: iso(row.next_attempt_at)!,
        lease_owner: row.lease_owner, lease_token: row.lease_token,
        lease_expires_at: iso(row.lease_expires_at), terminal_reason: row.terminal_reason,
        created_at: iso(row.created_at)!, updated_at: iso(row.updated_at)!, duplicate,
    };
}

function assertClaim(row: OutboxRow, claim: OutboxClaim, now: Date): void {
    if (row.delivery_id !== claim.delivery_id || row.lease_owner !== claim.worker_id
        || row.lease_token !== claim.lease_token || integer(row.attempt_count, 'attempt count') !== claim.attempt) {
        throw new OutboxError('invalid_claim', 'Outbox lease is stale or mismatched');
    }
    if (!row.lease_expires_at || Date.parse(String(row.lease_expires_at)) <= now.getTime()) {
        throw new OutboxError('lease_expired', 'Outbox lease expired before receipt commit');
    }
}

export class PostgresOutboxStore implements OutboxStore {
    constructor(
        private readonly database: TransactionalSql,
        private readonly clock: OutboxClock = systemClock,
        private readonly ids: OutboxIds = randomIds,
    ) {}

    recordIngress(value: Omit<IngressReceipt, 'duplicate'>): Promise<IngressReceipt> {
        if (!['job', 'webhook'].includes(value.source) || !/^[a-f0-9]{64}$/.test(value.payload_hash)) {
            throw new OutboxError('invalid_input', 'Ingress receipt is invalid');
        }
        return this.database.withTransaction(async (client) => {
            await this.lockKey(client, `ingress:${value.source}:${value.idempotency_key}`);
            const prior = await client.query<Omit<IngressReceipt, 'duplicate'>>(
                `SELECT source, idempotency_key, payload_hash, result_ref, recorded_at
                   FROM hm_ingress_receipts WHERE source=$1 AND idempotency_key=$2`,
                [value.source, value.idempotency_key],
            );
            if (prior.rows[0]) {
                if (prior.rows[0].payload_hash !== value.payload_hash || prior.rows[0].result_ref !== value.result_ref) {
                    throw new OutboxError('idempotency_conflict', 'Ingress idempotency key was reused');
                }
                return { ...prior.rows[0], recorded_at: iso(prior.rows[0].recorded_at)!, duplicate: true };
            }
            await client.query(
                `INSERT INTO hm_ingress_receipts (source,idempotency_key,payload_hash,result_ref,recorded_at)
                 VALUES ($1,$2,$3,$4,$5)`,
                [value.source, value.idempotency_key, value.payload_hash, value.result_ref, value.recorded_at],
            );
            return { ...value, duplicate: false };
        });
    }

    enqueue(value: EffectIntent): Promise<OutboxEntry> {
        const envelope = DeliveryEnvelopeSchema.parse(value.envelope);
        if (!/^[a-f0-9]{64}$/.test(value.proposal_hash) || !Number.isInteger(value.max_attempts)
            || value.max_attempts < 1 || value.max_attempts > 8
            || envelope.required_approval_id !== null && envelope.required_approval_id.length === 0) {
            throw new OutboxError('invalid_input', 'Effect intent is invalid');
        }
        const intent: EffectIntent = { ...value, envelope };
        const fingerprint = hash(intent);
        return this.database.withTransaction(async (client) => {
            await this.lockKey(client, `effect:${intent.effect_key}`);
            const prior = await client.query<OutboxRow>(`SELECT ${COLUMNS} FROM hm_outbox WHERE effect_key=$1`, [intent.effect_key]);
            if (prior.rows[0]) {
                if (prior.rows[0].fingerprint !== fingerprint) {
                    throw new OutboxError('idempotency_conflict', 'Effect key was reused with a different intent');
                }
                return entryFrom(prior.rows[0], true);
            }
            const now = this.clock.now().toISOString();
            const inserted = await client.query<OutboxRow>(
                `INSERT INTO hm_outbox (
                    delivery_id,effect_key,effect_kind,run_id,organization_id,scope_id,
                    case_id,case_version,policy_version,action,proposal_hash,required_approval_id,
                    envelope_json,fingerprint,state,max_attempts,next_attempt_at,expires_at,
                    created_at,updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,'ready',$15,$16,$17,$16,$16)
                RETURNING ${COLUMNS}`,
                [envelope.delivery_id, intent.effect_key, intent.effect_kind, intent.run_id,
                    envelope.organization_id, intent.scope_id, envelope.case_id, envelope.case_version,
                    intent.policy_version, intent.action, intent.proposal_hash, envelope.required_approval_id,
                    JSON.stringify(envelope), fingerprint, intent.max_attempts, now, envelope.expires_at],
            );
            return entryFrom(inserted.rows[0]!);
        });
    }

    claim(workerId: string, leaseMs: number): Promise<OutboxClaim | null> {
        if (!workerId || !Number.isInteger(leaseMs) || leaseMs < 1 || leaseMs > 300_000) {
            throw new OutboxError('invalid_claim', 'A worker id and finite outbox lease are required');
        }
        const now = this.clock.now();
        const leaseExpires = new Date(now.getTime() + leaseMs).toISOString();
        const token = this.ids.next('lease');
        return this.database.withTransaction(async (client) => {
            const result = await client.query<OutboxRow & { prior_attempts: number | string }>(
                `WITH candidate AS (
                    SELECT delivery_id, attempt_count AS prior_attempts
                      FROM hm_outbox
                     WHERE attempt_count < max_attempts AND expires_at > $1
                       AND (
                         (state IN ('ready','retry_wait') AND next_attempt_at <= $1)
                         OR (state IN ('claimed','delivering') AND lease_expires_at <= $1)
                       )
                     ORDER BY created_at, delivery_id
                     FOR UPDATE SKIP LOCKED LIMIT 1
                )
                UPDATE hm_outbox o SET state='claimed', attempt_count=o.attempt_count+1,
                    lease_owner=$2, lease_token=$3, lease_expires_at=$4, updated_at=$1
                  FROM candidate c WHERE o.delivery_id=c.delivery_id
                RETURNING ${COLUMNS.split(',').map((column) => `o.${column.trim()}`).join(', ')}, c.prior_attempts`,
                [now.toISOString(), workerId, token, leaseExpires],
            );
            const row = result.rows[0];
            if (!row) return null;
            const entry = entryFrom(row);
            return {
                delivery_id: row.delivery_id, worker_id: workerId, lease_token: token,
                attempt: entry.attempts, lease_expires_at: leaseExpires,
                reclaimed: integer(row.prior_attempts, 'prior attempts') > 0, entry,
            };
        });
    }

    beginDelivery(claim: OutboxClaim): Promise<OutboxEntry> {
        return this.database.withTransaction(async (client) => {
            const row = await this.lockEntry(client, claim.delivery_id);
            assertClaim(row, claim, this.clock.now());
            if (row.state !== 'claimed' && row.state !== 'delivering') throw new OutboxError('invalid_state', 'Delivery is not claimed');
            if (row.state === 'delivering') return entryFrom(row);
            const updated = await client.query<OutboxRow>(
                `UPDATE hm_outbox SET state='delivering', updated_at=$2 WHERE delivery_id=$1 RETURNING ${COLUMNS}`,
                [claim.delivery_id, this.clock.now().toISOString()],
            );
            return entryFrom(updated.rows[0]!);
        });
    }

    recordDelivery(claim: OutboxClaim, value: DeliveryReceipt, retryAt?: string): Promise<OutboxEntry> {
        const receipt = DeliveryReceiptSchema.parse(value);
        if (receipt.delivery_id !== claim.delivery_id || receipt.attempt !== claim.attempt) {
            throw new OutboxError('invalid_receipt', 'Delivery receipt does not bind the active attempt');
        }
        return this.database.withTransaction(async (client) => {
            const row = await this.lockEntry(client, claim.delivery_id);
            if (['delivered', 'cancelled', 'failed', 'expired'].includes(row.state)) {
                const prior = await client.query<{ receipt_json: unknown }>(
                    `SELECT receipt_json FROM hm_delivery_receipts WHERE delivery_id=$1 AND attempt=$2`,
                    [claim.delivery_id, claim.attempt],
                );
                if (prior.rows[0] && hash(parsedJson(prior.rows[0].receipt_json)) === hash(receipt)) return entryFrom(row);
                throw new OutboxError('idempotency_conflict', 'Terminal delivery receipt changed');
            }
            assertClaim(row, claim, this.clock.now());
            await this.insertReceipt(client, receipt);
            const attempts = integer(row.attempt_count, 'attempt count');
            const maxAttempts = integer(row.max_attempts, 'max attempts');
            const canRetry = receipt.status === 'retryable_failure' && attempts < maxAttempts;
            const state: OutboxEntry['state'] = receipt.status === 'delivered' ? 'delivered'
                : canRetry ? 'retry_wait'
                    : receipt.status === 'cancelled' ? 'cancelled'
                        : receipt.status === 'expired' ? 'expired' : 'failed';
            const now = this.clock.now().toISOString();
            const updated = await client.query<OutboxRow>(
                `UPDATE hm_outbox SET state=$2, lease_owner=NULL, lease_token=NULL,
                    lease_expires_at=NULL, next_attempt_at=$3, terminal_reason=$4, updated_at=$5
                  WHERE delivery_id=$1 RETURNING ${COLUMNS}`,
                [claim.delivery_id, state, canRetry ? retryAt ?? now : now,
                    state === 'retry_wait' ? null : receipt.reason_code, now],
            );
            return entryFrom(updated.rows[0]!);
        });
    }

    cancel(claim: OutboxClaim, reasonCode: string): Promise<OutboxEntry> {
        const receipt = DeliveryReceiptSchema.parse({
            schema: 'delivery-receipt/v1', delivery_id: claim.delivery_id, attempt: claim.attempt,
            status: 'cancelled', external_reference_hash: null, reason_code: reasonCode,
            recorded_at: this.clock.now().toISOString(),
        });
        return this.recordDelivery(claim, receipt);
    }

    async get(deliveryId: string): Promise<OutboxEntry | null> {
        const result = await this.database.query<OutboxRow>(`SELECT ${COLUMNS} FROM hm_outbox WHERE delivery_id=$1`, [deliveryId]);
        return result.rows[0] ? entryFrom(result.rows[0]) : null;
    }

    async receipts(deliveryId: string): Promise<DeliveryReceipt[]> {
        const result = await this.database.query<{ receipt_json: unknown }>(
            `SELECT receipt_json FROM hm_delivery_receipts WHERE delivery_id=$1 ORDER BY attempt`, [deliveryId],
        );
        return result.rows.map((row) => DeliveryReceiptSchema.parse(parsedJson(row.receipt_json)));
    }

    private async lockKey(client: SqlClient, key: string): Promise<void> {
        await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [key]);
    }

    private async lockEntry(client: SqlClient, deliveryId: string): Promise<OutboxRow> {
        const result = await client.query<OutboxRow>(`SELECT ${COLUMNS} FROM hm_outbox WHERE delivery_id=$1 FOR UPDATE`, [deliveryId]);
        if (!result.rows[0]) throw new OutboxError('invalid_claim', 'Outbox entry does not exist');
        return result.rows[0];
    }

    private async insertReceipt(client: SqlClient, receipt: DeliveryReceipt): Promise<void> {
        await client.query(
            `INSERT INTO hm_delivery_receipts (
                delivery_id,attempt,status,external_reference_hash,reason_code,receipt_json,recorded_at
            ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT (delivery_id,attempt) DO NOTHING`,
            [receipt.delivery_id, receipt.attempt, receipt.status, receipt.external_reference_hash,
                receipt.reason_code, JSON.stringify(receipt), receipt.recorded_at],
        );
        const prior = await client.query<{ receipt_json: unknown }>(
            `SELECT receipt_json FROM hm_delivery_receipts WHERE delivery_id=$1 AND attempt=$2`,
            [receipt.delivery_id, receipt.attempt],
        );
        if (!prior.rows[0] || hash(parsedJson(prior.rows[0].receipt_json)) !== hash(receipt)) {
            throw new OutboxError('idempotency_conflict', 'Delivery attempt receipt is immutable');
        }
    }
}
