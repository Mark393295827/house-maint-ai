import {
    CASE_EVENT_REDUCER_VERSION,
    CASE_EVENT_TYPES,
    type CaseEventRow,
    type CaseEventType,
    type CaseProjection,
    type ProjectionPatch,
    type ProjectionPatchEnvelope,
} from './contracts.js';
import { canonicalizeJson, parseCanonicalJson } from './json.js';
import { CaseEventError } from './contracts.js';

const STATUS_VALUES = ['open', 'resolved', 'closed', 'cancelled'] as const;
const STAGE_VALUES = ['intake', 'diagnosis', 'resolution', 'dispatch', 'repair', 'verification', 'closed'] as const;
const PRIORITY_VALUES = ['low', 'normal', 'urgent', 'emergency'] as const;
const PROJECTION_PATCH_KEYS = new Set([
    'title', 'status', 'stage', 'priority', 'propertyId', 'unitId',
    'openedByMembershipId', 'legacyReportId', 'createdAt', 'updatedAt', 'closedAt',
]);

function isPositiveId(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function assertOptionalId(value: unknown, label: string): void {
    if (value !== null && value !== undefined && !isPositiveId(value)) {
        throw new CaseEventError('invalid_input', `${label} must be a positive integer or null`);
    }
}

function assertEnum<T extends string>(value: unknown, values: readonly T[], label: string): asserts value is T {
    if (typeof value !== 'string' || !values.includes(value as T)) {
        throw new CaseEventError('invalid_input', `${label} is unsupported`);
    }
}

function assertTitle(value: unknown): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > 500) {
        throw new CaseEventError('invalid_input', 'title must be 1-500 characters');
    }
}

function assertInstant(value: unknown, label: string): asserts value is string {
    if (typeof value !== 'string' || value.length > 64 || Number.isNaN(Date.parse(value))) {
        throw new CaseEventError('invalid_input', `${label} must be a valid timestamp`);
    }
}

function recordPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new CaseEventError('invalid_json', 'event payload must be a JSON object');
    }
    return payload as Record<string, unknown>;
}

function pickDefined<T extends Record<string, unknown>>(source: T, keys: readonly string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            result[key] = source[key];
        }
    }
    return result;
}

function validateCommonPatch(patch: Record<string, unknown>): void {
    for (const key of Object.keys(patch)) {
        if (!PROJECTION_PATCH_KEYS.has(key)) {
            throw new CaseEventError('invalid_event', `Projection patch key is unsupported: ${key}`);
        }
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'title')) assertTitle(patch.title);
    if (Object.prototype.hasOwnProperty.call(patch, 'status')) assertEnum(patch.status, STATUS_VALUES, 'status');
    if (Object.prototype.hasOwnProperty.call(patch, 'stage')) assertEnum(patch.stage, STAGE_VALUES, 'stage');
    if (Object.prototype.hasOwnProperty.call(patch, 'priority')) assertEnum(patch.priority, PRIORITY_VALUES, 'priority');
    assertOptionalId(patch.propertyId, 'propertyId');
    assertOptionalId(patch.unitId, 'unitId');
    assertOptionalId(patch.openedByMembershipId, 'openedByMembershipId');
    assertOptionalId(patch.legacyReportId, 'legacyReportId');
    if (Object.prototype.hasOwnProperty.call(patch, 'closedAt') && patch.closedAt !== null) {
        assertInstant(patch.closedAt, 'closedAt');
    }
    if (patch.unitId !== null && patch.unitId !== undefined && (patch.propertyId === null || patch.propertyId === undefined)) {
        throw new CaseEventError('invalid_input', 'unitId requires propertyId in the same patch');
    }
}

export function isCaseEventType(value: unknown): value is CaseEventType {
    return typeof value === 'string' && CASE_EVENT_TYPES.includes(value as CaseEventType);
}

export function buildProjectionPatch(
    eventType: CaseEventType,
    payload: Record<string, unknown>,
    current: CaseProjection,
    now: string,
): ProjectionPatch {
    const input = recordPayload(payload);

    if (eventType === 'case_opened' || eventType === 'legacy_imported') {
        assertTitle(input.title ?? current.title);
        const patch: ProjectionPatch = {
            title: input.title === undefined ? current.title : input.title as string,
            status: input.status === undefined ? 'open' : input.status as CaseProjection['status'],
            stage: input.stage === undefined ? 'intake' : input.stage as CaseProjection['stage'],
            priority: input.priority === undefined ? current.priority : input.priority as CaseProjection['priority'],
            propertyId: input.propertyId === undefined ? current.propertyId : input.propertyId as number | null,
            unitId: input.unitId === undefined ? current.unitId : input.unitId as number | null,
            openedByMembershipId: input.openedByMembershipId === undefined
                ? current.openedByMembershipId
                : input.openedByMembershipId as number | null,
            legacyReportId: input.legacyReportId === undefined ? current.legacyReportId : input.legacyReportId as number | null,
            createdAt: current.createdAt,
            updatedAt: now,
            closedAt: null,
        };
        validateCommonPatch(patch as Record<string, unknown>);
        return patch;
    }

    if (eventType === 'case_updated') {
        const patch = pickDefined(input, [
            'title',
            'status',
            'stage',
            'priority',
            'propertyId',
            'unitId',
            'openedByMembershipId',
            'legacyReportId',
            'closedAt',
        ]);
        if (Object.keys(patch).length === 0) {
            throw new CaseEventError('invalid_input', 'case_updated requires at least one projection field');
        }
        validateCommonPatch(patch);
        if (patch.unitId === undefined && current.unitId !== null && patch.propertyId === null) {
            throw new CaseEventError('invalid_input', 'propertyId cannot be cleared while unitId is set');
        }
        return { ...patch } as ProjectionPatch;
    }

    if (eventType === 'case_stage_changed') {
        assertEnum(input.stage, STAGE_VALUES, 'stage');
        return { stage: input.stage, updatedAt: now };
    }

    if (eventType === 'case_resolved') {
        return { status: 'resolved', stage: 'verification', updatedAt: now };
    }

    if (eventType === 'case_closed') {
        return { status: 'closed', stage: 'closed', closedAt: now, updatedAt: now };
    }

    if (eventType === 'case_cancelled') {
        return { status: 'cancelled', stage: 'closed', closedAt: now, updatedAt: now };
    }

    if (eventType === 'case_reopened') {
        return { status: 'open', stage: 'intake', closedAt: null, updatedAt: now };
    }

    throw new CaseEventError('invalid_input', `Unsupported event type: ${eventType}`);
}

