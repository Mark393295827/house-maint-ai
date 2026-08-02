import {
    ArtifactEnvelopeSchema,
    EvaluationReceiptSchema,
    type AgentTaskEnvelope,
    type ArtifactEnvelope,
    type EvaluationReceipt,
    type EffectiveScope,
} from '../../contracts/src/index.js';
import { RuntimeFault } from './errors.js';
import { InMemoryAgentStore } from './memory-store.js';
import type {
    ArtifactCandidate,
    ArtifactEvaluator,
    CancellationSignal,
    CapabilityRouter,
    Clock,
    CreateRunInput,
    LeaseClaim,
    OpenSessionInput,
    RuntimeUsage,
    EvaluationResult,
    TaskExecutionReceipt,
} from './types.js';
import { sha256 } from './utils.js';

const NO_TOOLS = Object.freeze({}) as Readonly<Record<string, never>>;
const REQUIRED_CHECKS = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

export class AgentKernel {
    private readonly controllers = new Map<string, AbortController>();

    constructor(public readonly store: InMemoryAgentStore, private readonly clock: Clock) {}

    openSession(input: OpenSessionInput) { return this.store.openSession(input); }
    createRun(input: CreateRunInput) { return this.store.createRun(input); }
    enqueueTask(task: AgentTaskEnvelope) { return this.store.enqueueTask(task); }
    claimNext(workerId: string, leaseMs: number) { return this.store.claimNext(workerId, leaseMs); }

    cancel(signal: CancellationSignal): CancellationSignal {
        const result = this.store.cancel(signal);
        this.controllers.get(signal.run_id)?.abort();
        return result;
    }

