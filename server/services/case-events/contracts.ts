import type { QueryResult, TransactionClient } from '../../config/database.js';

export const CASE_EVENT_REDUCER_VERSION = 1 as const;
export const CASE_EVENT_SCHEMA_VERSION = 1 as const;

export const CASE_EVENT_TYPES = [
    'case_opened',
    'legacy_imported',
    'case_updated',
    'case_stage_changed',
    'case_resolved',
    'case_closed',
    'case_cancelled',
    'case_reopened',
] as const;

export type CaseEventType = (typeof CASE_EVENT_TYPES)[number];
export type CaseActorType = 'member' | 'system' | 'agent' | 'integration';
export type CaseStatus = 'open' | 'resolved' | 'closed' | 'cancelled';
export type CaseStage = 'intake' | 'diagnosis' | 'resolution' | 'dispatch' | 'repair' | 'verification' | 'closed';
export type CasePriority = 'low' | 'normal' | 'urgent' | 'emergency';

export interface CaseProjection {
    id: number;
    organizationId: number;
    propertyId: number | null;
    unitId: number | null;
    openedByMembershipId: number | null;
    legacyReportId: number | null;
    title: string;
    status: CaseStatus;
    stage: CaseStage;
    priority: CasePriority;
    version: number;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}

export type ProjectionPatch = Partial<Omit<CaseProjection, 'id' | 'organizationId' | 'version'>>;

export interface ProjectionPatchEnvelope {
    reducerVersion: typeof CASE_EVENT_REDUCER_VERSION;
    patch: ProjectionPatch;
}

export interface CaseEventInput {
    organizationId: number;
    caseId: number;
    eventType: CaseEventType;
    actorType: CaseActorType;
    actorMembershipId?: number | null;
    idempotencyKey: string;
    correlationId?: string | null;
    expectedVersion: number;
    payload: Record<string, unknown>;
}

export interface CaseEventRow {
    id: number;
    organization_id: number;
    case_id: number;
    sequence: number;
    event_type: CaseEventType;
    schema_version: number;
    reducer_version: number;
    actor_type: CaseActorType;
    actor_membership_id: number | null;
    idempotency_key: string;
    command_hash: string;
    payload_hash: string;
    projection_patch_json: string;
    payload_json: string;
    correlation_id: string | null;
    created_at: string;
}

export interface CaseRow {
    id: number;
    organization_id: number;
    property_id: number | null;
    unit_id: number | null;
    opened_by_membership_id: number | null;
    legacy_report_id: number | null;
    title: string;
    status: CaseStatus;
    stage: CaseStage;
    priority: CasePriority;
    version: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
}

export interface CaseEventResult {
    event: CaseEventRow;
    projection: CaseProjection;
    replayed: boolean;
}

export interface CaseEventDatabase {
    query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    withTransaction<T>(work: (client: TransactionClient) => Promise<T>): Promise<T>;
}

export class CaseEventError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'CaseEventError';
    }
}

