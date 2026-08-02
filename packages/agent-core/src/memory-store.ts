import {
    AgentRunSchema,
    AgentTaskEnvelopeSchema,
    ArtifactEnvelopeSchema,
    CancellationSignalSchema,
    EffectiveScopeSchema,
    EvaluationReceiptSchema,
    ExecutionBudgetSchema,
    type AgentRun,
    type AgentTaskEnvelope,
    type ArtifactEnvelope,
    type EvaluationReceipt,
} from '../../contracts/src/index.js';
import { RuntimeFault, type RuntimeErrorCode } from './errors.js';
import type {
    AgentSession,
    CancellationSignal,
    Clock,
    CreateRunInput,
    LeaseClaim,
    OpenSessionInput,
    RunLineage,
    RuntimeEvent,
    RuntimeSnapshot,
    RuntimeUsage,
    StoredTask,
    TaskExecutionReceipt,
} from './types.js';
import { canonicalJson, clone, sha256 } from './utils.js';

type IdempotencyRecord = { id: string; fingerprint: string };

export interface AttemptCompletion {
    readonly usage: RuntimeUsage;
    readonly artifact?: ArtifactEnvelope;
    readonly evaluation?: EvaluationReceipt;
    readonly error_code?: RuntimeErrorCode;
    readonly retryable?: boolean;
}

export class InMemoryAgentStore {
    private sequence = 0;
    private readonly sessions = new Map<string, AgentSession>();
    private readonly runs = new Map<string, AgentRun>();
    private readonly tasks = new Map<string, StoredTask>();
    private readonly artifacts = new Map<string, ArtifactEnvelope>();
    private readonly evaluations = new Map<string, EvaluationReceipt>();
    private readonly cancellations = new Map<string, CancellationSignal>();
    private readonly events: RuntimeEvent[] = [];
    private readonly sessionKeys = new Map<string, IdempotencyRecord>();
    private readonly runKeys = new Map<string, IdempotencyRecord>();
    private readonly taskKeys = new Map<string, IdempotencyRecord>();

    constructor(private readonly clock: Clock) {}

    static restore(snapshot: RuntimeSnapshot, clock: Clock): InMemoryAgentStore {
        if (snapshot.schema !== 'agent-runtime-snapshot/v1') throw new RuntimeFault('invalid_state', 'Unknown snapshot schema');
        const store = new InMemoryAgentStore(clock);
        store.sequence = snapshot.sequence;
        for (const session of snapshot.sessions) store.sessions.set(session.session_id, clone(session));
        for (const run of snapshot.runs) store.runs.set(run.run_id, AgentRunSchema.parse(clone(run)));
        for (const task of snapshot.tasks) store.tasks.set(task.envelope.task_id, clone(task));
        for (const artifact of snapshot.artifacts) store.artifacts.set(artifact.artifact_id, ArtifactEnvelopeSchema.parse(clone(artifact)));
        for (const evaluation of snapshot.evaluations) store.evaluations.set(evaluation.evaluation_id, EvaluationReceiptSchema.parse(clone(evaluation)));
        for (const signal of snapshot.cancellations) store.cancellations.set(signal.signal_id, CancellationSignalSchema.parse(clone(signal)));
        store.events.push(...clone(snapshot.events));
        for (const [key, id, fingerprint] of snapshot.idempotency.sessions) store.sessionKeys.set(key, { id, fingerprint });
        for (const [key, id, fingerprint] of snapshot.idempotency.runs) store.runKeys.set(key, { id, fingerprint });
        for (const [key, id, fingerprint] of snapshot.idempotency.tasks) store.taskKeys.set(key, { id, fingerprint });
        return store;
    }

    openSession(input: OpenSessionInput): AgentSession {
        const scope = EffectiveScopeSchema.parse(clone(input.scope));
        if (Date.parse(scope.expires_at) <= this.clock.now().getTime()) throw new RuntimeFault('scope_mismatch', 'Scope is expired');
        const key = `${scope.scope_id}:${input.idempotency_key}`;
        const fingerprint = sha256({ session_id: input.session_id, scope });
        const prior = this.sessionKeys.get(key);
        if (prior) return this.resolveIdempotent(prior, fingerprint, this.sessions, 'session');
        if (this.sessions.has(input.session_id)) throw new RuntimeFault('idempotency_conflict', 'Session id already exists');
        const session: AgentSession = {
            schema: 'agent-session/v1', session_id: input.session_id, scope, created_at: this.now(),
        };
        this.sessions.set(session.session_id, clone(session));
        this.sessionKeys.set(key, { id: session.session_id, fingerprint });
        this.append('session.created', null, null, { session_id: session.session_id, scope_id: scope.scope_id });
        return clone(session);
    }