    async executeClaim(
        claim: LeaseClaim,
        router: CapabilityRouter,
        evaluator: ArtifactEvaluator,
    ): Promise<TaskExecutionReceipt> {
        const started = this.store.beginExecution(claim);
        if ('duplicate' in started) return started;
        const { task, run, session } = started;
        const handler = router.resolve(task.envelope, session.scope);
        if (!handler) {
            return this.store.completeAttempt(claim, {
                usage: this.elapsedUsage(0), error_code: 'capability_unavailable', retryable: true,
            });
        }
        this.store.recordRoute(claim, handler.route_id);
        const inputArtifacts = task.envelope.input_artifact_ids.map((id) => {
            const artifact = this.store.getArtifact(id);
            if (!artifact) throw new RuntimeFault('invalid_artifact', `Input artifact ${id} disappeared`);
            return artifact;
        });
        const controller = this.controllers.get(run.run_id) ?? new AbortController();
        this.controllers.set(run.run_id, controller);
        const startedAt = this.clock.now().getTime();
        const wallRemaining = Math.min(
            task.envelope.budget.wall_ms - task.consumed.wall_ms,
            run.budget.wall_ms - run.consumed.wall_ms,
            Date.parse(claim.lease_expires_at) - startedAt,
        );
        if (wallRemaining <= 0) {
            return this.store.completeAttempt(claim, {
                usage: this.elapsedUsage(1), error_code: 'budget_exceeded', retryable: false,
            });
        }
        const deadline = new AbortController();
        let deadlineReached = false;
        const timer = setTimeout(() => { deadlineReached = true; deadline.abort(); }, wallRemaining);
        const combined = new AbortController();
        const forwardAbort = () => combined.abort();
        controller.signal.addEventListener('abort', forwardAbort, { once: true });
        deadline.signal.addEventListener('abort', forwardAbort, { once: true });
        let capabilityUsage: RuntimeUsage | undefined;
        let evaluatorStartedAt: number | undefined;
        try {
            const abortFault = () => new RuntimeFault(
                deadlineReached ? 'budget_exceeded' : 'cancelled',
                deadlineReached ? 'Wall budget elapsed' : 'Run cancelled',
            );
            const outcome = await this.raceAgainstAbort(
                () => handler.run({
                    task: task.envelope, scope: session.scope, input_artifacts: inputArtifacts,
                    tools: NO_TOOLS, signal: combined.signal,
                }),
                combined.signal,
                abortFault,
            );
            const usageBeforeEvaluation = this.usageWithElapsed(outcome.usage, startedAt);
            capabilityUsage = usageBeforeEvaluation;
            const exceeded = (['wall_ms', 'tokens', 'cost_micros', 'tool_calls'] as const).some((key) =>
                task.consumed[key] + usageBeforeEvaluation[key] > task.envelope.budget[key]
                || run.consumed[key] + usageBeforeEvaluation[key] > run.budget[key]);
            if (exceeded) {
                return this.store.completeAttempt(claim, {
                    usage: usageBeforeEvaluation, error_code: 'budget_exceeded', retryable: false,
                });
            }
            const pending = this.makeArtifact(task.envelope, outcome.artifact, 'pending');
            evaluatorStartedAt = this.clock.now().getTime();
            const evaluation = await this.raceAgainstAbort(
                () => this.evaluate(
                    pending, task.envelope, session.scope, handler.route_id, evaluator, combined.signal,
                ),
                combined.signal,
                abortFault,
            );
            const usage = this.usageAfterEvaluation(usageBeforeEvaluation, startedAt, evaluatorStartedAt);
            const exceededAfterEvaluation = (['wall_ms', 'tokens', 'cost_micros', 'tool_calls'] as const).some((key) =>
                task.consumed[key] + usage[key] > task.envelope.budget[key]
                || run.consumed[key] + usage[key] > run.budget[key]);
            if (exceededAfterEvaluation) {
                return this.store.completeAttempt(claim, { usage, error_code: 'budget_exceeded', retryable: false });
            }
            const accepted = evaluation.independent_route && evaluation.decision === 'accept'
                && REQUIRED_CHECKS.every((name) => evaluation.checks.some((check) => check.name === name && check.status === 'pass'));
            const artifact = ArtifactEnvelopeSchema.parse({ ...pending, evaluation_state: accepted ? 'accepted' : 'rejected' });
            return this.store.completeAttempt(claim, {
                usage, artifact, evaluation,
                ...(accepted ? {} : { error_code: 'evaluation_rejected' as const, retryable: true }),
            });
        } catch (error) {
            if (controller.signal.aborted) {
                const terminal = this.store.getTask(claim.task_id)?.terminal_receipt;
                if (terminal) return { ...terminal, duplicate: true };
            }
            const fault = error instanceof RuntimeFault
                ? error
                : new RuntimeFault('temporarily_unavailable', error instanceof Error ? error.message : 'Capability failed', true);
            const elapsed = deadlineReached
                ? Math.max(wallRemaining + 1, this.elapsedMs(startedAt))
                : this.elapsedMs(startedAt);
            const usage = capabilityUsage && evaluatorStartedAt !== undefined
                ? this.usageAfterEvaluation(capabilityUsage, startedAt, evaluatorStartedAt)
                : capabilityUsage ?? this.elapsedUsage(elapsed);
            return this.store.completeAttempt(claim, {
                usage: { ...usage, wall_ms: Math.max(usage.wall_ms, elapsed) },
                error_code: fault.code,
                retryable: fault.retryable,
            });
        } finally {
            clearTimeout(timer);
            controller.signal.removeEventListener('abort', forwardAbort);
            deadline.signal.removeEventListener('abort', forwardAbort);
            const status = this.store.getRun(run.run_id)?.status;
            if (status === 'succeeded' || status === 'cancelled' || status === 'failed') this.controllers.delete(run.run_id);
        }
    }

