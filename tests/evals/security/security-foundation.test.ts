import { describe, expect, it, vi } from 'vitest';
import { EffectiveScopeSchema, type EffectiveScope } from '../../../packages/contracts/src/index.js';
import {
    approvalRequestHash,
    evaluateApproval,
    evaluateBoundary,
    evaluateCommand,
    evaluateEgress,
    evaluateKillSwitch,
    evaluateScopeAccess,
    type ApprovalRequestLike,
    type BoundaryKind,
    type BoundarySubject,
    type KillSwitchSnapshot,
    type ScopeAccessRequest,
} from '../../../packages/policy/src/index.js';
import {
    AppendOnlySecurityAuditLog,
    InMemorySecurityAuditSink,
    containsSecretValue,
    verifySecurityAuditChain,
} from '../../../packages/observability/src/security/index.js';
import {
    ScopeResolutionError,
    authorizeApiBoundary,
    resolveEffectiveScope,
    type GrantProfileAuthority,
    type MembershipAuthority,
    type ResourceAuthority,
    type ScopeAuthorityRepository,
} from '../../../apps/api/src/modules/authz/index.js';

const NOW = '2026-08-02T05:00:00.000Z';
const LATER = '2026-08-02T06:00:00.000Z';
const HASH = 'a'.repeat(64);

const scope = (patch: Record<string, unknown> = {}): EffectiveScope => EffectiveScopeSchema.parse({
    schema: 'effective-scope/v1', scope_id: 'case:123', scope_kind: 'case',
    organization_id: 7, case_id: 123, property_id: 50, unit_id: 60,
    principal: {
        principal_id: 'member:9', actor_kind: 'member', organization_id: 7,
        membership_id: 9, user_id: 4, role: 'resident', authenticated_at: NOW,
    },
    actions: ['read', 'manage', 'message', 'media'],
    data_classes: ['internal', 'personal', 'sensitive_media'],
    capabilities: ['maintenance.diagnose-and-plan.v1'],
    tool_grants: ['command:diagnostic', 'egress:manuals'],
    purposes: ['maintenance diagnosis'], region: 'cn-south', retention_days: 30,
    policy_version: 'policy-1', resolved_at: NOW, expires_at: LATER, ...patch,
});

const membership = (): MembershipAuthority => ({
    membershipId: 9, organizationId: 7, userId: 4, role: 'resident',
    membershipStatus: 'active', organizationStatus: 'active',
});
const resource = (): ResourceAuthority => ({
    scopeId: 'case:123', scopeKind: 'case', organizationId: 7,
    resourceId: 123, caseId: 123, propertyId: 50, unitId: 60,
});
const profile = (): GrantProfileAuthority => ({
    membershipId: 9, organizationId: 7, scopeId: 'case:123',
    actions: ['read', 'manage', 'message', 'media'],
    dataClasses: ['internal', 'personal', 'sensitive_media'],
    capabilities: ['maintenance.diagnose-and-plan.v1'],
    toolGrants: ['command:diagnostic', 'egress:manuals'],
    purposes: ['maintenance diagnosis'], region: 'cn-south', retentionDays: 30,
    policyVersion: 'policy-1', expiresAt: LATER,
});

const repository = (): ScopeAuthorityRepository => ({
    findActiveMembership: vi.fn(async () => membership()),
    listActiveMemberships: vi.fn(async () => [membership()]),
    resolveResource: vi.fn(async () => resource()),
    resolveGrantProfile: vi.fn(async () => profile()),
});

const switches = (patch: Partial<KillSwitchSnapshot> = {}): KillSwitchSnapshot => ({
    policyVersion: 'policy-1', observedAt: NOW,
    global: { start_run: false, delivery: false, command: false, egress: false },
    organizations: {}, ...patch,
});