    createRun(input: CreateRunInput): AgentRun {
        const session = this.sessions.get(input.session_id);
        if (!session) throw new RuntimeFault('invalid_state', 'Session does not exist');
        const budget = ExecutionBudgetSchema.parse(clone(input.budget));
        if (session.scope.policy_version !== input.policy_version || session.scope.case_id !== input.case_id) {
            throw new RuntimeFault('scope_mismatch', 'Run does not match session scope');
        }
        const key = `${session.scope.scope_id}:${input.idempotency_key}`;
        const fingerprint = sha256(input);
        const prior = this.runKeys.get(key);
        if (prior) return this.resolveIdempotent(prior, fingerprint, this.runs, 'run');
        if (this.runs.has(input.run_id)) throw new RuntimeFault('idempotency_conflict', 'Run id already exists');
        const timestamp = this.now();
        const run = AgentRunSchema.parse({
            schema: 'agent-run/v1', run_id: input.run_id, session_id: input.session_id,
            scope_id: session.scope.scope_id, organization_id: session.scope.organization_id,
            case_id: input.case_id, case_version: input.case_version, command_id: input.command_id,
            status: 'pending', task_ids: [], artifact_ids: [], budget,
            consumed: { attempts: 0, wall_ms: 0, tokens: 0, cost_micros: 0, tool_calls: 0 },
            policy_version: input.policy_version, created_at: timestamp, updated_at: timestamp, terminal_at: null,
        });
        this.runs.set(run.run_id, run);
        this.runKeys.set(key, { id: run.run_id, fingerprint });
        this.append('run.created', run.run_id, null, { session_id: run.session_id, budget: run.budget });
        return clone(run);
    }

    enqueueTask(value: AgentTaskEnvelope): StoredTask {
        const envelope = AgentTaskEnvelopeSchema.parse(clone(value));
        const run = this.runs.get(envelope.run_id);
        if (!run) throw new RuntimeFault('invalid_state', 'Run does not exist');
        if (run.status === 'cancelled' || run.status === 'failed' || run.status === 'succeeded') {
            throw new RuntimeFault('invalid_state', 'Run is terminal');
        }
        if (envelope.scope_id !== run.scope_id || envelope.organization_id !== run.organization_id
            || envelope.case_ref.id !== run.case_id || envelope.case_ref.version !== run.case_version
            || envelope.policy_version !== run.policy_version) {
            throw new RuntimeFault('scope_mismatch', 'Task does not match run scope, case version, or policy');
        }
        const session = this.sessions.get(run.session_id)!;
        if (!session.scope.capabilities.includes(envelope.capability)) {
            throw new RuntimeFault('scope_mismatch', 'Capability is not granted by the session scope');
        }
        const now = this.clock.now().getTime();
        if (Date.parse(envelope.expires_at) <= now || (envelope.not_before && Date.parse(envelope.not_before) >= Date.parse(envelope.expires_at))) {
            throw new RuntimeFault('invalid_state', 'Task scheduling window is invalid');
        }
        for (const id of envelope.input_artifact_ids) {
            const artifact = this.artifacts.get(id);
            if (!artifact || artifact.scope_id !== run.scope_id || artifact.organization_id !== run.organization_id
                || artifact.case_id !== run.case_id || artifact.case_version !== run.case_version) {
                throw new RuntimeFault('scope_mismatch', `Input artifact ${id} is absent or out of scope`);
            }
        }
        const key = `${run.run_id}:${envelope.idempotency_key}`;
        const fingerprint = sha256(envelope);
        const prior = this.taskKeys.get(key);
        if (prior) return this.resolveIdempotent(prior, fingerprint, this.tasks, 'task');
        if (this.tasks.has(envelope.task_id)) throw new RuntimeFault('idempotency_conflict', 'Task id already exists');
        const timestamp = this.now();
        const task: StoredTask = {
            envelope, state: 'ready', attempts: 0,
            consumed: { wall_ms: 0, tokens: 0, cost_micros: 0, tool_calls: 0 },
            lease: null, claim_history: [], output_artifact_id: null, evaluation_ids: [], error_code: null,
            terminal_receipt: null, created_at: timestamp, updated_at: timestamp,
        };
        this.tasks.set(envelope.task_id, task);
        this.taskKeys.set(key, { id: envelope.task_id, fingerprint });
        run.task_ids.push(envelope.task_id);
        this.setRunStatus(run, 'running');
        this.append('task.enqueued', run.run_id, envelope.task_id, { capability: envelope.capability });
        return clone(task);
    }

