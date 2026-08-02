import { describe, expect, it, vi } from 'vitest';
import { OrganizationResolutionError, resolvePrincipal } from
    '../services/authorization/principal.js';
import type {
    AuthorizationRepository,
    MembershipRecord,
} from '../services/authorization/repository.js';
const member = (patch: Partial<MembershipRecord> = {}): MembershipRecord => ({
    id: 101, organizationId: 7, userId: 9, role: 'resident',
    status: 'active', organizationStatus: 'active', ...patch,
});
const repository = (members: MembershipRecord[], organizationIds = [7]):
AuthorizationRepository => ({
    findMembership: vi.fn(async (userId, orgId) =>
        members.find((item) => item.userId === userId && item.organizationId === orgId) ?? null),
    listActiveOrganizationIds: vi.fn(async () => organizationIds),
    listActiveMembershipsForUser: vi.fn(async (userId) =>
        members.filter((item) => item.userId === userId)),
    resolveAuthorizationContext: vi.fn(async () => null),
    resolveGrantTarget: vi.fn(async () => null),
});
const resolve = (
    repo: AuthorizationRepository,
    hint?: string | string[] | number,
    enabled = true,
) => resolvePrincipal({
    userId: 9, organizationHint: hint, legacySingleOrgEnabled: enabled, repository: repo,
});
const rejects = async (promise: Promise<unknown>, status: number) => {
    await expect(promise).rejects.toBeInstanceOf(OrganizationResolutionError);
    await expect(promise).rejects.toMatchObject({ status });
};
describe('active organization resolution', () => {
    it('treats a valid numeric organization header only as a verified hint', async () => {
        const repo = repository([member()]);
        await expect(resolve(repo, '7')).resolves.toMatchObject({
            organizationId: 7, membershipId: 101, compatibilityMode: 'none',
        });
        expect(repo.findMembership).toHaveBeenCalledWith(9, 7);
    });
    it('rejects malformed, missing, inactive, and revoked hinted memberships', async () => {
        await rejects(resolve(repository([member()]), '7 OR 1=1'), 404);
        await rejects(resolve(repository([]), 7), 404);
        await rejects(resolve(repository([member({ organizationStatus: 'suspended' })]), 7), 404);
        await rejects(resolve(repository([member({ revokedAt: '2026-07-30T00:00:00Z' })]), 7), 404);
    });
    it('allows fallback only for exactly one active, unrevoked organization membership', async () => {
        await expect(resolve(repository([member()]))).resolves.toMatchObject({
            organizationId: 7, compatibilityMode: 'legacy-single-org',
        });
        await rejects(resolve(repository([member({ revokedAt: '2026-07-30T00:00:00Z' })])), 403);
        await rejects(resolve(repository([member({ revokedAt: '' })])), 403);
        await rejects(resolve(repository([member()]), undefined, false), 403);
        await rejects(resolve(repository([member(), member({ id: 102, organizationId: 8 })]),
            undefined), 403);
        await rejects(resolve(repository([member()], [7, 8])), 403);
    });
    it('maps worker identity only from an approved active worker membership', async () => {
        await expect(resolve(repository([member({ role: 'worker', workerId: 55 })]), 7))
            .resolves.toMatchObject({ role: 'worker', workerId: 55 });
        await expect(resolve(repository([member({ role: 'resident', workerId: 55 })]), 7))
            .resolves.toMatchObject({ role: 'resident', workerId: undefined });
    });
});
