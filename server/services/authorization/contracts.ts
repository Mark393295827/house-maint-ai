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
export const isGrantResourceType = (value: unknown): value is GrantResourceType =>
    value === 'organization' || value === 'property' || value === 'unit' || value === 'case';
export const isActorKind = (value: unknown): value is ActorKind =>
    value === 'user' || value === 'provider' || value === 'system';
const isOrgRole = (value: unknown): value is OrgRole =>
    value === 'owner' || value === 'admin' || value === 'manager'
    || value === 'resident' || value === 'worker' || value === 'auditor';
export const isPositiveId = (value: unknown): value is number =>
    Number.isInteger(value) && Number(value) > 0;
export const isValidPrincipal = (value: Principal): boolean => {
    if (!value || typeof value !== 'object' || !isActorKind(value.actorKind)
        || !isPositiveId(value.organizationId)
        || value.policyVersion !== 'foundation-v1'
        || (value.compatibilityMode !== 'none' && value.compatibilityMode !== 'legacy-single-org')) {
        return false;
    }
    if (value.actorKind === 'user') {
        return isOrgRole(value.role) && isPositiveId(value.userId)
            && isPositiveId(value.membershipId)
            && (value.role === 'worker' ? isPositiveId(value.workerId) : value.workerId === undefined);
    }
    return value.compatibilityMode === 'none' && value.role === value.actorKind && value.userId === undefined
        && value.membershipId === undefined && value.workerId === undefined;
};
const CORRELATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
export const normalizeCorrelationId = (
    value: unknown,
    fallback = 'invalid-correlation',
): string => typeof value === 'string' && CORRELATION.test(value) ? value : fallback;
