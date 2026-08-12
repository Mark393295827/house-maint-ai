import { evaluateApproval } from '@house-maint/policy';
import type { OutboxEntry } from '@house-maint/persistence/outbox';
import type { DecisionSnapshotPort, WorkerClock } from './ports.js';

export interface EffectGateDecision {
    allowed: boolean;
    code: 'allowed' | 'expired' | 'scope_mismatch' | 'stale_case_version' | 'stale_policy'
        | 'decision_revoked' | 'kill_switch_active' | 'approval_invalid' | 'approval_revoked' | 'approval_expired';
}

export class EffectGate {
    constructor(private readonly decisions: DecisionSnapshotPort, private readonly clock: WorkerClock) {}

    async revalidate(entry: OutboxEntry): Promise<EffectGateDecision> {
        const envelope = entry.envelope;
        const at = this.clock.now().toISOString();
        if (Date.parse(envelope.expires_at) <= Date.parse(at)) return { allowed: false, code: 'expired' };
        const snapshot = await this.decisions.load(entry);
        if (snapshot.organization_id !== envelope.organization_id || snapshot.scope_id !== entry.scope_id
            || snapshot.case_id !== envelope.case_id
            || snapshot.destination.binding_id !== envelope.destination_binding_id
            || snapshot.destination.organization_id !== envelope.organization_id
            || snapshot.destination.scope_id !== entry.scope_id
            || snapshot.destination.case_id !== envelope.case_id || !snapshot.destination.active) {
            return { allowed: false, code: 'scope_mismatch' };
        }
        if (snapshot.case_version !== envelope.case_version) return { allowed: false, code: 'stale_case_version' };
        if (snapshot.policy_version !== entry.policy_version) return { allowed: false, code: 'stale_policy' };
        if (!snapshot.decision_valid) return { allowed: false, code: 'decision_revoked' };
        if (snapshot.delivery_kill_switch) return { allowed: false, code: 'kill_switch_active' };
        if (envelope.required_approval_id) {
            const approval = snapshot.approval;
            if (!approval?.request || approval.request.approval_id !== envelope.required_approval_id) {
                return { allowed: false, code: 'approval_invalid' };
            }
            const decision = evaluateApproval({
                request: approval.request, receipt: approval.receipt,
                organizationId: envelope.organization_id, caseId: envelope.case_id,
                caseVersion: envelope.case_version, action: entry.action,
                proposalHash: entry.proposal_hash, at,
                maxDecisionAgeMs: approval.max_decision_age_ms,
                revocations: approval.revocations,
            });
            if (!decision.allowed) {
                const code = decision.code === 'approval_revoked' ? 'approval_revoked'
                    : decision.code === 'approval_expired' ? 'approval_expired' : 'approval_invalid';
                return { allowed: false, code };
            }
        }
        return { allowed: true, code: 'allowed' };
    }
}