    claimNext(workerId: string, leaseMs: number): LeaseClaim | null {
        if (!workerId || !Number.isInteger(leaseMs) || leaseMs < 1 || leaseMs > 300_000) {
            throw new RuntimeFault('invalid_claim', 'Worker id and finite lease are required');
        }
        this.recoverExpiredClaims();
        const nowMs = this.clock.now().getTime();
        const candidates = [...this.tasks.values()].sort((left, right) =>
            left.created_at.localeCompare(right.created_at) || left.envelope.task_id.localeCompare(right.envelope.task_id));
        for (const task of candidates) {
            if (task.state === 'retry_wait') task.state = 'ready';
            if (task.state !== 'ready') continue;
            const run = this.runs.get(task.envelope.run_id)!;
            if (run.status !== 'running' && run.status !== 'pending') continue;
            const session = this.sessions.get(run.session_id)!;
            if (Date.parse(session.scope.expires_at) <= nowMs) {
                this.finishFailure(task, 'scope_mismatch', false);
                continue;
            }
            if ((task.envelope.not_before && Date.parse(task.envelope.not_before) > nowMs)) continue;
            if (Date.parse(task.envelope.expires_at) <= nowMs) {
                this.finishFailure(task, 'lease_expired', false);
                continue;
            }
            if (task.attempts >= task.envelope.budget.attempts || run.consumed.attempts >= run.budget.attempts) {
                this.finishFailure(task, 'budget_exceeded', false);
                continue;
            }
            task.attempts += 1;
            run.consumed.attempts += 1;
            run.updated_at = this.now();
            const leasedAt = this.now();
            const claim: LeaseClaim = {
                run_id: run.run_id, task_id: task.envelope.task_id, worker_id: workerId,
                lease_token: `lease:${sha256({ task_id: task.envelope.task_id, worker_id: workerId, attempt: task.attempts }).slice(0, 32)}`,
                attempt: task.attempts, leased_at: leasedAt,
                lease_expires_at: new Date(nowMs + leaseMs).toISOString(), reclaimed: task.attempts > 1,
            };
            task.state = 'claimed';
            task.lease = claim;
            task.claim_history.push(claim);
            task.updated_at = leasedAt;
            this.append('task.claimed', run.run_id, task.envelope.task_id, { worker_id: workerId, attempt: claim.attempt, reclaimed: claim.reclaimed });
            return clone(claim);
        }
        return null;
    }

    beginExecution(claim: LeaseClaim): { task: StoredTask; run: AgentRun; session: AgentSession } | TaskExecutionReceipt {
        const task = this.tasks.get(claim.task_id);
        if (!task || task.envelope.run_id !== claim.run_id) throw new RuntimeFault('invalid_claim', 'Claim target does not exist');
        if (task.terminal_receipt) return { ...clone(task.terminal_receipt), duplicate: true };
        this.assertActiveClaim(task, claim);
        if (task.state === 'running') return {
            run_id: claim.run_id, task_id: claim.task_id, attempt: claim.attempt, state: 'running',
            artifact_id: null, evaluation_id: null, error_code: null, duplicate: true,
        };
        if (task.state !== 'claimed') throw new RuntimeFault('invalid_claim', 'Task is not claimable');
        task.state = 'running';
        task.updated_at = this.now();
        this.append('task.started', claim.run_id, claim.task_id, { attempt: claim.attempt });
        const run = this.runs.get(claim.run_id)!;
        const session = this.sessions.get(run.session_id)!;
        return { task: clone(task), run: clone(run), session: clone(session) };
    }

