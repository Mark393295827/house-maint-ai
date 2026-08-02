import {
    CaseEventEnvelopeSchema,
    CaseProjectionSchema,
    type CaseEventEnvelope,
    type CaseProjection,
} from '@house-maint/contracts';
import { CaseDomainError } from './errors.js';

type Payload = Record<string, unknown>;

const stageOrder = new Map<CaseProjection['stage'], number>([
    ['intake', 0],
    ['diagnosis', 1],
    ['resolution', 2],
    ['dispatch', 3],
    ['repair', 4],
    ['verification', 5],
    ['closed', 6],
]);

function payloadOf(event: CaseEventEnvelope): Payload {
    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
        throw new CaseDomainError('invalid_event', 'Case event payload must be an object');
    }
    return event.payload;
}

function stringField(payload: Payload, key: string): string {
    const value = payload[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new CaseDomainError('invalid_event', `${key} must be a non-empty string`);
    }
    return value;
}

function nullablePositiveId(payload: Payload, key: string, fallback: number | null): number | null {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) return fallback;
    const value = payload[key];
    if (value === null) return null;
    if (!Number.isInteger(value) || Number(value) <= 0) {
        throw new CaseDomainError('invalid_event', `${key} must be a positive integer or null`);
    }
    return Number(value);
}

function parseProjection(value: unknown): CaseProjection {
    const parsed = CaseProjectionSchema.safeParse(value);
    if (!parsed.success) {
        throw new CaseDomainError('invalid_event', 'Case event produced an invalid case projection');
    }
    return parsed.data;
}

function assertEventBinding(previous: CaseProjection | null, event: CaseEventEnvelope): void {
    const expected = previous ? previous.version + 1 : 1;
    if (event.sequence !== expected || event.case_version !== expected) {
        throw new CaseDomainError('invalid_event', 'Case event sequence and version must advance exactly once');
    }
    if (previous && (previous.id !== event.case_id || previous.organization_id !== event.organization_id)) {
        throw new CaseDomainError('invalid_event', 'Case event changed its case or organization binding');
    }
}

function assertMutable(previous: CaseProjection, eventType: string): void {
    if (previous.status === 'closed' || previous.status === 'cancelled') {
        throw new CaseDomainError('invalid_state', `${eventType} is not allowed for a terminal case`);
    }
}

function openingProjection(event: CaseEventEnvelope): CaseProjection {
    const payload = payloadOf(event);
    const propertyId = nullablePositiveId(payload, 'property_id', null);
    const unitId = nullablePositiveId(payload, 'unit_id', null);
    if (unitId !== null && propertyId === null) {
        throw new CaseDomainError('invalid_event', 'unit_id requires property_id');
    }
    return parseProjection({
        schema: 'case-projection/v1',
        id: event.case_id,
        organization_id: event.organization_id,
        property_id: propertyId,
        unit_id: unitId,
        title: stringField(payload, 'title'),
        status: event.event_type === 'legacy_imported' && typeof payload.status === 'string'
            ? payload.status
            : 'open',
        stage: event.event_type === 'legacy_imported' && typeof payload.stage === 'string'
            ? payload.stage
            : 'intake',
        priority: typeof payload.priority === 'string' ? payload.priority : 'normal',
        version: 1,
        active_run_id: null,
        accepted_artifact_ids: [],
        created_at: event.occurred_at,
        updated_at: event.occurred_at,
        closed_at: null,
    });
}

