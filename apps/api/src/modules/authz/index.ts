import {
    EffectiveScopeSchema,
    type DataClass,
    type EffectiveScope,
} from '../../../../../packages/contracts/src/index.js';
import {
    evaluateBoundary,
    type BoundarySubject,
    type PolicyDecision,
} from '../../../../../packages/policy/src/index.js';

export interface AuthenticatedIdentity {
    principalId: string;
    userId: number;
    authenticatedAt: string;
}

export interface MembershipAuthority {
    membershipId: number;
    organizationId: number;
    userId: number;
    role: Exclude<EffectiveScope['principal']['role'], 'system' | 'integration'>;
    membershipStatus: 'active' | 'invited' | 'suspended' | 'revoked';
    organizationStatus: 'active' | 'suspended' | 'closed';
    revokedAt?: string;
}

export interface ResourceAuthority {
    scopeId: string;
    scopeKind: EffectiveScope['scope_kind'];
    organizationId: number;
    resourceId: number;
    caseId?: number;
    propertyId?: number;
    unitId?: number;
    channelId?: string;
}

export interface GrantProfileAuthority {
    membershipId: number;
    organizationId: number;
    scopeId: string;
    actions: EffectiveScope['actions'];
    dataClasses: DataClass[];
    capabilities: string[];
    toolGrants: string[];
    purposes: string[];
    region: string;
    retentionDays: number;
    policyVersion: string;
    expiresAt: string;
}

export interface ScopeAuthorityRepository {
    findActiveMembership(userId: number, organizationId: number): Promise<MembershipAuthority | null>;
    listActiveMemberships(userId: number): Promise<MembershipAuthority[]>;
    resolveResource(input: {
        organizationId: number;
        scopeKind: ResourceAuthority['scopeKind'];
        resourceId: number;
    }): Promise<ResourceAuthority | null>;
    resolveGrantProfile(input: {
        membershipId: number;
        organizationId: number;
        scopeId: string;
    }): Promise<GrantProfileAuthority | null>;
}

export class ScopeResolutionError extends Error {
    constructor(
        readonly code:
            | 'authentication_invalid'
            | 'caller_scope_forbidden'
            | 'membership_ambiguous'
            | 'membership_unavailable'
            | 'resource_unavailable'
            | 'scope_authority_invalid',
        readonly status: 401 | 403 | 404 | 503,
    ) {
        super(code);
    }
}

const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const validInstant = (value: unknown): value is string =>
    typeof value === 'string' && Number.isFinite(Date.parse(value));
const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)].sort();
const MEMBER_ROLES = new Set(['owner', 'admin', 'manager', 'resident', 'worker', 'auditor']);

function validMembership(
    membership: MembershipAuthority | null | undefined,
    identity: AuthenticatedIdentity,
): membership is MembershipAuthority {
    return Boolean(membership) && positiveId(membership?.membershipId)
        && positiveId(membership?.organizationId) && membership?.userId === identity.userId
        && MEMBER_ROLES.has(String(membership?.role))
        && membership?.membershipStatus === 'active' && membership.organizationStatus === 'active'
        && membership.revokedAt === undefined;
}

function validResource(
    resource: ResourceAuthority | null,
    requestedKind: ResourceAuthority['scopeKind'],
    requestedId: number,
    organizationId: number,
): resource is ResourceAuthority {
    if (!resource || resource.organizationId !== organizationId
        || resource.scopeKind !== requestedKind || resource.resourceId !== requestedId) return false;
    if (resource.scopeKind === 'case') return resource.caseId === requestedId;
    if (resource.scopeKind === 'property') return resource.propertyId === requestedId;
    if (resource.scopeKind === 'personal') return resource.resourceId === requestedId;
    if (resource.scopeKind === 'organization') return resource.resourceId === organizationId;
    if (resource.unitId !== undefined && resource.propertyId === undefined) return false;
    return true;
}

/**
 * The only inputs taken from the request are a resource locator and an organization hint.
 * Membership, ancestry, grants, purpose, residency, retention, and expiry all come from
 * server repositories; a body-provided scope is rejected instead of merged.
 */
