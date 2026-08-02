import { isPositiveId, isValidPrincipal, type Principal } from './contracts.js';
import { parseOrganizationHint, resolveLegacyMembership } from './compatibility.js';
import type { AuthorizationRepository, MembershipRecord } from './repository.js';
export class OrganizationResolutionError extends Error {
    constructor(
        readonly status: 403 | 404,
        readonly code: 'organization_unresolved' | 'organization_ambiguous',
    ) {
        super(code);
    }
}
const toPrincipal = (
    membership: MembershipRecord,
    compatibilityMode: Principal['compatibilityMode'],
): Principal => ({
    actorKind: 'user',
    userId: membership.userId,
    organizationId: membership.organizationId,
    membershipId: membership.id,
    role: membership.role,
    workerId: membership.role === 'worker' && isPositiveId(membership.workerId)
        ? membership.workerId : undefined,
    policyVersion: 'foundation-v1',
    compatibilityMode,
});
const ensurePrincipal = (membership: MembershipRecord,
    compatibilityMode: Principal['compatibilityMode']): Principal => {
    const principal = toPrincipal(membership, compatibilityMode);
    if (!isValidPrincipal(principal)) {
        throw new OrganizationResolutionError(404, 'organization_unresolved');
    }
    return principal;
};
export async function resolvePrincipal(input: {
    userId: number;
    organizationHint?: string | string[] | number;
    legacySingleOrgEnabled: boolean;
    repository: AuthorizationRepository;
}): Promise<Principal> {
    if (!isPositiveId(input.userId)) {
        throw new OrganizationResolutionError(403, 'organization_unresolved');
    }
    if (input.organizationHint !== undefined) {
        const organizationId = parseOrganizationHint(input.organizationHint);
        if (!organizationId) {
            throw new OrganizationResolutionError(404, 'organization_unresolved');
        }
        const membership = await input.repository.findMembership(input.userId, organizationId);
        if (!membership || membership.userId !== input.userId
            || membership.organizationId !== organizationId
            || !isPositiveId(membership.id)
            || membership.status !== 'active'
            || membership.organizationStatus !== 'active'
            || membership.revokedAt !== undefined) {
            throw new OrganizationResolutionError(404, 'organization_unresolved');
        }
        return ensurePrincipal(membership, 'none');
    }
    if (!input.legacySingleOrgEnabled) {
        throw new OrganizationResolutionError(403, 'organization_ambiguous');
    }
    const membership = await resolveLegacyMembership(input.repository, input.userId);
    if (!membership) {
        throw new OrganizationResolutionError(403, 'organization_ambiguous');
    }
    return ensurePrincipal(membership, 'legacy-single-org');
}
