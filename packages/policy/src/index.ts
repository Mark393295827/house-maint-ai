import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import {
    ApprovalReceiptSchema,
    ApprovalRequestSchema,
    EffectiveScopeSchema,
    type DataClass,
    type EffectiveScope,
} from '../../contracts/src/index.js';

export type PolicyDenialCode =
    | 'approval_expired'
    | 'approval_invalid'
    | 'approval_revoked'
    | 'boundary_mismatch'
    | 'capability_not_granted'
    | 'command_denied'
    | 'data_class_not_granted'
    | 'egress_denied'
    | 'invalid_request'
    | 'kill_switch_active'
    | 'kill_switch_state_stale'
    | 'organization_mismatch'
    | 'policy_version_mismatch'
    | 'purpose_not_granted'
    | 'region_not_granted'
    | 'retention_exceeded'
    | 'scope_expired'
    | 'scope_invalid'
    | 'tool_not_granted';

export interface PolicyDecision {
    allowed: boolean;
    code: 'allowed' | PolicyDenialCode;
    obligations: string[];
}

const allow = (...obligations: string[]): PolicyDecision => ({
    allowed: true,
    code: 'allowed',
    obligations: ['audit', ...obligations],
});

const deny = (code: PolicyDenialCode): PolicyDecision => ({
    allowed: false,
    code,
    obligations: ['audit'],
});