    recordRoute(claim: LeaseClaim, routeId: string): void {
        const task = this.tasks.get(claim.task_id);
        if (!task) throw new RuntimeFault('invalid_claim', 'Task does not exist');
        this.assertActiveClaim(task, claim);
        this.append('capability.routed', claim.run_id, claim.task_id, { route_id: routeId, capability: task.envelope.capability });
    }

    completeAttempt(claim: LeaseClaim, completion: AttemptCompletion): TaskExecutionReceipt {
        const task = this.tasks.get(claim.task_id);
        if (!task) throw new RuntimeFault('invalid_claim', 'Task does not exist');
        if (task.terminal_receipt) return { ...clone(task.terminal_receipt), duplicate: true };
        this.assertActiveClaim(task, claim);
        if (task.state !== 'running') throw new RuntimeFault('invalid_claim', 'Task is not running');
        const run = this.runs.get(claim.run_id)!;
        const usage = this.validateUsage(completion.usage);
        for (const key of ['wall_ms', 'tokens', 'cost_micros', 'tool_calls'] as const) {
            task.consumed[key] += usage[key];
            run.consumed[key] += usage[key];
        }
        this.append('budget.charged', run.run_id, task.envelope.task_id, { usage, consumed: clone(run.consumed) });
        const exceeded = (['wall_ms', 'tokens', 'cost_micros', 'tool_calls'] as const)
            .filter((key) => task.consumed[key] > task.envelope.budget[key] || run.consumed[key] > run.budget[key]);
        if (exceeded.length) {
            this.append('budget.exceeded', run.run_id, task.envelope.task_id, { dimensions: exceeded });
            return clone(this.finishFailure(task, 'budget_exceeded', false));
        }
        if (completion.artifact) {
            const artifact = ArtifactEnvelopeSchema.parse(clone(completion.artifact));
            this.putImmutable(this.artifacts, artifact.artifact_id, artifact, 'artifact');
            if (!run.artifact_ids.includes(artifact.artifact_id)) run.artifact_ids.push(artifact.artifact_id);
            task.output_artifact_id = artifact.artifact_id;
            this.append('artifact.recorded', run.run_id, task.envelope.task_id, { artifact_id: artifact.artifact_id, state: artifact.evaluation_state });
        }
        if (completion.evaluation) {
            const evaluation = EvaluationReceiptSchema.parse(clone(completion.evaluation));
            if (!completion.artifact || evaluation.artifact_id !== completion.artifact.artifact_id) {
                throw new RuntimeFault('invalid_artifact', 'Evaluation does not reference the completed artifact');
            }
            this.putImmutable(this.evaluations, evaluation.evaluation_id, evaluation, 'evaluation');
            if (!task.evaluation_ids.includes(evaluation.evaluation_id)) task.evaluation_ids.push(evaluation.evaluation_id);
            this.append('evaluation.recorded', run.run_id, task.envelope.task_id, {
                evaluation_id: evaluation.evaluation_id, decision: evaluation.decision, independent_route: evaluation.independent_route,
            });
        }
        if (!completion.error_code) {
            task.state = 'succeeded';
            task.lease = null;
            task.updated_at = this.now();
            const receipt = this.receipt(task, null, false);
            task.terminal_receipt = receipt;
            this.append('task.succeeded', run.run_id, task.envelope.task_id, { artifact_id: task.output_artifact_id });
            this.refreshRun(run);
            return clone(receipt);
        }
        return clone(this.finishFailure(task, completion.error_code, completion.retryable ?? false));
    }

