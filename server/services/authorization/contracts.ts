export const ACTIONS = [
    'read', 'contribute', 'manage', 'message', 'media', 'dispatch', 'verify', 'report',
] as const;
export const RESOURCE_TYPES = ['organization', 'property', 'unit', 'case', 'report'] as const;
export type Action = typeof ACTIONS[number];
export type ActorKind = 'user' | 'provider' | 'system';
export type OrgRole = 'owner' | 'admin' | 'manager' | 'resident' | 'worker' | 'auditor';
export type ResourceType = typeof RESOURCE_TYPES[number];
export type GrantResourceType = Exclude<ResourceType, 'report'>;
export type OrganizationStatus = 'active' | 'suspended' | 'closed';
export type MembershipStatus = 'active' | 'invited' | 'suspended' | 'revoked';
export interface Principal {
    actorKind: ActorKind;
    userId?: number;
    organizationId: number;
    membershipId?: number;
    role: OrgRole | 'provider' | 'system';
    workerId?: number;
    policyVersion: 'foundation-v1';
    compatibilityMode: 'none' | 'legacy-single-org';
}
export interface ResolvedResource {
    type: ResourceType;
    id: number;
    organizationId: number;
    propertyId?: number;
    unitId?: number;
    caseId?: number;
    ownerUserId?: number;
    assignedWorkerUserId?: number;
    participantUserIds?: number[];
}
export interface ResolvedGrant {
    organizationId: number;
    membershipId: number;
    resourceType: GrantResourceType;
    resourceId: number;
    capability: Action;
    expiresAt?: string;
    revokedAt?: string;
}
export interface AuthorizationContext {
    principal: Principal;
    organizationStatus: OrganizationStatus;
    membershipStatus: MembershipStatus;
    membershipRevokedAt?: string;
    evaluatedAt: string;
    resource: ResolvedResource;
    validatedGrants: ResolvedGrant[];
}
export interface QueryScope {
    organizationId: number;
    access: 'none' | 'organization' | 'resource-set' | 'owner-or-assigned';
    propertyIds: number[];
    unitIds: number[];
    caseIds: number[];
    ownerUserId?: number;
    assignedWorkerUserId?: number;
}
export type DecisionReason =
    | 'explicit_rule'
    | 'unauthenticated'
    | 'organization_mismatch'
    | 'not_a_participant'
    | 'role_forbidden'
    | 'resource_unresolved'
    | 'action_unrecognized';
export interface AuditEnvelope {
    policyVersion: 'foundation-v1';
    evaluatedAt: string;
    correlationId: string;
    actorKind: ActorKind;
    userId?: number;
    organizationId: number;
    membershipId?: number;
    action: Action | 'unknown';
    resourceType: ResourceType;
    resourceId: number;
    allowed: boolean;
    reason: DecisionReason;
}
export interface PolicyDecision {
    allowed: boolean;
    reason: DecisionReason;
    status: 200 | 401 | 403 | 404;
    queryScope?: QueryScope;
    obligations: Array<
        'audit' | 'redact_contact' | 'redact_location' | 'signed_media_url'
        | 'approval_required' | 'minimize_event_payload'
    >;
    audit: AuditEnvelope;
}
export const isAction = (value: string): value is Action =>
    (ACTIONS as readonly string[]).includes(value);
export const isResourceType = (value: unknown): value is ResourceType =>
    typeof value === 'string' && (RESOURCE_TYPES as readonly string[]).includes(value);
export const isPositiveId = (value: unknown): value is number =>
    Number.isInteger(value) && Number(value) > 0;
export const isValidPrincipal = (value: Principal): boolean =>
    isPositiveId(value.organizationId)
    && (value.userId === undefined || isPositiveId(value.userId))
    && (value.membershipId === undefined || isPositiveId(value.membershipId))
    && (value.workerId === undefined || isPositiveId(value.workerId))
    && (value.actorKind !== 'user'
        || (isPositiveId(value.userId) && isPositiveId(value.membershipId)));
const CORRELATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
export const normalizeCorrelationId = (
    value: unknown,
    fallback = 'invalid-correlation',
): string => typeof value === 'string' && CORRELATION.test(value) ? value : fallback;
