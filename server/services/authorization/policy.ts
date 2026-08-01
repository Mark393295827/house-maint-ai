import {
    isAction,
    isPositiveId,
    isValidPrincipal,
    normalizeCorrelationId,
    type Action,
    type AuditEnvelope,
    type AuthorizationContext,
    type DecisionReason,
    type PolicyDecision,
    type Principal,
    type ResolvedResource,
} from './contracts.js';
import {
    buildQueryScope,
    grantApplies,
    isGrantLive,
    isResolvedResource,
    parseInstant,
    type DirectRelation,
} from './scopes.js';
export type {
    Action, AuthorizationContext, PolicyDecision, Principal, ResolvedGrant, ResolvedResource,
} from './contracts.js';
export interface AuthorizationEvaluation {
    principal?: Principal;
    context?: AuthorizationContext;
    resource?: ResolvedResource;
    action: string;
    evaluatedAt: string;
    correlationId: string;
}
const ownerActions = new Set<Action>(['read', 'contribute', 'message', 'media']);
const workerActions = new Set<Action>([...ownerActions, 'verify']);
const samePrincipal = (left: Principal, right: Principal): boolean =>
    left.actorKind === right.actorKind && left.userId === right.userId
    && left.organizationId === right.organizationId
    && left.membershipId === right.membershipId && left.role === right.role
    && left.workerId === right.workerId && left.policyVersion === right.policyVersion
    && left.compatibilityMode === right.compatibilityMode;
const sameResource = (left: ResolvedResource, right: ResolvedResource): boolean =>
    left.type === right.type && left.id === right.id
    && left.organizationId === right.organizationId && left.propertyId === right.propertyId
    && left.unitId === right.unitId && left.caseId === right.caseId
    && left.ownerUserId === right.ownerUserId
    && left.assignedWorkerUserId === right.assignedWorkerUserId
    && JSON.stringify(left.participantUserIds ?? []) === JSON.stringify(right.participantUserIds ?? []);
function directRelation(
    principal: Principal,
    resource: ResolvedResource,
    action: Action,
): DirectRelation {
    if (principal.actorKind !== 'user' || !isPositiveId(principal.userId)) return null;
    if (resource.ownerUserId === principal.userId && ownerActions.has(action)) return 'owner';
    if (resource.participantUserIds?.includes(principal.userId) && ownerActions.has(action)) {
        return 'participant';
    }
    return resource.assignedWorkerUserId === principal.userId && principal.role === 'worker'
        && workerActions.has(action) ? 'assigned-worker' : null;
}
function auditFor(
    input: AuthorizationEvaluation,
    allowed: boolean,
    reason: DecisionReason,
): AuditEnvelope {
    return {
        policyVersion: 'foundation-v1',
        evaluatedAt: parseInstant(input.evaluatedAt) === null ? 'invalid-instant' : input.evaluatedAt,
        correlationId: normalizeCorrelationId(input.correlationId),
        actorKind: input.principal?.actorKind ?? 'user',
        userId: input.principal?.userId,
        organizationId: input.principal?.organizationId ?? 0,
        membershipId: input.principal?.membershipId,
        action: isAction(input.action) ? input.action : 'unknown',
        resourceType: input.resource?.type ?? 'case',
        resourceId: input.resource?.id ?? 0,
        allowed,
        reason,
    };
}
const deny = (
    input: AuthorizationEvaluation,
    reason: DecisionReason,
    status: 401 | 403 | 404,
): PolicyDecision => ({
    allowed: false, reason, status, obligations: ['audit'],
    audit: auditFor(input, false, reason),
});
export function authorize(input: AuthorizationEvaluation): PolicyDecision {
    if (!input.principal || !isValidPrincipal(input.principal)) {
        return deny(input, 'unauthenticated', 401);
    }
    if (!isAction(input.action)) return deny(input, 'action_unrecognized', 403);
    if (parseInstant(input.evaluatedAt) === null) return deny(input, 'role_forbidden', 403);
    if (!input.context || !input.resource || !isResolvedResource(input.resource)) {
        return deny(input, 'resource_unresolved', 404);
    }
    const { context, principal, resource } = input;
    if (!samePrincipal(principal, context.principal)
        || !sameResource(resource, context.resource)
        || context.evaluatedAt !== input.evaluatedAt
        || principal.organizationId !== resource.organizationId) {
        return deny(input, 'organization_mismatch', 404);
    }
    if (context.organizationStatus !== 'active' || context.membershipStatus !== 'active'
        || context.membershipRevokedAt !== undefined) {
        return deny(input, 'role_forbidden', 403);
    }
    const grants = context.validatedGrants.filter((grant) =>
        grant.membershipId === principal.membershipId && grant.capability === input.action
        && isGrantLive(grant, input.evaluatedAt) && grantApplies(grant, resource));
    const relation = directRelation(principal, resource, input.action);
    if (grants.length === 0 && !relation) {
        return deny(input, 'not_a_participant',
            input.action === 'read' || input.action === 'media' ? 404 : 403);
    }
    const obligations: PolicyDecision['obligations'] = ['audit'];
    if (input.action === 'media') obligations.push('signed_media_url');
    return {
        allowed: true, reason: 'explicit_rule', status: 200,
        queryScope: buildQueryScope(principal, resource, grants, relation),
        obligations, audit: auditFor(input, true, 'explicit_rule'),
    };
}
