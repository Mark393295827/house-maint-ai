import { describe, expect, it } from 'vitest';
import {
    AgentTaskEnvelopeSchema,
    ActionProposalSchema,
    ApprovalRequestSchema,
    ApprovalReceiptSchema,
    ArtifactEnvelopeSchema,
    CaseCommandEnvelopeSchema,
    CaseEventEnvelopeSchema,
    CaseProgressSchema,
    CancellationSignalSchema,
    CONTRACT_SCHEMAS,
    DeliveryEnvelopeSchema,
    DeliveryReceiptSchema,
    EffectiveScopeSchema,
    ErrorEnvelopeSchema,
    EvaluationReceiptSchema,
    ExecutionBudgetSchema,
    FeatureCompatibilitySchema,
} from '../src/index.js';

const now = '2026-08-02T05:00:00.000Z';
const later = '2026-08-02T06:00:00.000Z';
const hash = 'a'.repeat(64);

describe('agent-native public contracts', () => {
    it('accepts a server-resolved case scope', () => {
        const parsed = EffectiveScopeSchema.parse({
            schema: 'effective-scope/v1',
            scope_id: 'case:123',
            scope_kind: 'case',
            organization_id: 7,
            case_id: 123,
            principal: {
                principal_id: 'member:9', actor_kind: 'member', organization_id: 7,
                membership_id: 9, user_id: 4, role: 'resident', authenticated_at: now,
            },
            actions: ['read', 'contribute'],
            data_classes: ['personal', 'sensitive_media'],
            capabilities: ['maintenance.diagnose-and-plan.v1'],
            tool_grants: [],
            purposes: ['maintenance diagnosis'],
            region: 'cn-south', retention_days: 30, policy_version: 'policy-1',
            resolved_at: now, expires_at: later,
        });
        expect(parsed.case_id).toBe(123);
    });

    it('accepts a bounded diagnose-and-plan command without mutable case state', () => {
        expect(CaseCommandEnvelopeSchema.parse({
            schema: 'case-command/v1', command_id: 'command:1', organization_id: 7,
            case_id: 123, expected_version: 4, idempotency_key: 'diagnose-123-v4',
            correlation_id: 'corr:1', requested_at: now,
            body: {
                type: 'diagnose_and_plan',
                payload: {
                    confirmed_input_artifact_ids: ['artifact:input'],
                    locale: 'bilingual',
                    requested_capability: 'maintenance.diagnose-and-plan.v1',
                },
            },
        }).body.type).toBe('diagnose_and_plan');

        expect(CaseCommandEnvelopeSchema.safeParse({
            schema: 'case-command/v1', command_id: 'command:1', organization_id: 7,
            case_id: 123, expected_version: 4, idempotency_key: 'diagnose-123-v4',
            correlation_id: 'corr:1', requested_at: now,
            body: { type: 'diagnose_and_plan', payload: {
                confirmed_input_artifact_ids: ['artifact:input'], locale: 'bilingual',
                requested_capability: 'maintenance.diagnose-and-plan.v1',
            } },
            case: { status: 'closed' },
        }).success).toBe(false);
    });

    it('accepts append-only event metadata and rejects authority leakage', () => {
        const event = {
            schema: 'case-event/v1', event_id: 'event:1', organization_id: 7, case_id: 123,
            sequence: 5, case_version: 5, event_type: 'agent_artifact_accepted',
            actor_type: 'system', actor_membership_id: null, idempotency_key: 'event-key',
            correlation_id: 'corr:1', payload: { artifact_id: 'artifact:result' }, occurred_at: now,
        };
        expect(CaseEventEnvelopeSchema.safeParse(event).success).toBe(true);
        expect(CaseEventEnvelopeSchema.safeParse({
            ...event,
            payload: { nested: { api_key: 'never-durable' } },
        }).success).toBe(false);
    });

    it('enforces finite task budgets and vendor-neutral task fields', () => {
        const task = {
            schema: 'agent-task/v1', run_id: 'run:1', task_id: 'task:1', scope_id: 'case:123',
            organization_id: 7, case_ref: { id: 123, version: 4 },
            capability: 'vision.diagnose.structured.v1', input_artifact_ids: ['artifact:input'],
            budget: { attempts: 2, wall_ms: 15_000, tokens: 6_000, cost_micros: 300_000, tool_calls: 0 },
            policy_version: 'policy-1', idempotency_key: 'task-key', expires_at: later,
        };
        expect(AgentTaskEnvelopeSchema.safeParse(task).success).toBe(true);
        expect(AgentTaskEnvelopeSchema.safeParse({ ...task, provider: 'route-a' }).success).toBe(false);
        expect(ExecutionBudgetSchema.safeParse({ ...task.budget, attempts: 3 }).success).toBe(false);
    });

    it('requires immutable artifact lineage and rejects hidden reasoning fields recursively', () => {
        const artifact = {
            schema: 'agent-artifact/v1', artifact_id: 'artifact:result', schema_name: 'maintenance-plan/v1',
            scope_id: 'case:123', organization_id: 7, case_id: 123, case_version: 4,
            producer_run_id: 'run:1', producer_task_id: 'task:1', input_hashes: [hash],
            payload_hash: hash, payload: { summary: { zh_cn: '关闭供水', en_us: 'Shut off water' } },
            policy_version: 'policy-1', data_class: 'personal', retention_days: 30,
            evaluation_state: 'pending', supersedes_artifact_id: null, created_at: now,
        };
        expect(ArtifactEnvelopeSchema.safeParse(artifact).success).toBe(true);
        expect(ArtifactEnvelopeSchema.safeParse({
            ...artifact,
            payload: { analysis: { hidden_reasoning: 'do not store this' } },
        }).success).toBe(false);
    });

    it('covers evaluator, approval, progress, error, and compatibility receipts', () => {
        expect(EvaluationReceiptSchema.safeParse({
            schema: 'evaluation-receipt/v1', evaluation_id: 'evaluation:1', artifact_id: 'artifact:result',
            evaluator_capability: 'maintenance.critic.independent.v1', independent_route: true,
            checks: [{ name: 'schema', status: 'pass', evidence_codes: ['valid'] }],
            decision: 'accept', evaluated_at: now,
        }).success).toBe(true);
        expect(ApprovalReceiptSchema.safeParse({
            schema: 'approval-receipt/v1', approval_id: 'approval:1', request_hash: hash,
            decision: 'approved', decided_by_principal_id: 'member:9', reason_code: 'reviewed', decided_at: now,
        }).success).toBe(true);
        expect(ApprovalRequestSchema.safeParse({
            schema: 'approval-request/v1', approval_id: 'approval:1', organization_id: 7,
            case_id: 123, case_version: 4, action: 'external_message',
            proposal_artifact_id: 'artifact:proposal', proposal_hash: hash,
            requested_by_run_id: 'run:1', expires_at: later,
        }).success).toBe(true);
        expect(ActionProposalSchema.safeParse({
            schema: 'action-proposal/v1', proposal_id: 'proposal:1', organization_id: 7,
            case_id: 123, case_version: 4, action: 'external_message',
            payload: { response_artifact_id: 'artifact:response' }, created_at: now,
        }).success).toBe(true);
        expect(CancellationSignalSchema.safeParse({
            schema: 'cancellation-signal/v1', signal_id: 'signal:1', run_id: 'run:1',
            requested_by_principal_id: 'member:9', reason_code: 'user_requested', requested_at: now,
        }).success).toBe(true);
        expect(DeliveryEnvelopeSchema.safeParse({
            schema: 'delivery/v1', delivery_id: 'delivery:1', organization_id: 7,
            case_id: 123, case_version: 4, destination_binding_id: 'binding:1',
            channel: 'web', payload_artifact_id: 'artifact:response', required_approval_id: null,
            correlation_id: 'corr:1', expires_at: later,
        }).success).toBe(true);
        expect(DeliveryReceiptSchema.safeParse({
            schema: 'delivery-receipt/v1', delivery_id: 'delivery:1', attempt: 1,
            status: 'delivered', external_reference_hash: hash, reason_code: 'accepted', recorded_at: now,
        }).success).toBe(true);
        expect(CaseProgressSchema.safeParse({
            schema: 'case-progress/v1', organization_id: 7, case_id: 123, case_version: 4,
            stage: 'diagnosis', run: { run_id: 'run:1', status: 'working', progress_percent: 50 },
            next_action: { kind: 'wait', display: { zh_cn: '正在分析', en_us: 'Analyzing' }, artifact_id: null },
            updated_at: now,
        }).success).toBe(true);
        expect(ErrorEnvelopeSchema.safeParse({
            schema: 'error/v1', error: { code: 'policy_denied', message: 'Action is not permitted',
                retryable: false, correlation_id: 'corr:1' },
        }).success).toBe(true);
        expect(FeatureCompatibilitySchema.safeParse({
            schema: 'feature-compatibility/v1', feature: 'diagnose_and_plan', mode: 'shadow',
            rollback_mode: 'disable_new_execution', contract_hash: hash, changed_at: now,
        }).success).toBe(true);
    });

    it('rejects unknown contract versions', () => {
        expect(CaseProgressSchema.safeParse({ schema: 'case-progress/v2' }).success).toBe(false);
    });

    it('publishes the complete versioned runtime registry', () => {
        expect(Object.keys(CONTRACT_SCHEMAS).sort()).toEqual([
            'action-proposal/v1', 'agent-artifact/v1', 'agent-run-input/v1', 'agent-run/v1', 'agent-task/v1',
            'approval-receipt/v1', 'approval-request/v1', 'cancellation-signal/v1',
            'case-command/v1', 'case-event/v1', 'case-progress/v1', 'case-projection/v1',
            'delivery-receipt/v1', 'delivery/v1', 'effective-scope/v1', 'error/v1',
            'evaluation-receipt/v1', 'execution-budget/v1', 'feature-compatibility/v1', 'principal/v1',
        ]);
    });
});
