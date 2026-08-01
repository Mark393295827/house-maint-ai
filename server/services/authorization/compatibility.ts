import { isPositiveId } from './contracts.js';
import type { AuthorizationRepository, MembershipRecord } from './repository.js';
export function parseOrganizationHint(value: string | string[] | number | undefined): number | null {
    if (Array.isArray(value)) return null;
    if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
}
export async function resolveLegacyMembership(
    repository: AuthorizationRepository,
    userId: number,
): Promise<MembershipRecord | null> {
    const [organizationIds, memberships] = await Promise.all([
        repository.listActiveOrganizationIds(),
        repository.listActiveMembershipsForUser(userId),
    ]);
    if (organizationIds.length !== 1 || memberships.length !== 1) return null;
    const membership = memberships[0];
    return isPositiveId(membership.id) && membership.userId === userId
        && isPositiveId(membership.organizationId)
        && membership.organizationId === organizationIds[0] && !membership.revokedAt
        && membership.status === 'active'
        && membership.organizationStatus === 'active'
        ? membership
        : null;
}