    private makeArtifact(
        task: AgentTaskEnvelope,
        candidate: ArtifactCandidate,
        state: ArtifactEnvelope['evaluation_state'],
    ): ArtifactEnvelope {
        try {
            const run = this.store.getRun(task.run_id);
            if (!run) throw new RuntimeFault('invalid_state', 'Run disappeared');
            const payloadHash = sha256(candidate.payload);
            const session = this.store.getSession(run.session_id);
            if (!session || !session.scope.data_classes.includes(candidate.data_class)
                || candidate.retention_days > session.scope.retention_days) {
                throw new RuntimeFault('scope_mismatch', 'Artifact data class or retention exceeds the session scope');
            }
            const inputHashes = candidate.input_hashes ?? task.input_artifact_ids.map((id) => {
                const artifact = this.store.getArtifact(id);
                if (!artifact) throw new RuntimeFault('invalid_artifact', `Input artifact ${id} disappeared`);
                return artifact.payload_hash;
            });
            const identity = {
                schema_name: candidate.schema_name, scope_id: task.scope_id, organization_id: task.organization_id,
                case_id: task.case_ref.id, case_version: task.case_ref.version, producer_run_id: task.run_id,
                producer_task_id: task.task_id, input_hashes: inputHashes, payload_hash: payloadHash,
                policy_version: task.policy_version, data_class: candidate.data_class,
                retention_days: candidate.retention_days, supersedes_artifact_id: candidate.supersedes_artifact_id ?? null,
            };
            return ArtifactEnvelopeSchema.parse({
                schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(identity)}`,
                ...identity, payload: candidate.payload, evaluation_state: state, created_at: this.clock.now().toISOString(),
            });
        } catch (error) {
            if (error instanceof RuntimeFault) throw error;
            throw new RuntimeFault('invalid_artifact', 'Capability returned an invalid artifact candidate', true);
        }
    }

    private async evaluate(
        artifact: ArtifactEnvelope,
        task: AgentTaskEnvelope,
        scope: EffectiveScope,
        capabilityRoute: string,
        evaluator: ArtifactEvaluator,
        signal: AbortSignal,
    ): Promise<EvaluationReceipt> {
        let result: EvaluationResult;
        try {
            result = await evaluator.evaluate(artifact, { task, scope, signal });
        } catch {
            result = {
                checks: REQUIRED_CHECKS.map((name) => ({ name, status: 'fail' as const, evidence_codes: ['evaluator_error'] })),
                decision: 'rework' as const,
            };
        }
        const checkMap = new Map(result.checks.map((check) => [check.name, check]));
        const checks = [
            ...REQUIRED_CHECKS.map((name) => checkMap.get(name)
                ?? { name, status: 'fail' as const, evidence_codes: ['required_check_missing'] }),
            ...result.checks.filter((check) => !REQUIRED_CHECKS.includes(check.name as typeof REQUIRED_CHECKS[number])),
        ];
        const independentRoute = capabilityRoute !== evaluator.route_id;
        const decision = independentRoute && result.decision === 'accept'
            && REQUIRED_CHECKS.every((name) => checks.some((check) => check.name === name && check.status === 'pass'))
            ? 'accept' as const : result.decision === 'reject' ? 'reject' as const : 'rework' as const;
        const evaluatedAt = this.clock.now().toISOString();
        const body = {
            artifact_id: artifact.artifact_id, evaluator_capability: evaluator.capability,
            independent_route: independentRoute, checks, decision, evaluated_at: evaluatedAt,
        };
        return EvaluationReceiptSchema.parse({ schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${sha256(body)}`, ...body });
    }

    private elapsedMs(startedAt: number): number {
        return Math.max(0, Math.trunc(this.clock.now().getTime() - startedAt));
    }

    private usageWithElapsed(reported: RuntimeUsage, startedAt: number): RuntimeUsage {
        return { ...reported, wall_ms: Math.max(reported.wall_ms, this.elapsedMs(startedAt)) };
    }

    private usageAfterEvaluation(
        capabilityUsage: RuntimeUsage,
        startedAt: number,
        evaluatorStartedAt: number,
    ): RuntimeUsage {
        const evaluatorElapsed = this.elapsedMs(evaluatorStartedAt);
        return {
            ...capabilityUsage,
            wall_ms: Math.max(
                capabilityUsage.wall_ms + evaluatorElapsed,
                this.elapsedMs(startedAt),
            ),
        };
    }

    private raceAgainstAbort<T>(
        operation: () => Promise<T>,
        signal: AbortSignal,
        fault: () => RuntimeFault,
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let settled = false;
            const finish = (settle: () => void) => {
                if (settled) return;
                settled = true;
                signal.removeEventListener('abort', onAbort);
                settle();
            };
            const onAbort = () => finish(() => reject(fault()));
            signal.addEventListener('abort', onAbort, { once: true });
            if (signal.aborted) {
                onAbort();
                return;
            }
            let pending: Promise<T>;
            try {
                pending = operation();
            } catch (error) {
                finish(() => reject(error));
                return;
            }
            pending.then(
                (value) => finish(() => resolve(value)),
                (error: unknown) => finish(() => reject(error)),
            );
        });
    }

    private elapsedUsage(wallMs: number): RuntimeUsage {
        return { wall_ms: Math.max(0, Math.trunc(wallMs)), tokens: 0, cost_micros: 0, tool_calls: 0 };
    }
}