    cancel(signalValue: CancellationSignal): CancellationSignal {
        const signal = CancellationSignalSchema.parse(clone(signalValue));
        const prior = this.cancellations.get(signal.signal_id);
        if (prior) {
            if (canonicalJson(prior) !== canonicalJson(signal)) throw new RuntimeFault('idempotency_conflict', 'Signal id was reused');
            return clone(prior);
        }
        const run = this.runs.get(signal.run_id);
        if (!run) throw new RuntimeFault('invalid_state', 'Cancellation run does not exist');
        this.cancellations.set(signal.signal_id, signal);
        this.append('signal.recorded', run.run_id, null, { signal_id: signal.signal_id, reason_code: signal.reason_code });
        for (const taskId of run.task_ids) {
            const task = this.tasks.get(taskId)!;
            if (this.isTerminal(task.state)) continue;
            task.state = 'cancelled';
            task.lease = null;
            task.error_code = 'cancelled';
            task.updated_at = this.now();
            task.terminal_receipt = this.receipt(task, 'cancelled', false);
            this.append('task.cancelled', run.run_id, taskId, { signal_id: signal.signal_id });
        }
        this.setRunStatus(run, 'cancelled');
        return clone(signal);
    }

    getRun(id: string): AgentRun | undefined { const value = this.runs.get(id); return value && clone(value); }
    getSession(id: string): AgentSession | undefined { const value = this.sessions.get(id); return value && clone(value); }
    getTask(id: string): StoredTask | undefined { const value = this.tasks.get(id); return value && clone(value); }
    getArtifact(id: string): ArtifactEnvelope | undefined { const value = this.artifacts.get(id); return value && clone(value); }

    getLineage(runId: string): RunLineage {
        const run = this.runs.get(runId);
        if (!run) throw new RuntimeFault('invalid_state', 'Run does not exist');
        const session = this.sessions.get(run.session_id)!;
        const tasks = run.task_ids.map((id) => clone(this.tasks.get(id)!));
        const artifacts = [...this.artifacts.values()].filter((item) => item.producer_run_id === runId).map(clone);
        const artifactIds = new Set(artifacts.map((item) => item.artifact_id));
        return {
            session: clone(session), run: clone(run), tasks, artifacts,
            evaluations: [...this.evaluations.values()].filter((item) => artifactIds.has(item.artifact_id)).map(clone),
            cancellations: [...this.cancellations.values()].filter((item) => item.run_id === runId).map(clone),
            events: this.events.filter((item) => item.run_id === runId
                || (item.type === 'session.created' && item.details.session_id === run.session_id)).map(clone),
        };
    }

    snapshot(): RuntimeSnapshot {
        const triples = (source: Map<string, IdempotencyRecord>) => [...source.entries()]
            .map(([key, value]) => [key, value.id, value.fingerprint] as const);
        return clone({
            schema: 'agent-runtime-snapshot/v1', sequence: this.sequence,
            sessions: [...this.sessions.values()], runs: [...this.runs.values()], tasks: [...this.tasks.values()],
            artifacts: [...this.artifacts.values()], evaluations: [...this.evaluations.values()],
            cancellations: [...this.cancellations.values()], events: this.events,
            idempotency: { sessions: triples(this.sessionKeys), runs: triples(this.runKeys), tasks: triples(this.taskKeys) },
        });
    }

    private recoverExpiredClaims(): void {
        const now = this.clock.now().getTime();
        for (const task of this.tasks.values()) {
            if ((task.state !== 'claimed' && task.state !== 'running') || !task.lease
                || Date.parse(task.lease.lease_expires_at) > now) continue;
            const expiredClaim = task.lease;
            task.lease = null;
            this.append('lease.expired', task.envelope.run_id, task.envelope.task_id, { attempt: expiredClaim.attempt });
            const run = this.runs.get(task.envelope.run_id)!;
            if (task.attempts >= task.envelope.budget.attempts || run.consumed.attempts >= run.budget.attempts) {
                this.finishFailure(task, 'lease_expired', false);
            } else {
                task.state = 'retry_wait';
                task.error_code = 'lease_expired';
                task.updated_at = this.now();
                this.append('task.retry_scheduled', run.run_id, task.envelope.task_id, { reason: 'lease_expired' });
            }
        }
    }

