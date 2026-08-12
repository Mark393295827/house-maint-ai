import type { AgentTaskEnvelope, ArtifactEnvelope, CaseProgress, EffectiveScope, EvaluationReceipt } from '@house-maint/contracts';
import type { EffectIntent, OutboxEntry } from '@house-maint/persistence/outbox';
import type { ApprovalEvaluationInput } from '@house-maint/policy';

export interface CapabilityUsage {
    wall_ms: number;
    tokens: number;
    cost_micros: number;
    tool_calls: number;
}

export interface CapabilityExecution {
    artifact: ArtifactEnvelope;
    evaluation: EvaluationReceipt;
    /** Producer usage is always charged. */
    usage: CapabilityUsage;
    /** Independent evaluator/critic usage is charged in addition to producer usage. */
    evaluation_usage?: CapabilityUsage;
}

/**
 * Deliberately effect-free. A model/capability receives no domain repository,
 * outbox, delivery, notification, assignment, or realtime port.
 */
export interface ArtifactCapabilityPort {
    execute(input: { task: AgentTaskEnvelope; signal: AbortSignal }): Promise<CapabilityExecution>;
    /** Context-aware execution used by the staged pilot.  The legacy execute
     * method remains the compatibility seam for existing workers. */
    executeWithContext?(input: {
        task: AgentTaskEnvelope;
        scope: EffectiveScope;
        input_artifacts: readonly ArtifactEnvelope[];
        signal: AbortSignal;
    }): Promise<CapabilityExecution>;
}

/** Narrow canonical-writer port.  The worker never imports domain repositories. */
export interface CaseCommandServicePort {
    execute(input: { command: unknown; scope: EffectiveScope }): Promise<{
        replayed: boolean;
        commandHash: string;
        event: unknown;
        projection: { id: number; version: number };
    }>;
}

export interface AuthoritativeDecisionSnapshot {
    organization_id: number;
    scope_id: string;
    case_id: number;
    case_version: number;
    policy_version: string;
    decision_valid: boolean;
    delivery_kill_switch: boolean;
    destination: {
        binding_id: string;
        organization_id: number;
        scope_id: string;
        case_id: number;
        active: boolean;
    };
    approval?: {
        request: ApprovalEvaluationInput['request'];
        receipt: ApprovalEvaluationInput['receipt'];
        revocations: NonNullable<ApprovalEvaluationInput['revocations']>;
        max_decision_age_ms: number;
    };
}

export interface DecisionSnapshotPort {
    load(intent: EffectIntent): Promise<AuthoritativeDecisionSnapshot>;
}

export interface DeliveryAttemptResult {
    status: 'delivered' | 'retryable_failure' | 'permanent_failure';
    external_reference_hash: string | null;
    reason_code: string;
}

export interface SyntheticDeliveryPort {
    deliver(input: {
        idempotency_key: string;
        effect_kind: OutboxEntry['effect_kind'];
        envelope: OutboxEntry['envelope'];
        signal: AbortSignal;
    }): Promise<DeliveryAttemptResult>;
}

export interface RealtimeTarget {
    organization_id: number;
    scope_id: string;
    case_id: number;
    principal_ids: readonly string[];
}

export interface RealtimePort {
    publish(target: RealtimeTarget, progress: CaseProgress): Promise<void>;
}

export interface WorkerClock { now(): Date }
