import { createHash } from 'node:crypto';
import {
    CaseEventEnvelopeSchema,
    CaseProjectionSchema,
    type CaseEventEnvelope,
    type CaseProjection,
} from '@house-maint/contracts';
import {
    CANONICAL_CASE_WRITER,
    CaseStoreError,
    type StoreCommandResult,
    type StoreDecider,
    type StoreTransaction,
} from './contracts.js';

export interface SqlResult<Row> {
    rows: Row[];
    rowCount: number | null;
}

export interface SqlClient {
    query<Row = unknown>(text: string, params?: unknown[]): Promise<SqlResult<Row>>;
}

export interface TransactionalSqlDatabase extends SqlClient {
    withTransaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
}

interface ProjectionRow {
    id: number | string;
    organization_id: number | string;
    property_id: number | string | null;
    unit_id: number | string | null;
    title: string;
    status: CaseProjection['status'];
    stage: CaseProjection['stage'];
    priority: CaseProjection['priority'];
    version: number | string;
    active_run_id: string | null;
    accepted_artifact_ids_json: unknown;
    created_at: string | Date;
    updated_at: string | Date;
    closed_at: string | Date | null;
    write_authority: string;
}

interface ReceiptRow {
    command_hash: string;
    response_json: unknown;
}

interface EventRow {
    event_id: string;
    organization_id: number | string;
    case_id: number | string;
    sequence: number | string;
    case_version: number | string;
    event_type: CaseEventEnvelope['event_type'];
    actor_type: CaseEventEnvelope['actor_type'];
    actor_membership_id: number | string | null;
    idempotency_key: string;
    correlation_id: string;
    payload_json: unknown;
    occurred_at: string | Date;
}

function hash(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}

function asIso(value: string | Date | null): string | null {
    if (value === null) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new CaseStoreError('invalid_state', 'Stored timestamp is invalid');
    return parsed.toISOString();
}

function parseJson(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        throw new CaseStoreError('invalid_state', 'Stored canonical JSON is malformed');
    }
}

function positiveNumber(value: unknown, label: string): number {
    const result = Number(value);
    if (!Number.isInteger(result) || result <= 0) {
        throw new CaseStoreError('invalid_state', `${label} is not a positive integer`);
    }
    return result;
}

function rowProjection(row: ProjectionRow): CaseProjection {
    const accepted = parseJson(row.accepted_artifact_ids_json);
    const parsed = CaseProjectionSchema.safeParse({
        schema: 'case-projection/v1',
        id: positiveNumber(row.id, 'case id'),
        organization_id: positiveNumber(row.organization_id, 'organization id'),
        property_id: row.property_id === null ? null : positiveNumber(row.property_id, 'property id'),
        unit_id: row.unit_id === null ? null : positiveNumber(row.unit_id, 'unit id'),
        title: row.title,
        status: row.status,
        stage: row.stage,
        priority: row.priority,
        version: positiveNumber(row.version, 'case version'),
        active_run_id: row.active_run_id,
        accepted_artifact_ids: accepted,
        created_at: asIso(row.created_at),
        updated_at: asIso(row.updated_at),
        closed_at: asIso(row.closed_at),
    });
    if (!parsed.success) throw new CaseStoreError('invalid_state', 'Stored case projection violates case-projection/v1');
    return parsed.data;
}

function storedResult(row: ReceiptRow): StoreCommandResult {
    const value = parseJson(row.response_json) as Partial<StoreCommandResult>;
    const event = CaseEventEnvelopeSchema.safeParse(value?.event);
    const projection = CaseProjectionSchema.safeParse(value?.projection);
    if (!event.success || !projection.success || value.commandHash !== row.command_hash) {
        throw new CaseStoreError('invalid_state', 'Stored command receipt is malformed');
    }
    return { event: event.data, projection: projection.data, commandHash: row.command_hash, replayed: true };
}

function validateMutation(transaction: StoreTransaction, mutation: StoreCommandResult): void {
    const event = CaseEventEnvelopeSchema.safeParse(mutation.event);
    const projection = CaseProjectionSchema.safeParse(mutation.projection);
    if (!event.success || !projection.success
        || event.data.organization_id !== transaction.organizationId
        || projection.data.organization_id !== transaction.organizationId
        || event.data.case_id !== projection.data.id
        || event.data.case_version !== projection.data.version) {
        throw new CaseStoreError('invalid_state', 'Command decider returned an invalid mutation');
    }
}

