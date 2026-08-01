import {
    isPositiveId,
    isResourceType,
    isValidPrincipal,
    type AuthorizationContext,
    type GrantResourceType,
    type MembershipStatus,
    type OrganizationStatus,
    type OrgRole,
    type Principal,
    type ResolvedResource,
    type ResourceType,
} from './contracts.js';
import {
    isGrantLive,
    isResolvedGrant,
    isResolvedResource,
    parseInstant,
} from './scopes.js';
export interface MembershipRecord {
    id: number;
    organizationId: number;
    userId: number;
    role: OrgRole;
    status: MembershipStatus;
    organizationStatus: OrganizationStatus;
    revokedAt?: string;
    workerId?: number;
}
export interface GrantTargetRequest {
    organizationId: number;
    resourceType: GrantResourceType;
    resourceId: number;
}
export interface AuthorizationRepository {
    findMembership(userId: number, organizationId: number): Promise<MembershipRecord | null>;
    listActiveOrganizationIds(): Promise<number[]>;
    listActiveMembershipsForUser(userId: number): Promise<MembershipRecord[]>;
    resolveAuthorizationContext(input: {
        principal: Principal;
        organizationId: number;
        resourceType: ResourceType;
        resourceId: number;
        evaluatedAt: string;
    }): Promise<AuthorizationContext | null>;
    resolveGrantTarget(input: GrantTargetRequest): Promise<ResolvedResource | null>;
}
const samePrincipal = (left: Principal, right: Principal): boolean =>
    left.actorKind === right.actorKind && left.userId === right.userId
    && left.organizationId === right.organizationId
    && left.membershipId === right.membershipId && left.role === right.role
    && left.workerId === right.workerId && left.policyVersion === right.policyVersion
    && left.compatibilityMode === right.compatibilityMode;
export async function loadAuthorizationContext(
    repository: AuthorizationRepository,
    principal: Principal,
    request: { type: ResourceType; id: number },
    evaluatedAt: string,
): Promise<AuthorizationContext | null> {
    if (!isValidPrincipal(principal) || !isResourceType(request.type)
        || !isPositiveId(request.id) || parseInstant(evaluatedAt) === null) return null;
    const context = await repository.resolveAuthorizationContext({
        principal, organizationId: principal.organizationId,
        resourceType: request.type, resourceId: request.id, evaluatedAt,
    });
    if (!context || !samePrincipal(principal, context.principal)
        || context.evaluatedAt !== evaluatedAt || !isResolvedResource(context.resource)
        || context.resource.type !== request.type || context.resource.id !== request.id
        || context.resource.organizationId !== principal.organizationId
        || context.validatedGrants.some((grant) =>
            !isResolvedGrant(grant) || grant.organizationId !== principal.organizationId
            || grant.membershipId !== principal.membershipId)) return null;
    return {
        ...context,
        validatedGrants: context.validatedGrants.filter((grant) =>
            isGrantLive(grant, evaluatedAt)),
    };
}
export async function validateGrantTarget(
    repository: AuthorizationRepository,
    request: GrantTargetRequest,
): Promise<boolean> {
    if (!isPositiveId(request.organizationId) || !isPositiveId(request.resourceId)
        || request.resourceType === 'organization'
            && request.resourceId !== request.organizationId) return false;
    const target = await repository.resolveGrantTarget(request);
    return Boolean(target && isResolvedResource(target)
        && target.organizationId === request.organizationId
        && target.type === request.resourceType && target.id === request.resourceId);
}