export function encodeProjectionPatch(patch: ProjectionPatch): string {
    const envelope: ProjectionPatchEnvelope = {
        reducerVersion: CASE_EVENT_REDUCER_VERSION,
        patch,
    };
    return canonicalizeJson(envelope, 'projectionPatch');
}

export function decodeProjectionPatch(value: string): ProjectionPatchEnvelope {
    const envelope = parseCanonicalJson<ProjectionPatchEnvelope>(value, 'projectionPatch');
    if (!envelope || envelope.reducerVersion !== CASE_EVENT_REDUCER_VERSION || !envelope.patch || typeof envelope.patch !== 'object') {
        throw new CaseEventError('invalid_event', 'projectionPatch has an unsupported reducer version or patch');
    }
    validateCommonPatch(envelope.patch as Record<string, unknown>);
    return envelope;
}

export function reduceCaseProjection(
    previous: CaseProjection | null,
    event: Pick<CaseEventRow, 'organization_id' | 'case_id' | 'event_type' | 'sequence' | 'reducer_version' | 'projection_patch_json'>,
): CaseProjection {
    if (event.reducer_version !== CASE_EVENT_REDUCER_VERSION) {
        throw new CaseEventError('invalid_event', 'Unknown reducer version');
    }
    const envelope = decodeProjectionPatch(event.projection_patch_json);
    const patch = envelope.patch;

    if (!previous) {
        if (event.event_type !== 'case_opened' && event.event_type !== 'legacy_imported') {
            throw new CaseEventError('invalid_event', 'The first case event must open or import the case');
        }
        const first = patch as Record<string, unknown>;
        assertTitle(first.title);
        assertEnum(first.status, STATUS_VALUES, 'status');
        assertEnum(first.stage, STAGE_VALUES, 'stage');
        assertEnum(first.priority, PRIORITY_VALUES, 'priority');
        assertInstant(first.createdAt, 'createdAt');
        assertInstant(first.updatedAt, 'updatedAt');
        if (first.closedAt !== null && first.closedAt !== undefined) assertInstant(first.closedAt, 'closedAt');
        assertOptionalId(first.propertyId, 'propertyId');
        assertOptionalId(first.unitId, 'unitId');
        assertOptionalId(first.openedByMembershipId, 'openedByMembershipId');
        assertOptionalId(first.legacyReportId, 'legacyReportId');
        if (first.unitId !== null && first.unitId !== undefined && (first.propertyId === null || first.propertyId === undefined)) {
            throw new CaseEventError('invalid_event', 'Opening event has unit without property');
        }
        return {
            id: event.case_id,
            organizationId: event.organization_id,
            propertyId: first.propertyId as number | null ?? null,
            unitId: first.unitId as number | null ?? null,
            openedByMembershipId: first.openedByMembershipId as number | null ?? null,
            legacyReportId: first.legacyReportId as number | null ?? null,
            title: first.title as string,
            status: first.status as CaseProjection['status'],
            stage: first.stage as CaseProjection['stage'],
            priority: first.priority as CaseProjection['priority'],
            version: 1,
            createdAt: first.createdAt as string,
            updatedAt: first.updatedAt as string,
            closedAt: first.closedAt as string | null ?? null,
        };
    }

    if (event.event_type === 'case_opened' || event.event_type === 'legacy_imported') {
        throw new CaseEventError('invalid_event', 'Opening or import events are only valid as the first event');
    }

    if (event.sequence !== previous.version + 1) {
        throw new CaseEventError('invalid_event', 'Event sequence does not match projection version');
    }
    const next = { ...previous, ...patch, version: previous.version + 1 } as CaseProjection;
    validateProjection(next);
    return next;
}

export function validateProjection(projection: CaseProjection): void {
    if (!isPositiveId(projection.id) || !isPositiveId(projection.organizationId)) {
        throw new CaseEventError('invalid_event', 'Projection identifiers must be positive integers');
    }
    if (!Number.isInteger(projection.version) || projection.version < 1) {
        throw new CaseEventError('invalid_event', 'Projection version must be a positive integer');
    }
    assertTitle(projection.title);
    assertEnum(projection.status, STATUS_VALUES, 'status');
    assertEnum(projection.stage, STAGE_VALUES, 'stage');
    assertEnum(projection.priority, PRIORITY_VALUES, 'priority');
    assertOptionalId(projection.propertyId, 'propertyId');
    assertOptionalId(projection.unitId, 'unitId');
    assertOptionalId(projection.openedByMembershipId, 'openedByMembershipId');
    assertOptionalId(projection.legacyReportId, 'legacyReportId');
    if (projection.unitId !== null && projection.propertyId === null) {
        throw new CaseEventError('invalid_event', 'Projection unit requires property');
    }
    assertInstant(projection.createdAt, 'createdAt');
    assertInstant(projection.updatedAt, 'updatedAt');
    if (projection.closedAt !== null) assertInstant(projection.closedAt, 'closedAt');
}
