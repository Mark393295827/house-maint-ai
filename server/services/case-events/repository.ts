import type { TransactionClient } from '../../config/database.js';
import {
    CASE_EVENT_REDUCER_VERSION,
    CASE_EVENT_SCHEMA_VERSION,
    type CaseEventInput,
    type CaseEventResult,
    type CaseEventRow,
    type CaseProjection,
    type CaseRow,
    type CaseEventDatabase,
} from './contracts.js';
import { canonicalizeJson, parseCanonicalJson, sha256 } from './json.js';
import { CaseEventError } from './contracts.js';
import { buildProjectionPatch, encodeProjectionPatch, isCaseEventType, reduceCaseProjection } from './reducer.js';

const ACTOR_TYPES = new Set(['member', 'system', 'agent', 'integration']);
const MAX_IDEMPOTENCY_LENGTH = 128;
const MAX_CORRELATION_LENGTH = 128;

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
    if (!Number.isInteger(value) || (value as number) <= 0) {
        throw new CaseEventError('invalid_input', `${label} must be a positive integer`);
    }
}

function assertBoundedString(value: unknown, label: string, max: number, required = true): asserts value is string {
    if (value === null || value === undefined) {
        if (!required) return;
        throw new CaseEventError('invalid_input', `${label} is required`);
    }
    if (typeof value !== 'string' || value.length === 0 || value.length > max) {
        throw new CaseEventError('invalid_input', `${label} must be 1-${max} characters`);
    }
}

function validateInput(input: CaseEventInput): void {
    assertPositiveInteger(input.organizationId, 'organizationId');
    assertPositiveInteger(input.caseId, 'caseId');
    if (!isCaseEventType(input.eventType)) {
        throw new CaseEventError('invalid_input', 'eventType is unsupported');
    }
    if (typeof input.actorType !== 'string' || !ACTOR_TYPES.has(input.actorType)) {
        throw new CaseEventError('invalid_input', 'actorType is unsupported');
    }
    if (input.actorMembershipId !== null && input.actorMembershipId !== undefined) {
        assertPositiveInteger(input.actorMembershipId, 'actorMembershipId');
    }
    if (input.actorType === 'member' && (input.actorMembershipId === null || input.actorMembershipId === undefined)) {
        throw new CaseEventError('invalid_input', 'member actors require actorMembershipId');
    }
    assertBoundedString(input.idempotencyKey, 'idempotencyKey', MAX_IDEMPOTENCY_LENGTH);
    assertBoundedString(input.correlationId, 'correlationId', MAX_CORRELATION_LENGTH, false);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
        throw new CaseEventError('invalid_input', 'expectedVersion must be a non-negative integer');
    }
    if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
        throw new CaseEventError('invalid_json', 'payload must be a JSON object');
    }
}

function mapCaseRow(row: CaseRow): CaseProjection {
    return {
        id: row.id,
        organizationId: row.organization_id,
        propertyId: row.property_id,
        unitId: row.unit_id,
        openedByMembershipId: row.opened_by_membership_id,
        legacyReportId: row.legacy_report_id,
        title: row.title,
        status: row.status,
        stage: row.stage,
        priority: row.priority,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        closedAt: row.closed_at,
    };
}

function eventResultFromProjection(event: CaseEventRow, projection: CaseProjection, replayed: boolean): CaseEventResult {
    return { event, projection, replayed };
}

export class CaseEventRepository {
    constructor(private readonly database: CaseEventDatabase) {}

    async append(input: CaseEventInput): Promise<CaseEventResult> {
        validateInput(input);
        return this.database.withTransaction((client) => this.appendInTransaction(client, input));
    }