    private finishFailure(task: StoredTask, code: RuntimeErrorCode, retryable: boolean): TaskExecutionReceipt {
        const run = this.runs.get(task.envelope.run_id)!;
        task.lease = null;
        task.error_code = code;
        task.updated_at = this.now();
        if (retryable && task.attempts < task.envelope.budget.attempts && run.consumed.attempts < run.budget.attempts) {
            task.state = 'retry_wait';
            this.append('task.retry_scheduled', run.run_id, task.envelope.task_id, { reason: code, next_attempt: task.attempts + 1 });
            return this.receipt(task, code, false);
        }
        task.state = 'failed';
        const receipt = this.receipt(task, code, false);
        task.terminal_receipt = receipt;
        this.append('task.failed', run.run_id, task.envelope.task_id, { reason: code, attempt: task.attempts });
        for (const siblingId of run.task_ids) {
            const sibling = this.tasks.get(siblingId)!;
            if (sibling === task || this.isTerminal(sibling.state)) continue;
            sibling.state = 'cancelled'; sibling.lease = null; sibling.error_code = code; sibling.updated_at = this.now();
            sibling.terminal_receipt = this.receipt(sibling, code, false);
            this.append('task.cancelled', run.run_id, siblingId, { reason: 'run_failed' });
        }
        this.setRunStatus(run, 'failed');
        return receipt;
    }

    private refreshRun(run: AgentRun): void {
        const tasks = run.task_ids.map((id) => this.tasks.get(id)!);
        if (tasks.length && tasks.every((task) => task.state === 'succeeded')) this.setRunStatus(run, 'succeeded');
        else if (tasks.some((task) => task.state === 'failed' || task.state === 'expired')) this.setRunStatus(run, 'failed');
        else this.setRunStatus(run, 'running');
    }

    private setRunStatus(run: AgentRun, status: AgentRun['status']): void {
        const prior = run.status;
        run.status = status;
        run.updated_at = this.now();
        run.terminal_at = status === 'succeeded' || status === 'cancelled' || status === 'failed' ? run.updated_at : null;
        AgentRunSchema.parse(run);
        if (prior !== status) this.append('run.status_changed', run.run_id, null, { from: prior, to: status });
    }

    private assertActiveClaim(task: StoredTask, claim: LeaseClaim): void {
        if (!task.lease || task.lease.lease_token !== claim.lease_token || task.lease.worker_id !== claim.worker_id
            || task.lease.attempt !== claim.attempt) throw new RuntimeFault('invalid_claim', 'Lease token is stale or mismatched');
        if (Date.parse(task.lease.lease_expires_at) <= this.clock.now().getTime()) throw new RuntimeFault('lease_expired', 'Lease expired', true);
    }

    private validateUsage(usage: RuntimeUsage): RuntimeUsage {
        for (const value of Object.values(usage)) {
            if (!Number.isInteger(value) || value < 0) throw new RuntimeFault('budget_exceeded', 'Usage must be finite non-negative integers');
        }
        return clone(usage);
    }

    private receipt(task: StoredTask, error: RuntimeErrorCode | null, duplicate: boolean): TaskExecutionReceipt {
        return {
            run_id: task.envelope.run_id, task_id: task.envelope.task_id, attempt: task.attempts,
            state: task.state, artifact_id: task.output_artifact_id,
            evaluation_id: task.evaluation_ids.at(-1) ?? null, error_code: error, duplicate,
        };
    }

    private append(type: string, runId: string | null, taskId: string | null, details: Record<string, unknown>): void {
        this.sequence += 1;
        this.events.push({
            event_id: `event:${String(this.sequence).padStart(8, '0')}`, sequence: this.sequence,
            occurred_at: this.now(), type, run_id: runId, task_id: taskId, details: clone(details),
        });
    }

    private resolveIdempotent<T>(prior: IdempotencyRecord, fingerprint: string, source: Map<string, T>, kind: string): T {
        if (prior.fingerprint !== fingerprint) throw new RuntimeFault('idempotency_conflict', `${kind} idempotency key was reused`);
        const value = source.get(prior.id);
        if (!value) throw new RuntimeFault('invalid_state', `${kind} idempotency index is corrupt`);
        return clone(value);
    }

    private putImmutable<T>(source: Map<string, T>, id: string, value: T, kind: string): void {
        const prior = source.get(id);
        if (prior && canonicalJson(prior) !== canonicalJson(value)) throw new RuntimeFault('invalid_artifact', `${kind} identity is immutable`);
        if (!prior) source.set(id, clone(value));
    }

    private isTerminal(state: StoredTask['state']): boolean {
        return state === 'succeeded' || state === 'cancelled' || state === 'failed' || state === 'expired';
    }

    private now(): string { return this.clock.now().toISOString(); }
}
