import type {
    AgentRun,
    AgentRunInput,
    AgentRunPlan,
    AgentTaskEnvelope,
    ArtifactEnvelope,
    EffectiveScope,
    EvaluationReceipt,
    ExecutionBudget,
} from '../../contracts/src/index.js';
import type { RuntimeErrorCode } from './errors.js';

export interface Clock {
    now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export interface AgentSession {
    readonly schema: 'agent-session/v1';
    readonly session_id: string;
    readonly scope: EffectiveScope;
    readonly created_at: string;
}

export interface RuntimeUsage {
    wall_ms: number;
    tokens: number;
    cost_micros: number;
    tool_calls: number;
}

export const zeroUsage = (): RuntimeUsage => ({
    wall_ms: 0,
    tokens: 0,
    cost_micros: 0,
    tool_calls: 0,
});

export interface ArtifactCandidate {
    readonly schema_name: string;
    readonly payload: Record<string, unknown>;
    readonly input_hashes?: readonly string[];
    readonly data_class: ArtifactEnvelope['data_class'];
    readonly retention_days: number;
    readonly supersedes_artifact_id?: string | null;
}

export interface CapabilityResult {
    readonly artifact: ArtifactCandidate;
    readonly usage: RuntimeUsage;
}

export interface CapabilityRequest {
    readonly task: AgentTaskEnvelope;
    readonly scope: EffectiveScope;
    readonly input_artifacts: readonly ArtifactEnvelope[];
    readonly tools: Readonly<Record<string, never>>;
    readonly signal: AbortSignal;
}

export interface CapabilityHandler {
    readonly route_id: string;
    run(request: CapabilityRequest): Promise<CapabilityResult>;
}

export interface CapabilityRouter {
    resolve(task: AgentTaskEnvelope, scope: EffectiveScope): CapabilityHandler | undefined;
}

export interface EvaluationResult {
    readonly checks: EvaluationReceipt['checks'];
    readonly decision: EvaluationReceipt['decision'];
}

export interface ArtifactEvaluator {
    readonly route_id: string;
    readonly capability: string;
    evaluate(
        artifact: ArtifactEnvelope,
        context: { readonly task: AgentTaskEnvelope; readonly scope: EffectiveScope; readonly signal: AbortSignal },
    ): Promise<EvaluationResult>;
}

export type TaskState =
    | 'ready'
    | 'claimed'
    | 'running'
    | 'retry_wait'
    | 'succeeded'
    | 'cancelled'
    | 'failed'
    | 'expired';

export interface LeaseClaim {
    readonly run_id: string;
    readonly task_id: string;
    readonly worker_id: string;
    readonly lease_token: string;
    readonly attempt: number;
    readonly leased_at: string;
    readonly lease_expires_at: string;
    readonly reclaimed: boolean;
}

export interface TaskExecutionReceipt {
    readonly run_id: string;
    readonly task_id: string;
    readonly attempt: number;
    readonly state: TaskState;
    readonly artifact_id: string | null;
    readonly evaluation_id: string | null;
    readonly error_code: RuntimeErrorCode | null;
    readonly duplicate: boolean;
}

export interface RuntimeEvent {
    readonly event_id: string;
    readonly sequence: number;
    readonly occurred_at: string;
    readonly type: string;
    readonly run_id: string | null;
    readonly task_id: string | null;
    readonly details: Readonly<Record<string, unknown>>;
}

export interface CancellationSignal {
    readonly schema: 'cancellation-signal/v1';
    readonly signal_id: string;
    readonly run_id: string;
    readonly requested_by_principal_id: string;
    readonly reason_code: 'user_requested' | 'case_superseded' | 'budget_exceeded' | 'policy_revoked' | 'operator_kill_switch' | 'shutdown';
    readonly requested_at: string;
}

export interface StoredTask {
    envelope: AgentTaskEnvelope;
    state: TaskState;
    attempts: number;
    consumed: RuntimeUsage;
    lease: LeaseClaim | null;
    claim_history: LeaseClaim[];
    output_artifact_id: string | null;
    evaluation_ids: string[];
    error_code: RuntimeErrorCode | null;
    terminal_receipt: TaskExecutionReceipt | null;
    created_at: string;
    updated_at: string;
}

export interface RuntimeSnapshot {
    readonly schema: 'agent-runtime-snapshot/v1';
    readonly sequence: number;
    readonly sessions: readonly AgentSession[];
    readonly runs: readonly AgentRun[];
    readonly tasks: readonly StoredTask[];
    readonly artifacts: readonly ArtifactEnvelope[];
    readonly evaluations: readonly EvaluationReceipt[];
    readonly external_inputs: readonly AgentRunInput[];
    readonly cancellations: readonly CancellationSignal[];
    readonly events: readonly RuntimeEvent[];
    readonly idempotency: {
        readonly sessions: readonly (readonly [string, string, string])[];
        readonly runs: readonly (readonly [string, string, string])[];
        readonly tasks: readonly (readonly [string, string, string])[];
    };
}

export interface RunLineage {
    readonly session: AgentSession;
    readonly run: AgentRun;
    readonly tasks: readonly StoredTask[];
    readonly external_inputs: readonly AgentRunInput[];
    readonly artifacts: readonly ArtifactEnvelope[];
    readonly evaluations: readonly EvaluationReceipt[];
    readonly cancellations: RuntimeSnapshot['cancellations'];
    readonly events: readonly RuntimeEvent[];
}

export interface OpenSessionInput {
    readonly session_id: string;
    readonly scope: EffectiveScope;
    readonly idempotency_key: string;
}

export interface CreateRunInput {
    readonly run_id: string;
    readonly session_id: string;
    readonly command_id: string;
    readonly case_id: number;
    readonly case_version: number;
    readonly budget: ExecutionBudget;
    readonly plan?: AgentRunPlan;
    readonly policy_version: string;
    readonly idempotency_key: string;
}