describe('server-resolved scope and least-privilege grants', () => {
    it('builds scope only from active server authorities', async () => {
        const repo = repository();
        const resolved = await resolveEffectiveScope({
            identity: { principalId: 'member:9', userId: 4, authenticatedAt: NOW },
            organizationHint: 7, requestedResource: { scopeKind: 'case', resourceId: 123 },
            repository: repo, now: NOW,
        });
        expect(resolved).toMatchObject({
            ...scope(),
            actions: ['manage', 'media', 'message', 'read'],
        });
        expect(repo.resolveResource).toHaveBeenCalledWith({
            organizationId: 7, scopeKind: 'case', resourceId: 123,
        });
    });

    it('rejects caller scopes, ambiguous membership, and cross-org ancestry', async () => {
        const base = {
            identity: { principalId: 'member:9', userId: 4, authenticatedAt: NOW },
            requestedResource: { scopeKind: 'case' as const, resourceId: 123 }, now: NOW,
        };
        await expect(resolveEffectiveScope({ ...base, repository: repository(),
            callerScopeClaim: { organization_id: 8 } }))
            .rejects.toMatchObject({ code: 'caller_scope_forbidden' });
        const ambiguous = repository();
        vi.mocked(ambiguous.listActiveMemberships).mockResolvedValue([
            await ambiguous.findActiveMembership(4, 7) as never,
            { membershipId: 10, organizationId: 8, userId: 4, role: 'resident',
                membershipStatus: 'active', organizationStatus: 'active' },
        ]);
        await expect(resolveEffectiveScope({ ...base, repository: ambiguous }))
            .rejects.toBeInstanceOf(ScopeResolutionError);
        const crossOrg = repository();
        vi.mocked(crossOrg.resolveResource).mockResolvedValue({
            scopeId: 'case:123', scopeKind: 'case', organizationId: 8,
            resourceId: 123, caseId: 123,
        });
        await expect(resolveEffectiveScope({ ...base, organizationHint: 7, repository: crossOrg }))
            .rejects.toMatchObject({ code: 'resource_unavailable', status: 404 });
    });

    it('denies each missing data, tool, purpose, region, retention, and capability grant', () => {
        const base = {
            organizationId: 7, scopeId: 'case:123', caseId: 123, action: 'read' as const,
            capability: 'maintenance.diagnose-and-plan.v1', dataClasses: ['personal' as const],
            toolIds: ['egress:manuals'], purpose: 'maintenance diagnosis', region: 'cn-south',
            retentionDays: 30, policyVersion: 'policy-1', at: NOW,
        };
        expect(evaluateScopeAccess(scope(), base).allowed).toBe(true);
        const cases: Array<[ScopeAccessRequest, string]> = [
            [{ ...base, organizationId: 8 }, 'organization_mismatch'],
            [{ ...base, capability: 'maintenance.ungranted.v1' }, 'capability_not_granted'],
            [{ ...base, dataClasses: ['financial' as const] }, 'data_class_not_granted'],
            [{ ...base, toolIds: ['egress:other'] }, 'tool_not_granted'],
            [{ ...base, purpose: 'marketing' }, 'purpose_not_granted'],
            [{ ...base, region: 'us-east' }, 'region_not_granted'],
            [{ ...base, retentionDays: 31 }, 'retention_exceeded'],
        ];
        for (const [request, code] of cases) {
            expect(evaluateScopeAccess(scope(), request)).toMatchObject({ allowed: false, code });
        }
    });
});