const projectionColumns = `id, organization_id, property_id, unit_id, title, status, stage,
    priority, version, active_run_id, accepted_artifact_ids_json, created_at, updated_at,
    closed_at, write_authority`;

/** PostgreSQL implementation; applying its migration is a separate, forward-only operation. */
export class PostgresCaseCommandRepository {
    constructor(private readonly database: TransactionalSqlDatabase) {}

    execute(transaction: StoreTransaction, decide: StoreDecider): Promise<StoreCommandResult> {
        if (transaction.writerAuthority !== CANONICAL_CASE_WRITER) {
            throw new CaseStoreError('writer_conflict', 'Canonical case mutation requires CaseCommandService authority');
        }
        return this.database.withTransaction(async (client) => {
            await client.query(`SELECT set_config('house_maint.case_writer', $1, true)`, [CANONICAL_CASE_WRITER]);
            await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
                `${transaction.organizationId}:${transaction.idempotencyKey}`,
            ]);
            const receipt = await client.query<ReceiptRow>(
                `SELECT command_hash, response_json
                   FROM case_command_receipts
                  WHERE organization_id = $1 AND idempotency_key = $2
                  FOR UPDATE`,
                [transaction.organizationId, transaction.idempotencyKey],
            );
            if (receipt.rows[0]) {
                if (receipt.rows[0].command_hash !== transaction.commandHash) {
                    throw new CaseStoreError('idempotency_conflict', 'Idempotency key was reused with a different command');
                }
                return storedResult(receipt.rows[0]);
            }

            let caseId = transaction.requestedCaseId;
            let current: CaseProjection | null = null;
            if (caseId !== null) {
                const selected = await client.query<ProjectionRow>(
                    `SELECT ${projectionColumns}
                       FROM maintenance_cases
                      WHERE organization_id = $1 AND id = $2
                      FOR UPDATE`,
                    [transaction.organizationId, caseId],
                );
                const row = selected.rows[0];
                if (row) {
                    if (row.write_authority !== CANONICAL_CASE_WRITER) {
                        throw new CaseStoreError('writer_conflict', 'Case is not owned by the canonical command writer');
                    }
                    current = rowProjection(row);
                } else {
                    throw new CaseStoreError('not_found', 'Maintenance case was not found');
                }
            } else {
                const allocated = await client.query<{ id: number | string }>(
                    `SELECT nextval(pg_get_serial_sequence('maintenance_cases', 'id')) AS id`,
                );
                caseId = positiveNumber(allocated.rows[0]?.id, 'allocated case id');
            }
            if ((current?.version ?? 0) !== transaction.expectedVersion) {
                throw new CaseStoreError('version_conflict', 'Maintenance case version is stale');
            }
            if (caseId === null) throw new CaseStoreError('invalid_state', 'A case id was not allocated');

            const mutation = decide({ caseId, current, occurredAt: transaction.occurredAt });
            const result: StoreCommandResult = {
                ...mutation,
                replayed: false,
                commandHash: transaction.commandHash,
            };
            validateMutation(transaction, result);

            if (current === null) {
                await client.query(
                    `INSERT INTO maintenance_cases (
                        id, organization_id, property_id, unit_id, title, status, stage, priority,
                        version, active_run_id, accepted_artifact_ids_json, created_at, updated_at,
                        closed_at, write_authority
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15)`,
                    [
                        result.projection.id, result.projection.organization_id,
                        result.projection.property_id, result.projection.unit_id, result.projection.title,
                        result.projection.status, result.projection.stage, result.projection.priority,
                        result.projection.version, result.projection.active_run_id,
                        JSON.stringify(result.projection.accepted_artifact_ids), result.projection.created_at,
                        result.projection.updated_at, result.projection.closed_at, CANONICAL_CASE_WRITER,
                    ],
                );
            } else {
                const updated = await client.query(
                    `UPDATE maintenance_cases
                        SET property_id=$1, unit_id=$2, title=$3, status=$4, stage=$5, priority=$6,
                            version=$7, active_run_id=$8, accepted_artifact_ids_json=$9::jsonb,
                            updated_at=$10, closed_at=$11
                      WHERE organization_id=$12 AND id=$13 AND version=$14
                        AND write_authority=$15`,
                    [
                        result.projection.property_id, result.projection.unit_id, result.projection.title,
                        result.projection.status, result.projection.stage, result.projection.priority,
                        result.projection.version, result.projection.active_run_id,
                        JSON.stringify(result.projection.accepted_artifact_ids), result.projection.updated_at,
                        result.projection.closed_at, transaction.organizationId, caseId,
                        transaction.expectedVersion, CANONICAL_CASE_WRITER,
                    ],
                );
                if (updated.rowCount !== 1) {
                    throw new CaseStoreError('version_conflict', 'Maintenance case changed during command commit');
                }
            }

            const payloadJson = JSON.stringify(result.event.payload);
            const projectionJson = JSON.stringify({ reducer_version: 2, projection: result.projection });
            await client.query(
                `INSERT INTO case_events (
                    event_id, organization_id, case_id, sequence, case_version, event_type,
                    schema_version, reducer_version, actor_type, actor_membership_id,
                    idempotency_key, command_hash, payload_hash, projection_patch_json,
                    payload_json, correlation_id, occurred_at
                ) VALUES ($1,$2,$3,$4,$5,$6,1,2,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
                [
                    result.event.event_id, result.event.organization_id, result.event.case_id,
                    result.event.sequence, result.event.case_version, result.event.event_type,
                    result.event.actor_type, result.event.actor_membership_id,
                    result.event.idempotency_key, transaction.commandHash, hash(payloadJson),
                    projectionJson, payloadJson, result.event.correlation_id, result.event.occurred_at,
                ],
            );
            await client.query(
                `INSERT INTO case_command_receipts (
                    organization_id, idempotency_key, case_id, command_hash, event_id,
                    case_version, response_json, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
                [
                    transaction.organizationId, transaction.idempotencyKey, caseId,
                    transaction.commandHash, result.event.event_id, result.projection.version,
                    JSON.stringify(result), result.event.occurred_at,
                ],
            );
            return result;
        });
    }

    async load(organizationId: number, caseId: number): Promise<CaseProjection | null> {
        const selected = await this.database.query<ProjectionRow>(
            `SELECT ${projectionColumns}
               FROM maintenance_cases
              WHERE organization_id = $1 AND id = $2 AND write_authority = $3`,
            [organizationId, caseId, CANONICAL_CASE_WRITER],
        );
        return selected.rows[0] ? rowProjection(selected.rows[0]) : null;
    }

    async timeline(organizationId: number, caseId: number): Promise<CaseEventEnvelope[]> {
        const result = await this.database.query<EventRow>(
            `SELECT e.event_id, e.organization_id, e.case_id, e.sequence, e.case_version,
                    e.event_type, e.actor_type, e.actor_membership_id, e.idempotency_key,
                    e.correlation_id, e.payload_json, COALESCE(e.occurred_at, e.created_at) AS occurred_at
               FROM case_events e
               JOIN maintenance_cases c
                 ON c.organization_id = e.organization_id AND c.id = e.case_id
              WHERE e.organization_id = $1 AND e.case_id = $2 AND c.write_authority = $3
              ORDER BY e.sequence ASC`,
            [organizationId, caseId, CANONICAL_CASE_WRITER],
        );
        return result.rows.map((row) => {
            const parsed = CaseEventEnvelopeSchema.safeParse({
                schema: 'case-event/v1',
                event_id: row.event_id,
                organization_id: positiveNumber(row.organization_id, 'organization id'),
                case_id: positiveNumber(row.case_id, 'case id'),
                sequence: positiveNumber(row.sequence, 'event sequence'),
                case_version: positiveNumber(row.case_version, 'case version'),
                event_type: row.event_type,
                actor_type: row.actor_type,
                actor_membership_id: row.actor_membership_id === null
                    ? null : positiveNumber(row.actor_membership_id, 'actor membership id'),
                idempotency_key: row.idempotency_key,
                correlation_id: row.correlation_id,
                payload: parseJson(row.payload_json),
                occurred_at: asIso(row.occurred_at),
            });
            if (!parsed.success) throw new CaseStoreError('invalid_state', 'Stored timeline event is malformed');
            return parsed.data;
        });
    }
}