export async function resolveEffectiveScope(input: {
    identity: AuthenticatedIdentity;
    organizationHint?: number;
    requestedResource: { scopeKind: ResourceAuthority['scopeKind']; resourceId: number };
    callerScopeClaim?: unknown;
    repository: ScopeAuthorityRepository;
    now: string;
}): Promise<EffectiveScope> {
    const now = Date.parse(input.now);
    const authenticatedAt = Date.parse(input.identity?.authenticatedAt);
    if (!positiveId(input.identity?.userId) || !input.identity?.principalId
        || !Number.isFinite(now) || !Number.isFinite(authenticatedAt) || authenticatedAt > now) {
        throw new ScopeResolutionError('authentication_invalid', 401);
    }
    if (input.callerScopeClaim !== undefined) {
        throw new ScopeResolutionError('caller_scope_forbidden', 403);
    }
    if (!positiveId(input.requestedResource?.resourceId)) {
        throw new ScopeResolutionError('resource_unavailable', 404);
    }

    let membership: MembershipAuthority | null;
    if (input.organizationHint !== undefined) {
        if (!positiveId(input.organizationHint)) {
            throw new ScopeResolutionError('membership_unavailable', 404);
        }
        membership = await input.repository.findActiveMembership(
            input.identity.userId,
            input.organizationHint,
        );
        if (!validMembership(membership, input.identity)
            || membership.organizationId !== input.organizationHint) {
            throw new ScopeResolutionError('membership_unavailable', 404);
        }
    } else {
        const memberships = await input.repository.listActiveMemberships(input.identity.userId);
        if (!Array.isArray(memberships) || memberships.length !== 1
            || !validMembership(memberships[0], input.identity)) {
            throw new ScopeResolutionError('membership_ambiguous', 403);
        }
        membership = memberships[0];
    }

    const resource = await input.repository.resolveResource({
        organizationId: membership.organizationId,
        scopeKind: input.requestedResource.scopeKind,
        resourceId: input.requestedResource.resourceId,
    });
    if (!validResource(resource, input.requestedResource.scopeKind,
        input.requestedResource.resourceId, membership.organizationId)) {
        throw new ScopeResolutionError('resource_unavailable', 404);
    }
    const profile = await input.repository.resolveGrantProfile({
        membershipId: membership.membershipId,
        organizationId: membership.organizationId,
        scopeId: resource.scopeId,
    });
    if (!profile || profile.membershipId !== membership.membershipId
        || profile.organizationId !== membership.organizationId || profile.scopeId !== resource.scopeId
        || !validInstant(profile.expiresAt) || Date.parse(profile.expiresAt) <= now) {
        throw new ScopeResolutionError('scope_authority_invalid', 503);
    }

    const candidate = {
        schema: 'effective-scope/v1' as const,
        scope_id: resource.scopeId,
        scope_kind: resource.scopeKind,
        organization_id: membership.organizationId,
        case_id: resource.caseId,
        property_id: resource.propertyId,
        unit_id: resource.unitId,
        channel_id: resource.channelId,
        principal: {
            principal_id: input.identity.principalId,
            actor_kind: 'member' as const,
            organization_id: membership.organizationId,
            membership_id: membership.membershipId,
            user_id: membership.userId,
            role: membership.role,
            authenticated_at: new Date(authenticatedAt).toISOString(),
        },
        actions: unique(profile.actions),
        data_classes: unique(profile.dataClasses),
        capabilities: unique(profile.capabilities),
        tool_grants: unique(profile.toolGrants),
        purposes: unique(profile.purposes),
        region: profile.region,
        retention_days: profile.retentionDays,
        policy_version: profile.policyVersion,
        resolved_at: new Date(now).toISOString(),
        expires_at: new Date(Date.parse(profile.expiresAt)).toISOString(),
    };
    const parsed = EffectiveScopeSchema.safeParse(candidate);
    if (!parsed.success) throw new ScopeResolutionError('scope_authority_invalid', 503);
    return parsed.data;
}

export interface ApiBoundaryResult {
    allowed: boolean;
    status: 200 | 403 | 404;
    decision: PolicyDecision;
}

export function authorizeApiBoundary(scope: EffectiveScope, subject: BoundarySubject): ApiBoundaryResult {
    const decision = evaluateBoundary(scope, { ...subject, kind: 'api' });
    return {
        allowed: decision.allowed,
        status: decision.allowed ? 200
            : decision.code === 'organization_mismatch' || decision.code === 'boundary_mismatch'
                ? 404 : 403,
        decision,
    };
}