describe('cross-organization boundary isolation', () => {
    const subject = (kind: BoundaryKind): BoundarySubject => ({
        kind, organizationId: 7, scopeId: 'case:123', caseId: 123,
        caseVersion: 4, authoritativeCaseVersion: 4, policyVersion: 'policy-1',
        action: kind === 'media' ? 'media' : kind === 'socket' || kind === 'delivery' ? 'message' : 'read',
        capability: kind === 'task' ? 'maintenance.diagnose-and-plan.v1' : undefined,
        dataClass: kind === 'artifact' ? 'personal' : kind === 'media' ? 'sensitive_media' : undefined,
        purpose: 'maintenance diagnosis', region: 'cn-south', retentionDays: 30,
        principalId: kind === 'socket' ? 'member:9' : undefined,
        destinationOrganizationId: kind === 'delivery' ? 7 : undefined,
        mediaReference: kind === 'media' ? 'media:opaque-1' : undefined,
        consent: kind === 'media'
            ? { granted: true, purpose: 'maintenance diagnosis', capturedAt: NOW } : undefined,
        expiresAt: LATER, at: NOW,
    });

    it.each<BoundaryKind>(['api', 'task', 'artifact', 'media', 'socket', 'delivery'])(
        'denies a forged organization at the %s boundary', (kind) => {
        expect(evaluateBoundary(scope(), { ...subject(kind), organizationId: 8 }))
            .toMatchObject({ allowed: false, code: 'organization_mismatch' });
        expect(evaluateBoundary(scope(), subject(kind)).allowed).toBe(true);
        },
    );

    it('maps API resource mismatches to a non-enumerating 404', () => {
        expect(authorizeApiBoundary(scope(), { ...subject('api'), caseId: 999 }))
            .toMatchObject({ allowed: false, status: 404 });
    });

    it('rejects private media URLs, revoked consent, stale cases, socket principals, and destinations', () => {
        expect(evaluateBoundary(scope(), { ...subject('media'), mediaReference: 'https://private/x' }).allowed)
            .toBe(false);
        expect(evaluateBoundary(scope(), { ...subject('media'), consent: {
            granted: true, purpose: 'maintenance diagnosis', capturedAt: NOW, revokedAt: NOW,
        } }).allowed).toBe(false);
        expect(evaluateBoundary(scope(), { ...subject('task'), authoritativeCaseVersion: 5 }).allowed)
            .toBe(false);
        expect(evaluateBoundary(scope(), { ...subject('socket'), principalId: 'member:other' }).allowed)
            .toBe(false);
        expect(evaluateBoundary(scope(), { ...subject('delivery'), destinationOrganizationId: 8 }).allowed)
            .toBe(false);
    });
});

describe('approval, command, egress, and kill-switch gates', () => {
    const approvalRequest: ApprovalRequestLike = {
        schema: 'approval-request/v1', approval_id: 'approval:1', organization_id: 7,
        case_id: 123, case_version: 4, action: 'external_message',
        proposal_artifact_id: 'artifact:proposal', proposal_hash: HASH,
        requested_by_run_id: 'run:1', expires_at: LATER,
    };
    const approval = (at = NOW) => evaluateApproval({
        request: approvalRequest,
        receipt: {
            schema: 'approval-receipt/v1', approval_id: 'approval:1',
            request_hash: approvalRequestHash(approvalRequest), decision: 'approved',
            decided_by_principal_id: 'member:admin', reason_code: 'reviewed', decided_at: at,
        },
        organizationId: 7, caseId: 123, caseVersion: 4,
        action: 'external_message', proposalHash: HASH, at: NOW, maxDecisionAgeMs: 60_000,
    });

    it('accepts only fresh, current, unrevoked approvals', () => {
        expect(approval().allowed).toBe(true);
        expect(evaluateApproval({
            request: approvalRequest,
            receipt: { schema: 'approval-receipt/v1', approval_id: 'approval:1',
                request_hash: approvalRequestHash(approvalRequest), decision: 'approved',
                decided_by_principal_id: 'member:admin', reason_code: 'reviewed', decided_at: NOW },
            organizationId: 7, caseId: 123, caseVersion: 5, action: 'external_message',
            proposalHash: HASH, at: NOW, maxDecisionAgeMs: 60_000,
        }).code).toBe('approval_invalid');
        expect(evaluateApproval({
            request: approvalRequest,
            receipt: { schema: 'approval-receipt/v1', approval_id: 'approval:1',
                request_hash: approvalRequestHash(approvalRequest), decision: 'approved',
                decided_by_principal_id: 'member:admin', reason_code: 'reviewed', decided_at: NOW },
            organizationId: 7, caseId: 123, caseVersion: 4, action: 'external_message',
            proposalHash: HASH, at: NOW, maxDecisionAgeMs: 60_000,
            revocations: [{ approvalId: 'approval:1',
                requestHash: approvalRequestHash(approvalRequest), revokedAt: NOW }],
        }).code).toBe('approval_revoked');
        expect(approval('2026-08-02T04:58:00.000Z').code).toBe('approval_expired');
    });

    it('enforces organization and global kill switches with fresh snapshots', () => {
        expect(evaluateKillSwitch({ snapshot: switches(), organizationId: 7,
            operation: 'start_run', policyVersion: 'policy-1', at: NOW }).allowed).toBe(true);
        expect(evaluateKillSwitch({ snapshot: switches({ organizations: { '7': { delivery: true } } }),
            organizationId: 7, operation: 'delivery', policyVersion: 'policy-1', at: NOW }).code)
            .toBe('kill_switch_active');
        expect(evaluateKillSwitch({ snapshot: switches({ global: {
            start_run: true, delivery: false, command: false, egress: false,
        } }), organizationId: 8, operation: 'start_run', policyVersion: 'policy-1', at: NOW }).code)
            .toBe('kill_switch_active');
        expect(evaluateKillSwitch({ organizationId: 7, operation: 'delivery',
            policyVersion: 'policy-1', at: NOW }).code).toBe('kill_switch_state_stale');
    });

    it('allows only explicit restricted commands and exact HTTPS egress hosts', () => {
        const command = {
            scope: scope(), organizationId: 7, mode: 'restricted_sandbox' as const,
            executable: 'inspect-artifact', args: ['--id=artifact:1'],
            purpose: 'maintenance diagnosis', region: 'cn-south', policyVersion: 'policy-1',
            caseVersion: 4, at: NOW, switches: switches(), rules: [{ executable: 'inspect-artifact',
                toolId: 'command:diagnostic', purposes: ['maintenance diagnosis'],
                maxArgs: 2, requiresApproval: false }],
        };
        expect(evaluateCommand(command).allowed).toBe(true);
        expect(evaluateCommand({ ...command, mode: 'customer' }).code).toBe('command_denied');
        expect(evaluateCommand({ ...command, args: ['x;whoami'] }).code).toBe('command_denied');
        expect(evaluateCommand({ ...command, rules: [{ ...command.rules[0],
            requiresApproval: true }] }).code).toBe('approval_invalid');

        const egress = {
            scope: scope(), organizationId: 7, url: 'https://manuals.example.test/v1/doc',
            method: 'GET', redirectCount: 0, purpose: 'maintenance diagnosis',
            region: 'cn-south', dataClasses: ['internal' as const], policyVersion: 'policy-1',
            caseVersion: 4, at: NOW, switches: switches(), rules: [{ hostname: 'manuals.example.test',
                methods: ['GET'], toolId: 'egress:manuals', purposes: ['maintenance diagnosis'],
                regions: ['cn-south'], dataClasses: ['internal' as const], requiresApproval: false }],
        };
        expect(evaluateEgress(egress).allowed).toBe(true);
        expect(evaluateEgress({ ...egress, url: 'https://manuals.example.test.attacker.invalid' }).code)
            .toBe('egress_denied');
        expect(evaluateEgress({ ...egress, url: 'http://manuals.example.test' }).code)
            .toBe('egress_denied');
        expect(evaluateEgress({ ...egress, redirectCount: 1 }).code).toBe('egress_denied');
        expect(evaluateEgress({ ...egress, rules: [{ ...egress.rules[0],
            requiresApproval: true }] }).code).toBe('approval_invalid');
    });
});

