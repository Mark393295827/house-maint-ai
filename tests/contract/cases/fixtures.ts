import {
    CaseCommandEnvelopeSchema,
    EffectiveScopeSchema,
    type CaseCommandEnvelope,
    type EffectiveScope,
} from '@house-maint/contracts';

export const FIXED_NOW = '2026-08-02T06:00:00.000Z';

export function caseScope(input: {
    organizationId?: number;
    caseId?: number;
    actions?: EffectiveScope['actions'];
    propertyId?: number;
    unitId?: number;
    expiresAt?: string;
} = {}): EffectiveScope {
    const organizationId = input.organizationId ?? 1;
    const caseId = input.caseId;
    const scopeKind = caseId ? 'case' : input.propertyId ? 'property' : 'organization';
    const scopeId = caseId
        ? `case:${caseId}`
        : input.unitId
            ? `unit:${input.unitId}`
            : input.propertyId
                ? `property:${input.propertyId}`
                : `organization:${organizationId}`;
    return EffectiveScopeSchema.parse({
        schema: 'effective-scope/v1',
        scope_id: scopeId,
        scope_kind: scopeKind,
        organization_id: organizationId,
        case_id: caseId,
        property_id: input.propertyId,
        unit_id: input.unitId,
        principal: {
            principal_id: `principal:${organizationId}`,
            actor_kind: 'member',
            organization_id: organizationId,
            membership_id: organizationId * 100,
            user_id: organizationId * 10,
            role: 'resident',
            authenticated_at: '2026-08-02T05:50:00.000Z',
        },
        actions: input.actions ?? ['read', 'contribute', 'manage', 'verify'],
        data_classes: ['personal'],
        capabilities: [],
        tool_grants: [],
        purposes: ['maintenance-case'],
        region: 'cn-east',
        retention_days: 30,
        policy_version: 'policy:test:v1',
        resolved_at: '2026-08-02T05:55:00.000Z',
        expires_at: input.expiresAt ?? '2026-08-02T07:00:00.000Z',
    });
}

export function openCaseCommand(input: {
    organizationId?: number;
    key?: string;
    title?: string;
    propertyId?: number | null;
    unitId?: number | null;
    expectedVersion?: number;
} = {}): CaseCommandEnvelope {
    const organizationId = input.organizationId ?? 1;
    const key = input.key ?? 'open-1';
    return CaseCommandEnvelopeSchema.parse({
        schema: 'case-command/v1',
        command_id: `command:${key}`,
        organization_id: organizationId,
        expected_version: input.expectedVersion ?? 0,
        idempotency_key: key,
        correlation_id: `corr:${key}`,
        body: {
            type: 'open_case',
            payload: {
                title: input.title ?? 'Kitchen leak',
                description: 'Water is dripping below the kitchen sink.',
                category: 'plumbing',
                priority: 'urgent',
                property_id: input.propertyId ?? null,
                unit_id: input.unitId ?? null,
                evidence: [{ artifact_id: 'artifact:text:1', media_kind: 'text' }],
            },
        },
        requested_at: '2026-08-02T05:59:00.000Z',
    });
}

export function existingCaseCommand(input: {
    type: Exclude<CaseCommandEnvelope['body']['type'], 'open_case'>;
    caseId: number;
    expectedVersion: number;
    key: string;
    organizationId?: number;
    payload?: Record<string, unknown>;
}): CaseCommandEnvelope {
    const defaultPayload: Record<typeof input.type, Record<string, unknown>> = {
        diagnose_and_plan: {
            confirmed_input_artifact_ids: ['artifact:text:1'],
            locale: 'bilingual',
            requested_capability: 'maintenance.diagnose-and-plan.v1',
        },
        update_case: { title: 'Kitchen leak under sink' },
        resolve_case: { reason_code: 'repair_verified', evidence_artifact_ids: [] },
        close_case: { reason_code: 'resident_confirmed', evidence_artifact_ids: [] },
        cancel_case: { reason_code: 'duplicate_request', evidence_artifact_ids: [] },
        reopen_case: { reason_code: 'issue_returned', evidence_artifact_ids: [] },
    };
    return CaseCommandEnvelopeSchema.parse({
        schema: 'case-command/v1',
        command_id: `command:${input.key}`,
        organization_id: input.organizationId ?? 1,
        case_id: input.caseId,
        expected_version: input.expectedVersion,
        idempotency_key: input.key,
        correlation_id: `corr:${input.key}`,
        body: { type: input.type, payload: input.payload ?? defaultPayload[input.type] },
        requested_at: '2026-08-02T05:59:00.000Z',
    });
}
