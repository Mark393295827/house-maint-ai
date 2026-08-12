import type {
    AgentRun,
    AgentRunInput,
    AgentRunPlan,
    AgentTaskEnvelope,
    ArtifactEnvelope,
    EffectiveScope,
    EvaluationReceipt,
    ExecutionBudget,
} from '@house-maint/contracts';

export interface CancellationSignal {
    schema: 'cancellation-signal/v1';
    signal_id: string;
    run_id: string;
    requested_by_principal_id: string;
    reason_code: 'user_requested' | 'case_superseded' | 'budget_exceeded' | 'policy_revoked' | 'operator_kill_switch' | 'shutdown';
    requested_at: string;
}

export interface SqlResult<Row> {
    rows: Row[];
    rowCount: number | null;
}

export interface SqlClient {
    query<Row = unknown>(text: string, params?: unknown[]): Promise<SqlResult<Row>>;
}

export interface TransactionalSql extends SqlClient {
    withTransaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
}

export interface CoordinationClock {
    now(): Date;
}

export interface IdSource {
    next(prefix: 'lease' | 'event'): string;
}

export interface DurableSession {
    schema: 'agent-session/v1';
    session_id: string;
    scope: EffectiveScope;
    created_at: string;
}

export interface OpenDurableSession {
    session_id: string;
    scope: EffectiveScope;
    idempotency_key: string;
}

export interface CreateDurableRun {
    run_id: string;
    session_id: string;
    command_id: string;
    case_id: number;
    case_version: number;
    budget: ExecutionBudget;
    plan?: AgentRunPlan;
    policy_version: string;
    idempotency_key: string;
}

export type DurableTaskState =
    | 'ready' | 'claimed' | 'running' | 'retry_wait'
    | 'succeeded' | 'cancelled' | 'failed' | 'expired';

export interface DurableTask {
    envelope: AgentTaskEnvelope;
    state: DurableTaskState;
    attempts: number;
    lease_owner: string | null;
    lease_token: string | null;
    lease_expires_at: string | null;
    output_artifact_id: string | null;
    evaluation_id: string | null;
    error_code: string | null;
    created_at: string;
    updated_at: string;
}

export interface DurableTaskClaim {
    run_id: string;
    task_id: string;
    worker_id: string;
    lease_token: string;
    attempt: number;
    lease_expires_at: string;
    reclaimed: boolean;
    task: AgentTaskEnvelope;
}

export interface TaskCompletion {
    artifact: ArtifactEnvelope;
    evaluation: EvaluationReceipt;
    usage: { wall_ms: number; tokens: number; cost_micros: number; tool_calls: number };
}

export interface DurableRunLineage {
    session: DurableSession;
    run: AgentRun;
    tasks: DurableTask[];
    external_inputs: AgentRunInput[];
    artifacts: ArtifactEnvelope[];
    evaluations: EvaluationReceipt[];
    signals: CancellationSignal[];
    events: Array<{
        event_id: string;
        sequence: number;
        event_type: string;
        run_id: string | null;
        task_id: string | null;
        occurred_at: string;
        details: Record<string, unknown>;
    }>;
}

export interface RunStore {
    openSession(input: OpenDurableSession): Promise<DurableSession>;
    createRun(input: CreateDurableRun): Promise<AgentRun>;
    registerExternalInput(input: AgentRunInput): Promise<AgentRunInput>;
    enqueueTask(task: AgentTaskEnvelope): Promise<DurableTask>;
    claimTask(workerId: string, leaseMs: number): Promise<DurableTaskClaim | null>;
    beginTask(claim: DurableTaskClaim): Promise<DurableTask>;
    completeTask(claim: DurableTaskClaim, completion: TaskCompletion): Promise<DurableTask>;
    failTask(claim: DurableTaskClaim, code: string, retryable: boolean, retryAt?: string): Promise<DurableTask>;
    cancelRun(signal: CancellationSignal): Promise<CancellationSignal>;
    getTask(taskId: string): Promise<DurableTask | null>;
    getLineage(runId: string): Promise<DurableRunLineage>;
}

export class CoordinationStoreError extends Error {
    constructor(public readonly code: string, message: string) {
        super(message);
        this.name = 'CoordinationStoreError';
    }
}
