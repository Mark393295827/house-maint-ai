import { describe, expect, it, vi } from 'vitest';
import type {
    AuthorizationContext,
    Principal,
    ResolvedGrant,
    ResolvedResource,
} from '../services/authorization/contracts.js';
import { authorize } from '../services/authorization/policy.js';
import {
    loadAuthorizationContext,
    validateGrantTarget,
    type AuthorizationRepository,
    type MembershipRecord,
} from '../services/authorization/repository.js';
import { grantApplies, isGrantLive } from '../services/authorization/scopes.js';
const NOW = '2026-07-30T00:00:00.000Z';
const principal = (patch: Partial<Principal> = {}): Principal => ({
    actorKind: 'user', userId: 10, organizationId: 1, membershipId: 100,
    role: 'resident', policyVersion: 'foundation-v1', compatibilityMode: 'none', ...patch,
});
const resource = (patch: Partial<ResolvedResource> = {}): ResolvedResource => ({
    type: 'case', id: 500, organizationId: 1, propertyId: 20, unitId: 30, caseId: 500,
    participantUserIds: [], ...patch,
});
const grant = (patch: Partial<ResolvedGrant> = {}): ResolvedGrant => ({
    organizationId: 1, membershipId: 100, resourceType: 'case',
    resourceId: 500, capability: 'read', ...patch,
});
const context = (
    grants: ResolvedGrant[] = [],
    patch: Partial<AuthorizationContext> = {},
): AuthorizationContext => ({
    principal: principal(), organizationStatus: 'active', membershipStatus: 'active',
    evaluatedAt: NOW, resource: resource(), validatedGrants: grants, ...patch,
});
const decide = (
    ctx?: AuthorizationContext,
    action = 'read',
    patch: Partial<Parameters<typeof authorize>[0]> = {},
) => authorize({
    principal: ctx?.principal, context: ctx, resource: ctx?.resource, action,
    evaluatedAt: NOW, correlationId: 'corr-1', ...patch,
});
const membership = (patch: Partial<MembershipRecord> = {}): MembershipRecord => ({
    id: 100, organizationId: 1, userId: 10, role: 'resident',
    status: 'active', organizationStatus: 'active', ...patch,
});
const repository = (ctx: AuthorizationContext | null = context()): AuthorizationRepository => ({
    findMembership: vi.fn(async () => membership()),
    listActiveOrganizationIds: vi.fn(async () => [1]),
    listActiveMembershipsForUser: vi.fn(async () => [membership()]),
    resolveAuthorizationContext: vi.fn(async () => ctx),
    resolveGrantTarget: vi.fn(async () => resource({
        type: 'property', id: 20, propertyId: undefined, unitId: undefined, caseId: undefined,
    })),
});
describe('foundation authorization policy', () => {
    it('fails closed with 401/403/non-enumerating 404 and bounded audit fields', () => {
        expect(decide(undefined).status).toBe(401);
        expect(decide(context(), 'not-an-action', { correlationId: 'x'.repeat(500) }))
            .toMatchObject({ allowed: false, status: 403, reason: 'action_unrecognized',
                audit: { action: 'unknown', correlationId: 'invalid-correlation' } });
        expect(decide(context([], { resource: resource({ organizationId: 2 }) })).status).toBe(404);
        expect(decide(context()).status).toBe(404);
        expect(decide(context(), 'dispatch').status).toBe(403);
    });
    it('parses instants and fails closed on malformed, equal, expired, or revoked grants', () => {
        const cases: Array<[Partial<ResolvedGrant>, string, boolean]> = [
            [{ expiresAt: '2026-07-30T01:00:00+02:00' }, NOW, false],
            [{ expiresAt: NOW }, NOW, false],
            [{ expiresAt: 'not-a-date' }, NOW, false],
            [{ expiresAt: '2026-07-30T00:00:01Z' }, NOW, true],
            [{ revokedAt: 'not-a-date' }, NOW, false],
            [{}, 'not-a-date', false],
        ];
        cases.forEach(([patch, at, expected]) =>
            expect(isGrantLive(grant(patch), at)).toBe(expected));
        expect(decide(context([grant()], { evaluatedAt: 'not-a-date' }),
            'read', { evaluatedAt: 'not-a-date' }).allowed).toBe(false);
    });
    it('rejects impossible ancestry and never inherits upward or to siblings', () => {
        const forgedOrg = resource({
            type: 'organization', id: 1, propertyId: 20, unitId: undefined, caseId: undefined,
        });
        expect(grantApplies(grant({ resourceType: 'property', resourceId: 20 }), forgedOrg))
            .toBe(false);
        const cases: Array<[ResolvedGrant, ResolvedResource, boolean]> = [
            [grant({ resourceType: 'organization', resourceId: 1 }), resource(), true],
            [grant({ resourceType: 'property', resourceId: 20 }), resource(), true],
            [grant({ resourceType: 'unit', resourceId: 30 }), resource(), true],
            [grant({ resourceType: 'property', resourceId: 21 }), resource(), false],
            [grant(), resource({ type: 'property', id: 20, propertyId: undefined,
                unitId: undefined, caseId: undefined }), false],
        ];
        cases.forEach(([candidate, target, expected]) =>
            expect(grantApplies(candidate, target)).toBe(expected));
    });
    it('binds principals and allows only bounded current user relations', () => {
        expect(decide(context([], { resource: resource({ ownerUserId: 10 }) })).allowed).toBe(true);
        expect(decide(context([], { resource: resource({ participantUserIds: [10] }) }),
            'message').allowed).toBe(true);
        const worker = principal({ role: 'worker', userId: 11, workerId: 70 });
        expect(decide(context([grant({ capability: 'verify' })], { principal: worker,
            resource: resource({ assignedWorkerUserId: 11 }) }), 'verify').allowed).toBe(true);
        expect(decide(context([], { principal: worker,
            resource: resource({ assignedWorkerUserId: 11 }) }), 'verify').allowed).toBe(false);
        expect(decide(context([], { principal: worker }), 'verify').allowed).toBe(false);
        expect(decide(context([], { principal: principal({ role: 'admin' }) })).allowed).toBe(false);
        const system = principal({ actorKind: 'system', role: 'system', userId: 10, membershipId: 100 });
        expect(decide(context([], { principal: system,
            resource: resource({ ownerUserId: 10 }) })).allowed).toBe(false);
        const ctx = context([], { resource: resource({ ownerUserId: 12 }) });
        expect(decide(ctx, 'read', { principal: principal({ userId: 12 }) }).allowed).toBe(false);
        expect(decide(context([], { resource: resource({ ownerUserId: 10 }) }), 'manage').allowed)
            .toBe(false);
    });
    it('binds direct query scopes only to the principal and current case', () => {
        const owner = decide(context([], {
            resource: resource({ ownerUserId: 10, assignedWorkerUserId: 11 }),
        }));
        expect(owner.queryScope).toMatchObject({
            access: 'owner-or-assigned', caseIds: [500], ownerUserId: 10,
        });
        expect(owner.queryScope?.assignedWorkerUserId).toBeUndefined();
        const participant = decide(context([], {
            resource: resource({ ownerUserId: 11, assignedWorkerUserId: 12,
                participantUserIds: [10] }),
        }));
        expect(participant.queryScope).toMatchObject({ caseIds: [500] });
        expect(participant.queryScope?.ownerUserId).toBeUndefined();
        expect(participant.queryScope?.assignedWorkerUserId).toBeUndefined();
        const worker = principal({ role: 'worker', userId: 12, workerId: 70 });
        const assigned = decide(context([grant({ capability: 'read' })], { principal: worker,
            resource: resource({ ownerUserId: 11, assignedWorkerUserId: 12 }) }));
        expect(assigned.queryScope).toMatchObject({
            access: 'resource-set', caseIds: [500],
        });
        expect(assigned.queryScope?.ownerUserId).toBeUndefined();
    });
    it('accepts only a fully resolved, positive-ID, organization-scoped context operation', async () => {
        const repo = repository();
        expect(await loadAuthorizationContext(repo, principal(), { type: 'case', id: 0 }, NOW))
            .toBeNull();
        expect(repo.resolveAuthorizationContext).not.toHaveBeenCalled();
        expect(await loadAuthorizationContext(repo, principal(), { type: 'case', id: 500 }, NOW))
            .not.toBeNull();
        expect(repo.resolveAuthorizationContext).toHaveBeenCalledWith(expect.objectContaining({
            organizationId: 1, resourceType: 'case', resourceId: 500,
        }));
        const forged = repository(context([], { resource: resource({
            type: 'organization', id: 1, propertyId: 20, unitId: undefined, caseId: undefined,
        }) }));
        expect(await loadAuthorizationContext(forged, principal(),
            { type: 'organization', id: 1 }, NOW)).toBeNull();
    });
    it('narrowly validates positive-ID grant targets without implying grantor authority', async () => {
        const repo = repository();
        expect(await validateGrantTarget(repo, {
            organizationId: 0, resourceType: 'property', resourceId: 20,
        })).toBe(false);
        expect(repo.resolveGrantTarget).not.toHaveBeenCalled();
        expect(await validateGrantTarget(repo, {
            organizationId: 1, resourceType: 'property', resourceId: 20,
        })).toBe(true);
        expect(await validateGrantTarget(repo, {
            organizationId: 1, resourceType: 'report' as never, resourceId: 20,
        })).toBe(false);
        const crossOrg = repository();
        vi.mocked(crossOrg.resolveGrantTarget).mockResolvedValue(resource({
            type: 'property', id: 20, organizationId: 2, propertyId: undefined,
            unitId: undefined, caseId: undefined,
        }));
        expect(await validateGrantTarget(crossOrg, {
            organizationId: 1, resourceType: 'property', resourceId: 20,
        })).toBe(false);
    });
});