describe('redacted append-only audit and secret exclusion', () => {
    it('redacts synthetic secrets/private values and maintains an immutable hash chain', () => {
        const syntheticSecret = 'synthetic-secret-value-123';
        const sink = new InMemorySecurityAuditSink();
        const log = new AppendOnlySecurityAuditLog(sink, [syntheticSecret]);
        const first = log.append({
            occurredAt: NOW, organizationId: 7, principalId: 'member:9', scopeId: 'case:123',
            correlationId: 'corr:1', category: 'scope_resolution', outcome: 'allowed',
            reasonCode: 'resolved', details: {
                password: syntheticSecret, note: `prefix ${syntheticSecret} suffix`,
                email: 'resident@example.test', url: 'https://private.test/media?token=value',
            },
        });
        log.append({
            occurredAt: NOW, organizationId: 7, principalId: 'member:9', scopeId: 'case:123',
            correlationId: 'corr:2', category: 'policy_decision', outcome: 'denied',
            reasonCode: 'cross_org', details: { authorization: 'Bearer test-token-value' },
        });
        const records = sink.snapshot();
        expect(containsSecretValue(records, [syntheticSecret])).toBe(false);
        expect(JSON.stringify(records)).not.toContain('resident@example.test');
        expect(JSON.stringify(records)).not.toContain('test-token-value');
        expect(Object.isFrozen(first)).toBe(true);
        expect(verifySecurityAuditChain(records)).toBe(true);
        expect(verifySecurityAuditChain([{ ...records[0], reasonCode: 'tampered' }, records[1]]))
            .toBe(false);
    });
});
