import { ArtifactEnvelopeSchema } from './artifact.js';
import { CaseCommandEnvelopeSchema, CaseEventEnvelopeSchema, CaseProjectionSchema } from './case.js';
import {
    ActionProposalSchema,
    ApprovalReceiptSchema,
    ApprovalRequestSchema,
    CaseProgressSchema,
    DeliveryEnvelopeSchema,
    DeliveryReceiptSchema,
    ErrorEnvelopeSchema,
    EvaluationReceiptSchema,
    FeatureCompatibilitySchema,
} from './effects.js';
import { AgentRunSchema, AgentTaskEnvelopeSchema, CancellationSignalSchema, ExecutionBudgetSchema } from './runtime.js';
import { EffectiveScopeSchema, PrincipalSchema } from './scope.js';

/**
 * One importable registry gives HTTP, worker, plugin, and contract-test
 * boundaries the same exact runtime validators. Deployment route selection is
 * deliberately absent: it is configuration owned by the runtime kernel.
 */
export const CONTRACT_SCHEMAS = {
    'principal/v1': PrincipalSchema,
    'effective-scope/v1': EffectiveScopeSchema,
    'case-command/v1': CaseCommandEnvelopeSchema,
    'case-event/v1': CaseEventEnvelopeSchema,
    'case-projection/v1': CaseProjectionSchema,
    'execution-budget/v1': ExecutionBudgetSchema,
    'cancellation-signal/v1': CancellationSignalSchema,
    'agent-task/v1': AgentTaskEnvelopeSchema,
    'agent-run/v1': AgentRunSchema,
    'agent-artifact/v1': ArtifactEnvelopeSchema,
    'evaluation-receipt/v1': EvaluationReceiptSchema,
    'approval-request/v1': ApprovalRequestSchema,
    'approval-receipt/v1': ApprovalReceiptSchema,
    'action-proposal/v1': ActionProposalSchema,
    'delivery/v1': DeliveryEnvelopeSchema,
    'delivery-receipt/v1': DeliveryReceiptSchema,
    'case-progress/v1': CaseProgressSchema,
    'error/v1': ErrorEnvelopeSchema,
    'feature-compatibility/v1': FeatureCompatibilitySchema,
} as const;

export type ContractName = keyof typeof CONTRACT_SCHEMAS;