    private async appendInTransaction(client: TransactionClient, input: CaseEventInput): Promise<CaseEventResult> {
        const payloadJson = canonicalizeJson(input.payload, 'payload');
        const payloadHash = sha256(payloadJson);
        const commandJson = canonicalizeJson({
            actorMembershipId: input.actorMembershipId ?? null,
            actorType: input.actorType,
            correlationId: input.correlationId ?? null,
            eventType: input.eventType,
            payload: input.payload,
        }, 'command');
        const commandHash = sha256(commandJson);

        const existing = await client.query<CaseEventRow>(
            `SELECT id, organization_id, case_id, sequence, event_type, schema_version, reducer_version,
                    actor_type, actor_membership_id, idempotency_key, command_hash, payload_hash,
                    projection_patch_json, payload_json, correlation_id, created_at
               FROM case_events
              WHERE organization_id = $1 AND case_id = $2 AND idempotency_key = $3
              LIMIT 1`,
            [input.organizationId, input.caseId, input.idempotencyKey],
        );
        if (existing.rows.length > 0) {
            const event = existing.rows[0];
            if (event.payload_hash !== payloadHash || event.command_hash !== commandHash) {
                throw new CaseEventError('idempotency_conflict', 'Idempotency key was already used with a different command');
            }
            const events = await this.loadEvents(client, input.organizationId, input.caseId);
            const projection = replayEvents(events);
            return eventResultFromProjection(event, projection, true);
        }

        const caseResult = await client.query<CaseRow>(
            `SELECT id, organization_id, property_id, unit_id, opened_by_membership_id, legacy_report_id,
                    title, status, stage, priority, version, created_at, updated_at, closed_at
               FROM maintenance_cases
              WHERE organization_id = $1 AND id = $2
              LIMIT 1`,
            [input.organizationId, input.caseId],
        );
        const currentRow = caseResult.rows[0];
        if (!currentRow) {
            throw new CaseEventError('not_found', 'Maintenance case was not found');
        }
        const current = mapCaseRow(currentRow);
        if (current.version !== input.expectedVersion) {
            throw new CaseEventError('version_conflict', 'Maintenance case version is stale');
        }

        const sequenceResult = await client.query<{ next_sequence: number }>(
            `SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence
               FROM case_events
              WHERE organization_id = $1 AND case_id = $2`,
            [input.organizationId, input.caseId],
        );
        const sequence = Number(sequenceResult.rows[0]?.next_sequence);
        if (!Number.isInteger(sequence) || sequence <= 0) {
            throw new CaseEventError('invalid_state', 'Could not determine next case event sequence');
        }
        if (sequence - 1 !== current.version) {
            throw new CaseEventError('invalid_state', 'Case version and event sequence are out of sync');
        }

        const now = new Date().toISOString();
        const patch = buildProjectionPatch(input.eventType, input.payload, current, now);
        const projectionPatchJson = encodeProjectionPatch(patch);
        const projection = reduceCaseProjection(current.version === 0 ? null : current, {
            organization_id: input.organizationId,
            case_id: input.caseId,
            event_type: input.eventType,
            sequence,
            reducer_version: CASE_EVENT_REDUCER_VERSION,
            projection_patch_json: projectionPatchJson,
        });
        if (projection.version !== current.version + 1) {
            throw new CaseEventError('invalid_state', 'Projection reducer did not advance exactly one version');
        }

        await client.query(
            `INSERT INTO case_events (
                organization_id, case_id, sequence, event_type, schema_version, reducer_version,
                actor_type, actor_membership_id, idempotency_key, command_hash, payload_hash,
                projection_patch_json, payload_json, correlation_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                input.organizationId,
                input.caseId,
                sequence,
                input.eventType,
                CASE_EVENT_SCHEMA_VERSION,
                CASE_EVENT_REDUCER_VERSION,
                input.actorType,
                input.actorMembershipId ?? null,
                input.idempotencyKey,
                commandHash,
                payloadHash,
                projectionPatchJson,
                payloadJson,
                input.correlationId ?? null,
            ],
        );

        const updated = await client.query(
            `UPDATE maintenance_cases
                SET property_id = $1,
                    unit_id = $2,
                    opened_by_membership_id = $3,
                    legacy_report_id = $4,
                    title = $5,
                    status = $6,
                    stage = $7,
                    priority = $8,
                    version = $9,
                    updated_at = $10,
                    closed_at = $11
              WHERE organization_id = $12 AND id = $13 AND version = $14`,
            [
                projection.propertyId,
                projection.unitId,
                projection.openedByMembershipId,
                projection.legacyReportId,
                projection.title,
                projection.status,
                projection.stage,
                projection.priority,
                projection.version,
                projection.updatedAt,
                projection.closedAt,
                input.organizationId,
                input.caseId,
                input.expectedVersion,
            ],
        );
        if (updated.rowCount !== 1) {
            throw new CaseEventError('version_conflict', 'Maintenance case changed during append');
        }

        const inserted = await client.query<CaseEventRow>(
            `SELECT id, organization_id, case_id, sequence, event_type, schema_version, reducer_version,
                    actor_type, actor_membership_id, idempotency_key, command_hash, payload_hash,
                    projection_patch_json, payload_json, correlation_id, created_at
               FROM case_events
              WHERE organization_id = $1 AND case_id = $2 AND idempotency_key = $3
              LIMIT 1`,
            [input.organizationId, input.caseId, input.idempotencyKey],
        );
        const event = inserted.rows[0];
        if (!event) {
            throw new CaseEventError('invalid_state', 'Inserted case event could not be read back');
        }
        return eventResultFromProjection(event, projection, false);
    }

    async replay(organizationId: number, caseId: number): Promise<CaseProjection> {
        assertPositiveInteger(organizationId, 'organizationId');
        assertPositiveInteger(caseId, 'caseId');
        const events = await this.loadEvents(this.database, organizationId, caseId);
        return replayEvents(events);
    }

    private async loadEvents(
        client: Pick<CaseEventDatabase, 'query'> | TransactionClient,
        organizationId: number,
        caseId: number,
    ): Promise<CaseEventRow[]> {
        const result = await client.query<CaseEventRow>(
            `SELECT id, organization_id, case_id, sequence, event_type, schema_version, reducer_version,
                    actor_type, actor_membership_id, idempotency_key, command_hash, payload_hash,
                    projection_patch_json, payload_json, correlation_id, created_at
               FROM case_events
              WHERE organization_id = $1 AND case_id = $2
              ORDER BY sequence ASC`,
            [organizationId, caseId],
        );
        return result.rows;
    }
}

export function replayEvents(events: CaseEventRow[]): CaseProjection {
    if (events.length === 0) {
        throw new CaseEventError('not_found', 'No case events were found');
    }
    let projection: CaseProjection | null = null;
    let expectedSequence = 1;
    let replayOrganizationId: number | null = null;
    let replayCaseId: number | null = null;
    for (const event of events) {
        if (!Number.isInteger(event.sequence) || event.sequence !== expectedSequence) {
            throw new CaseEventError('invalid_event', 'Case event sequence is not contiguous');
        }
        if (!isCaseEventType(event.event_type)) {
            throw new CaseEventError('invalid_event', 'Stored case event type is unsupported');
        }
        if (replayOrganizationId === null) replayOrganizationId = event.organization_id;
        if (replayCaseId === null) replayCaseId = event.case_id;
        if (event.organization_id !== replayOrganizationId || event.case_id !== replayCaseId) {
            throw new CaseEventError('invalid_event', 'Case event organization or case binding changed during replay');
        }
        const payload = parseCanonicalJson<unknown>(event.payload_json, 'payload');
        assertStoredPayloadRecord(payload);
        assertStoredHash(event.payload_hash, 'payload_hash');
        if (sha256(event.payload_json) !== event.payload_hash) {
            throw new CaseEventError('invalid_event', 'Stored payload hash does not match payload_json');
        }
        const commandJson = canonicalizeJson({
            actorMembershipId: event.actor_membership_id ?? null,
            actorType: event.actor_type,
            correlationId: event.correlation_id ?? null,
            eventType: event.event_type,
            payload,
        }, 'command');
        assertStoredHash(event.command_hash, 'command_hash');
        if (sha256(commandJson) !== event.command_hash) {
            throw new CaseEventError('invalid_event', 'Stored command hash does not match command envelope');
        }
        projection = reduceCaseProjection(projection, event);
        expectedSequence += 1;
    }
    if (!projection) {
        throw new CaseEventError('invalid_event', 'Case event replay produced no projection');
    }
    return projection;
}

function assertStoredHash(value: unknown, label: string): asserts value is string {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
        throw new CaseEventError('invalid_event', `${label} is missing or malformed`);
    }
}

function assertStoredPayloadRecord(value: unknown): asserts value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new CaseEventError('invalid_event', 'Stored payload must be a JSON object');
    }
}