export function reduceCaseEvent(
    previous: CaseProjection | null,
    rawEvent: CaseEventEnvelope | unknown,
): CaseProjection {
    const parsed = CaseEventEnvelopeSchema.safeParse(rawEvent);
    if (!parsed.success) {
        throw new CaseDomainError('invalid_event', 'Case event does not satisfy case-event/v1');
    }
    const event = parsed.data;
    assertEventBinding(previous, event);

    if (!previous) {
        if (event.event_type !== 'case_opened' && event.event_type !== 'legacy_imported') {
            throw new CaseDomainError('invalid_event', 'The first case event must open or import the case');
        }
        return openingProjection(event);
    }
    if (event.event_type === 'case_opened' || event.event_type === 'legacy_imported') {
        throw new CaseDomainError('invalid_event', 'A case cannot be opened or imported twice');
    }

    const payload = payloadOf(event);
    const next: CaseProjection = {
        ...previous,
        version: event.case_version,
        updated_at: event.occurred_at,
    };

    switch (event.event_type) {
        case 'case_updated': {
            assertMutable(previous, event.event_type);
            let changed = false;
            if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
                next.title = stringField(payload, 'title');
                changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
                next.priority = payload.priority as CaseProjection['priority'];
                changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(payload, 'property_id')) {
                next.property_id = nullablePositiveId(payload, 'property_id', previous.property_id);
                changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(payload, 'unit_id')) {
                next.unit_id = nullablePositiveId(payload, 'unit_id', previous.unit_id);
                changed = true;
            }
            if (!changed) throw new CaseDomainError('invalid_event', 'case_updated changed no projection field');
            if (next.unit_id !== null && next.property_id === null) {
                throw new CaseDomainError('invalid_event', 'unit_id requires property_id');
            }
            break;
        }
        case 'case_stage_changed': {
            assertMutable(previous, event.event_type);
            const stage = stringField(payload, 'stage') as CaseProjection['stage'];
            if (stage === 'closed' || !stageOrder.has(stage)
                || (stageOrder.get(stage) ?? -1) < (stageOrder.get(previous.stage) ?? -1)) {
                throw new CaseDomainError('invalid_state', 'Case stages cannot move backward or close indirectly');
            }
            next.stage = stage;
            break;
        }
        case 'agent_run_requested': {
            assertMutable(previous, event.event_type);
            if (previous.status !== 'open') {
                throw new CaseDomainError('invalid_state', 'Agent runs require an open case');
            }
            next.active_run_id = stringField(payload, 'run_id');
            next.stage = 'diagnosis';
            break;
        }
        case 'agent_artifact_accepted': {
            assertMutable(previous, event.event_type);
            const artifactId = stringField(payload, 'artifact_id');
            next.accepted_artifact_ids = previous.accepted_artifact_ids.includes(artifactId)
                ? [...previous.accepted_artifact_ids]
                : [...previous.accepted_artifact_ids, artifactId];
            break;
        }
        case 'approval_requested':
        case 'approval_decided':
            assertMutable(previous, event.event_type);
            break;
        case 'case_resolved':
            if (previous.status !== 'open') {
                throw new CaseDomainError('invalid_state', 'Only an open case can be resolved');
            }
            next.status = 'resolved';
            next.stage = 'verification';
            next.active_run_id = null;
            break;
        case 'case_closed':
            if (previous.status !== 'resolved') {
                throw new CaseDomainError('invalid_state', 'Only a resolved case can be closed');
            }
            next.status = 'closed';
            next.stage = 'closed';
            next.active_run_id = null;
            next.closed_at = event.occurred_at;
            break;
        case 'case_cancelled':
            assertMutable(previous, event.event_type);
            next.status = 'cancelled';
            next.stage = 'closed';
            next.active_run_id = null;
            next.closed_at = event.occurred_at;
            break;
        case 'case_reopened':
            if (previous.status === 'open') {
                throw new CaseDomainError('invalid_state', 'An open case cannot be reopened');
            }
            next.status = 'open';
            next.stage = 'intake';
            next.active_run_id = null;
            next.closed_at = null;
            break;
    }
    return parseProjection(next);
}

export function replayCaseEvents(rawEvents: ReadonlyArray<CaseEventEnvelope | unknown>): CaseProjection {
    if (rawEvents.length === 0) {
        throw new CaseDomainError('not_found', 'No case events were found');
    }
    let projection: CaseProjection | null = null;
    for (const event of rawEvents) projection = reduceCaseEvent(projection, event);
    if (!projection) throw new CaseDomainError('invalid_event', 'Case replay produced no projection');
    return projection;
}