const instant = (value: unknown): number | null => {
    if (typeof value !== 'string') return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export interface ScopeAccessRequest {
    organizationId: number;
    scopeId: string;
    caseId?: number;
    action: EffectiveScope['actions'][number];
    capability?: string;
    dataClasses?: DataClass[];
    toolIds?: string[];
    purpose: string;
    region: string;
    retentionDays: number;
    policyVersion: string;
    at: string;
}

/** Pure, fail-closed evaluation of an already server-resolved scope. */
export function evaluateScopeAccess(
    untrustedScope: EffectiveScope | unknown,
    request: ScopeAccessRequest,
): PolicyDecision {
    const parsed = EffectiveScopeSchema.safeParse(untrustedScope);
    const at = instant(request?.at);
    if (!parsed.success || at === null || !request || !Number.isInteger(request.organizationId)
        || !Number.isInteger(request.retentionDays) || request.retentionDays < 0
        || request.dataClasses !== undefined && !Array.isArray(request.dataClasses)
        || request.toolIds !== undefined && !Array.isArray(request.toolIds)) {
        return deny('scope_invalid');
    }
    const scope = parsed.data;
    const resolvedAt = instant(scope.resolved_at);
    const expiresAt = instant(scope.expires_at);
    if (resolvedAt === null || expiresAt === null || resolvedAt > at || expiresAt <= at) {
        return deny('scope_expired');
    }
    if (scope.organization_id !== request.organizationId
        || scope.principal.organization_id !== request.organizationId) {
        return deny('organization_mismatch');
    }
    if (scope.scope_id !== request.scopeId
        || (scope.case_id !== undefined && scope.case_id !== request.caseId)) {
        return deny('boundary_mismatch');
    }
    if (scope.policy_version !== request.policyVersion) return deny('policy_version_mismatch');
    if (!scope.actions.includes(request.action)) return deny('boundary_mismatch');
    if (request.capability && !scope.capabilities.includes(request.capability)) {
        return deny('capability_not_granted');
    }
    if ((request.dataClasses ?? []).some((value) => !scope.data_classes.includes(value))) {
        return deny('data_class_not_granted');
    }
    if ((request.toolIds ?? []).some((value) => !scope.tool_grants.includes(value))) {
        return deny('tool_not_granted');
    }
    if (!scope.purposes.includes(request.purpose)) return deny('purpose_not_granted');
    if (scope.region !== request.region) return deny('region_not_granted');
    if (request.retentionDays > scope.retention_days) return deny('retention_exceeded');
    return allow();
}

export type KillSwitchOperation = 'start_run' | 'delivery' | 'command' | 'egress';
export type KillSwitchFlags = Record<KillSwitchOperation, boolean>;

export interface KillSwitchSnapshot {
    policyVersion: string;
    observedAt: string;
    global: KillSwitchFlags;
    organizations: Record<string, Partial<KillSwitchFlags>>;
}

export function evaluateKillSwitch(input: {
    snapshot?: KillSwitchSnapshot;
    organizationId: number;
    operation: KillSwitchOperation;
    policyVersion: string;
    at: string;
    maxSnapshotAgeMs?: number;
}): PolicyDecision {
    const at = instant(input.at);
    const observedAt = instant(input.snapshot?.observedAt);
    const maxAge = input.maxSnapshotAgeMs ?? 60_000;
    const global = input.snapshot?.global;
    const organizations = input.snapshot?.organizations;
    const operations: KillSwitchOperation[] = ['start_run', 'delivery', 'command', 'egress'];
    if (at === null || observedAt === null || observedAt > at || at - observedAt > maxAge
        || !input.snapshot || input.snapshot.policyVersion !== input.policyVersion
        || !Number.isInteger(input.organizationId) || input.organizationId <= 0
        || !global || !organizations || typeof organizations !== 'object'
        || operations.some((operation) => typeof global[operation] !== 'boolean')) {
        return deny('kill_switch_state_stale');
    }
    const organization = organizations[String(input.organizationId)] ?? {};
    if (Object.values(organization).some((value) => typeof value !== 'boolean')) {
        return deny('kill_switch_state_stale');
    }
    return global[input.operation] || organization[input.operation]
        ? deny('kill_switch_active')
        : allow('revalidate_kill_switch_before_effect');
}

export type BoundaryKind = 'api' | 'task' | 'artifact' | 'media' | 'socket' | 'delivery';

export interface BoundarySubject {
    kind: BoundaryKind;
    organizationId: number;
    scopeId: string;
    caseId?: number;
    caseVersion?: number;
    authoritativeCaseVersion?: number;
    policyVersion: string;
    action: ScopeAccessRequest['action'];
    capability?: string;
    dataClass?: DataClass;
    purpose: string;
    region: string;
    retentionDays: number;
    principalId?: string;
    destinationOrganizationId?: number;
    mediaReference?: string;
    consent?: { granted: boolean; purpose: string; capturedAt: string; revokedAt?: string };
    expiresAt?: string;
    at: string;
}

/** Binds every ingress/runtime/effect envelope back to one resolved scope. */
export function evaluateBoundary(
    scope: EffectiveScope | unknown,
    subject: BoundarySubject,
): PolicyDecision {
    const parsed = EffectiveScopeSchema.safeParse(scope);
    const at = instant(subject?.at);
    if (!parsed.success || at === null || !subject
        || !Number.isInteger(subject.caseVersion)
        || subject.caseVersion !== subject.authoritativeCaseVersion) {
        return deny('boundary_mismatch');
    }
    const resolved = parsed.data;
    if (subject.organizationId !== resolved.organization_id) return deny('organization_mismatch');
    if (subject.expiresAt && (instant(subject.expiresAt) ?? 0) <= at) return deny('scope_expired');
    if (subject.kind === 'socket' && subject.principalId !== resolved.principal.principal_id) {
        return deny('boundary_mismatch');
    }
    if (subject.kind === 'delivery'
        && subject.destinationOrganizationId !== resolved.organization_id) {
        return deny('organization_mismatch');
    }
    if (subject.kind === 'task' && !subject.capability) return deny('invalid_request');
    if ((subject.kind === 'artifact' || subject.kind === 'media') && !subject.dataClass) {
        return deny('invalid_request');
    }
    if (subject.kind === 'media') {
        const consentAt = instant(subject.consent?.capturedAt);
        if (!subject.mediaReference?.startsWith('media:') || subject.mediaReference.includes('://')
            || !subject.consent?.granted || subject.consent.purpose !== subject.purpose
            || consentAt === null || consentAt > at || subject.consent.revokedAt !== undefined) {
            return deny('boundary_mismatch');
        }
    }
    return evaluateScopeAccess(resolved, {
        organizationId: subject.organizationId,
        scopeId: subject.scopeId,
        caseId: subject.caseId,
        action: subject.action,
        capability: subject.capability,
        dataClasses: subject.dataClass ? [subject.dataClass] : [],
        purpose: subject.purpose,
        region: subject.region,
        retentionDays: subject.retentionDays,
        policyVersion: subject.policyVersion,
        at: subject.at,
    });
}

export interface ApprovalRequestLike {
    schema: 'approval-request/v1';
    approval_id: string;
    organization_id: number;
    case_id: number;
    case_version: number;
    action: 'dispatch' | 'quote' | 'spend' | 'external_message' | 'policy_change' | 'closure';
    proposal_artifact_id: string;
    proposal_hash: string;
    requested_by_run_id: string;
    expires_at: string;
}

export interface ApprovalReceiptLike {
    schema: 'approval-receipt/v1';
    approval_id: string;
    request_hash: string;
    decision: 'approved' | 'rejected' | 'revoked';
    decided_by_principal_id: string;
    reason_code: string;
    decided_at: string;
}

export interface ApprovalRevocation {
    approvalId: string;
    requestHash: string;
    revokedAt: string;
}

function stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export const approvalRequestHash = (request: ApprovalRequestLike): string =>
    createHash('sha256').update(stableJson(request)).digest('hex');

export interface ApprovalEvaluationInput {
    request?: ApprovalRequestLike;
    receipt?: ApprovalReceiptLike;
    organizationId: number;
    caseId: number;
    caseVersion: number;
    action: ApprovalRequestLike['action'];
    proposalHash: string;
    at: string;
    maxDecisionAgeMs: number;
    revocations?: ApprovalRevocation[];
}

export interface ApprovalProof {
    request?: ApprovalRequestLike;
    receipt?: ApprovalReceiptLike;
    maxDecisionAgeMs: number;
    revocations?: ApprovalRevocation[];
}

export function evaluateApproval(input: ApprovalEvaluationInput): PolicyDecision {
    const parsedRequest = ApprovalRequestSchema.safeParse(input.request);
    const parsedReceipt = ApprovalReceiptSchema.safeParse(input.receipt);
    if (!parsedRequest.success || !parsedReceipt.success) return deny('approval_invalid');
    const request = parsedRequest.data;
    const receipt = parsedReceipt.data;
    const at = instant(input.at);
    const decidedAt = instant(receipt?.decided_at);
    const expiresAt = instant(request?.expires_at);
    if (at === null || decidedAt === null
        || expiresAt === null || input.maxDecisionAgeMs <= 0
        || request.approval_id !== receipt.approval_id
        || receipt.request_hash !== approvalRequestHash(request)
        || request.organization_id !== input.organizationId || request.case_id !== input.caseId
        || request.case_version !== input.caseVersion || request.action !== input.action
        || request.proposal_hash !== input.proposalHash) {
        return deny('approval_invalid');
    }
    if (receipt.decision === 'revoked'
        || input.revocations?.some((item) => item.approvalId === request.approval_id
            && item.requestHash === receipt.request_hash
            && (instant(item.revokedAt) ?? Number.NEGATIVE_INFINITY) <= at)) {
        return deny('approval_revoked');
    }
    if (receipt.decision !== 'approved') return deny('approval_invalid');
    if (expiresAt <= at || decidedAt > at || decidedAt > expiresAt
        || at - decidedAt > input.maxDecisionAgeMs) {
        return deny('approval_expired');
    }
    return allow('revalidate_approval_before_effect');
}

export interface CommandRule {
    executable: string;
    toolId: string;
    purposes: string[];
    maxArgs: number;
    requiresApproval: boolean;
}

export function evaluateCommand(input: {
    scope: EffectiveScope | unknown;
    organizationId: number;
    mode: 'customer' | 'restricted_sandbox';
    executable: string;
    args: string[];
    purpose: string;
    region: string;
    policyVersion: string;
    caseVersion: number;
    at: string;
    rules: CommandRule[];
    approval?: ApprovalProof;
    switches?: KillSwitchSnapshot;
}): PolicyDecision {
    if (input.mode !== 'restricted_sandbox' || !/^[A-Za-z0-9._-]+$/.test(input.executable)
        || !Array.isArray(input.args)) return deny('command_denied');
    if (!Array.isArray(input.rules)) return deny('command_denied');
    const rule = input.rules.find((candidate) => candidate.executable === input.executable);
    const unsafeArgument = input.args.some((arg) => typeof arg !== 'string' || arg.length > 256
        || arg.length === 0 || /[;&|`$<>\r\n\0]/.test(arg) || arg.includes('..')
        || /^(?:\/|\\|[A-Za-z]:\\)/.test(arg)
        || /(?:password|secret|token|api[-_]?key|credential)/i.test(arg));
    if (!rule || !Array.isArray(rule.purposes) || !Number.isInteger(rule.maxArgs)
        || input.args.length > rule.maxArgs || unsafeArgument
        || !rule.purposes.includes(input.purpose)) return deny('command_denied');
    const parsed = EffectiveScopeSchema.safeParse(input.scope);
    const access = evaluateScopeAccess(input.scope, {
        organizationId: input.organizationId,
        scopeId: parsed.success ? parsed.data.scope_id : '',
        caseId: parsed.success ? parsed.data.case_id : undefined,
        action: 'manage', toolIds: [rule.toolId], purpose: input.purpose,
        region: input.region, retentionDays: 0, policyVersion: input.policyVersion, at: input.at,
    });
    if (!access.allowed) return access;
    const switchDecision = evaluateKillSwitch({ snapshot: input.switches,
        organizationId: input.organizationId, operation: 'command',
        policyVersion: input.policyVersion, at: input.at });
    if (!switchDecision.allowed) return switchDecision;
    if (rule.requiresApproval) {
        const proposalHash = createHash('sha256').update(stableJson({
            organizationId: input.organizationId, scopeId: parsed.success ? parsed.data.scope_id : '',
            caseVersion: input.caseVersion, executable: input.executable,
            args: input.args, purpose: input.purpose, policyVersion: input.policyVersion,
        })).digest('hex');
        const approval = evaluateApproval({ ...input.approval,
            organizationId: input.organizationId, caseId: parsed.success ? parsed.data.case_id ?? 0 : 0,
            caseVersion: input.caseVersion, action: 'policy_change', proposalHash,
            at: input.at, maxDecisionAgeMs: input.approval?.maxDecisionAgeMs ?? 0 });
        if (!approval.allowed) return approval;
    }
    return allow('sandbox_isolation', 'capture_command_receipt');
}

export interface EgressRule {
    hostname: string;
    methods: string[];
    toolId: string;
    purposes: string[];
    regions: string[];
    dataClasses: DataClass[];
    requiresApproval: boolean;
}

export function evaluateEgress(input: {
    scope: EffectiveScope | unknown;
    organizationId: number;
    url: string;
    method: string;
    redirectCount: number;
    purpose: string;
    region: string;
    dataClasses: DataClass[];
    policyVersion: string;
    caseVersion: number;
    at: string;
    rules: EgressRule[];
    approval?: ApprovalProof;
    switches?: KillSwitchSnapshot;
}): PolicyDecision {
    let target: URL;
    try { target = new URL(input.url); } catch { return deny('egress_denied'); }
    const hostname = target.hostname.toLowerCase();
    if (!Array.isArray(input.rules) || !Array.isArray(input.dataClasses)) return deny('egress_denied');
    const rule = input.rules.find((candidate) => candidate.hostname.toLowerCase() === hostname);
    if (!rule || target.protocol !== 'https:' || Boolean(target.username || target.password)
        || target.port && target.port !== '443' || input.redirectCount !== 0
        || isIP(hostname) !== 0 || hostname === 'localhost' || hostname.endsWith('.local')
        || !Array.isArray(rule.methods) || !Array.isArray(rule.purposes)
        || !Array.isArray(rule.regions) || !Array.isArray(rule.dataClasses)
        || !rule.methods.includes(input.method.toUpperCase())
        || !rule.purposes.includes(input.purpose) || !rule.regions.includes(input.region)
        || input.dataClasses.some((value) => !rule.dataClasses.includes(value))) {
        return deny('egress_denied');
    }
    const parsed = EffectiveScopeSchema.safeParse(input.scope);
    const access = evaluateScopeAccess(input.scope, {
        organizationId: input.organizationId, scopeId: parsed.success ? parsed.data.scope_id : '',
        caseId: parsed.success ? parsed.data.case_id : undefined,
        action: ['GET', 'HEAD'].includes(input.method.toUpperCase()) ? 'read' : 'message',
        dataClasses: input.dataClasses, toolIds: [rule.toolId], purpose: input.purpose,
        region: input.region, retentionDays: 0, policyVersion: input.policyVersion, at: input.at,
    });
    if (!access.allowed) return access;
    const switchDecision = evaluateKillSwitch({ snapshot: input.switches,
        organizationId: input.organizationId, operation: 'egress',
        policyVersion: input.policyVersion, at: input.at });
    if (!switchDecision.allowed) return switchDecision;
    if (rule.requiresApproval) {
        const proposalHash = createHash('sha256').update(stableJson({
            organizationId: input.organizationId, scopeId: parsed.success ? parsed.data.scope_id : '',
            caseVersion: input.caseVersion, url: input.url, method: input.method.toUpperCase(),
            purpose: input.purpose, region: input.region, dataClasses: input.dataClasses,
            policyVersion: input.policyVersion,
        })).digest('hex');
        const approval = evaluateApproval({ ...input.approval,
            organizationId: input.organizationId, caseId: parsed.success ? parsed.data.case_id ?? 0 : 0,
            caseVersion: input.caseVersion, action: 'external_message', proposalHash,
            at: input.at, maxDecisionAgeMs: input.approval?.maxDecisionAgeMs ?? 0 });
        if (!approval.allowed) return approval;
    }
    return allow('deny_redirects', 'resolve_and_pin_public_ip', 'capture_egress_receipt');
}
