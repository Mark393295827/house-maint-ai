import {
    AgentRunInputSchema,
    AgentRunPlanSchema,
    EffectiveScopeSchema,
    type AgentRun,
    type AgentRunInput,
    type AgentTaskEnvelope,
    type EffectiveScope,
    type ExecutionBudget,
} from '@house-maint/contracts';
import {
    ArtifactFinalizer,
    RuntimeFault,
    type Clock,
} from '@house-maint/agent-core';
import {
    CAPABILITY_IDS,
    createDiagnoseAndPlanRunPlan,
    type CapabilityAdapterRegistry,
} from '@house-maint/agent-adapters';
import type { OutboxEntry, OutboxStore } from '@house-maint/persistence/outbox';
import type { DurableRunLineage, RunStore } from '@house-maint/persistence/runs';
import type {
    CaseCommandServicePort,
    RealtimeTarget,
} from './ports.js';
import { DurableCoordinationWorker } from './durable-coordination-worker.js';

export interface DiagnoseAndPlanStartInput {
    readonly session_id: string;
    readonly run_id: string;
    readonly command_id: string;
    readonly case_id: number;
    readonly case_version: number;
    readonly scope: EffectiveScope;
    readonly budget: ExecutionBudget;
    readonly confirmed_inputs: readonly AgentRunInput[];
    readonly idempotency_key?: string;
    readonly worker_id?: string;
    readonly realtime_target?: RealtimeTarget;
    readonly adoption_scope?: EffectiveScope;
    readonly adoption?: CaseCommandServicePort;
    readonly effect?: {
        readonly outbox: OutboxStore;
        readonly destination_binding_id: string;
        readonly channel?: 'web' | 'worker_portal' | 'wechat' | 'email' | 'sms' | 'internal_ops';
    };
}

export interface DiagnoseAndPlanResult {
    readonly run: AgentRun;
    readonly lineage: DurableRunLineage;
    readonly progress: readonly 25[] | readonly [25, 50, 75, 100];
    readonly client_artifact: {
        readonly artifact_id: string;
        readonly payload: Readonly<Record<string, unknown>>;
    };
    readonly adoption: { readonly replayed: boolean; readonly version: number } | null;
    readonly effect: OutboxEntry | null;
}

const EFFECT_TTL_MS = 86_400_000;

/** Resolve and authorize the realtime fan-out target before any task runs. */
export function resolveRealtimeTarget(input: {
    readonly scope: EffectiveScope;
    readonly case_id: number;
    readonly target?: RealtimeTarget;
}): RealtimeTarget {
    const expectedScopeId = `case:${input.case_id}`;
    const target = input.target ?? {
        organization_id: input.scope.organization_id,
        scope_id: expectedScopeId,
        case_id: input.case_id,
        principal_ids: [input.scope.principal.principal_id],
    };
    if ((input.scope.scope_kind === 'case' && input.scope.case_id !== input.case_id)
        || target.organization_id !== input.scope.organization_id
        || target.scope_id !== expectedScopeId
        || target.case_id !== input.case_id
        || target.principal_ids.length === 0
        || target.principal_ids.some((principalId) => !principalId)) {
        throw new RuntimeFault('scope_mismatch', 'Realtime target is outside the requested case scope');
    }
    return structuredClone(target);
}

function deterministicEffectExpiry(lineage: DurableRunLineage, artifactCreatedAt: string, evaluatedAt: string): string {
    const candidates = [lineage.run.created_at, artifactCreatedAt, evaluatedAt]
        .map((value) => Date.parse(value))
        .filter((value) => Number.isFinite(value));
    if (!candidates.length) throw new RuntimeFault('invalid_state', 'Effect source timestamps are invalid');
    return new Date(Math.max(...candidates) + EFFECT_TTL_MS).toISOString();
}

/**
 * Durable four-stage pilot coordinator.  It only schedules declared plan
 * tasks; all task execution, leasing, and canonical case writes stay behind
 * their respective ports.
 */
export class DiagnoseAndPlanCoordinator {
    private readonly clock: Clock;

    constructor(
        private readonly runs: RunStore,
        private readonly worker: DurableCoordinationWorker,
        private readonly registry: CapabilityAdapterRegistry,
        private readonly finalizer: ArtifactFinalizer,
        options: { readonly clock?: Clock } = {},
    ) {
        this.clock = options.clock ?? { now: () => new Date() };
    }

    async start(input: DiagnoseAndPlanStartInput): Promise<AgentRun> {
        const scope = EffectiveScopeSchema.parse(input.scope);
        const confirmed = input.confirmed_inputs.map((value) => AgentRunInputSchema.parse(value));
        if (!confirmed.length) throw new RuntimeFault('invalid_artifact', 'At least one confirmed external input is required');
        if (confirmed.some((value) => value.run_id !== input.run_id || value.command_id !== input.command_id)) {
            throw new RuntimeFault('scope_mismatch', 'Confirmed input authority differs from the requested run');
        }
        const inputIds = confirmed.map((value) => value.artifact.artifact_id);
        const plan = AgentRunPlanSchema.parse(createDiagnoseAndPlanRunPlan(input.run_id, inputIds));
        await this.runs.openSession({
            session_id: input.session_id,
            scope,
            idempotency_key: input.idempotency_key ?? `session:${input.run_id}`,
        });
        const run = await this.runs.createRun({
            run_id: input.run_id,
            session_id: input.session_id,
            command_id: input.command_id,
            case_id: input.case_id,
            case_version: input.case_version,
            budget: input.budget,
            plan,
            policy_version: scope.policy_version,
            idempotency_key: input.idempotency_key ?? `run:${input.run_id}`,
        });
        for (const value of confirmed) await this.runs.registerExternalInput(value);
        await this.enqueueReady(run, scope, input.budget);
        return run;
    }

    async runToCompletion(
        input: DiagnoseAndPlanStartInput,
        options: { readonly max_iterations?: number } = {},
    ): Promise<DiagnoseAndPlanResult> {
        if (input.effect && !input.adoption) {
            throw new RuntimeFault('invalid_state', 'External effects require canonical artifact adoption');
        }
        const target = resolveRealtimeTarget({ scope: input.scope, case_id: input.case_id, target: input.realtime_target });
        const run = await this.start(input);
        const workerId = input.worker_id ?? `worker:pilot:${run.run_id}`;
        const max = options.max_iterations ?? 32;
        for (let iteration = 0; iteration < max; iteration += 1) {
            const lineage = await this.runs.getLineage(run.run_id);
            if (lineage.run.status === 'succeeded') break;
            if (lineage.run.status === 'failed' || lineage.run.status === 'cancelled') {
                const detail = lineage.tasks.map((task) => `${task.envelope.task_id}:${task.state}:${task.error_code ?? 'none'}`).join(',');
                throw new RuntimeFault('invalid_state', `Pilot run ended in ${lineage.run.status} (${detail})`);
            }
            await this.enqueueReady(lineage.run, lineage.session.scope, input.budget);
            const worked = await this.worker.runTaskOnce(workerId, target);
            if (!worked) await new Promise((resolve) => setTimeout(resolve, 2));
        }
        const lineage = await this.runs.getLineage(run.run_id);
        if (lineage.run.status !== 'succeeded') {
            throw new RuntimeFault('temporarily_unavailable', 'Pilot did not reach terminal success within its finite budget', true);
        }
        const adoption = await this.adoptFinalArtifact(lineage, input);
        const effect = await this.enqueueEffect(lineage, input);
        const finalTask = lineage.tasks.find((task) => task.envelope.capability === CAPABILITY_IDS.bilingualNextAction);
        const finalArtifact = finalTask?.output_artifact_id
            ? lineage.artifacts.find((artifact) => artifact.artifact_id === finalTask.output_artifact_id)
            : undefined;
        if (!finalArtifact) throw new RuntimeFault('invalid_state', 'Bilingual final artifact is absent');
        return {
            run: lineage.run,
            lineage,
            progress: [25, 50, 75, 100],
            client_artifact: { artifact_id: finalArtifact.artifact_id, payload: finalArtifact.payload },
            adoption,
            effect,
        };
    }

    private async enqueueReady(run: AgentRun, scope: EffectiveScope, budget: ExecutionBudget): Promise<void> {
        const plan = run.plan;
        if (!plan) throw new RuntimeFault('invalid_state', 'Pilot requires an immutable plan');
        const lineage = await this.runs.getLineage(run.run_id);
        const existing = new Map(lineage.tasks.map((task) => [task.envelope.task_id, task]));
        for (const planned of plan.tasks) {
            if (existing.has(planned.task_id)) continue;
            const dependencies = planned.depends_on_task_ids.map((id) => existing.get(id));
            if (dependencies.some((task) => !task || task.state !== 'succeeded' || !task.output_artifact_id)) break;
            const external = planned.external_input_artifact_ids ?? [];
            const dependencyArtifacts = dependencies.flatMap((task) => task?.output_artifact_id ? [task.output_artifact_id] : []);
            const envelope: AgentTaskEnvelope = {
                schema: 'agent-task/v1', run_id: run.run_id, task_id: planned.task_id,
                scope_id: scope.scope_id, organization_id: scope.organization_id,
                case_ref: { id: run.case_id, version: run.case_version }, capability: planned.capability,
                input_artifact_ids: [...external, ...dependencyArtifacts], budget,
                policy_version: run.policy_version, idempotency_key: `task:${run.run_id}:${planned.task_id}`,
                expires_at: new Date(this.clock.now().getTime() + budget.wall_ms * 4).toISOString(),
            };
            await this.runs.enqueueTask(envelope);
            // Stage one task at a time.  This makes progress and lineage order
            // deterministic even when the worker is restarted between claims.
            break;
        }
    }

    private async adoptFinalArtifact(
        lineage: DurableRunLineage,
        input: DiagnoseAndPlanStartInput,
    ): Promise<{ readonly replayed: boolean; readonly version: number } | null> {
        if (!input.adoption) return null;
        const task = lineage.tasks.find((item) => item.envelope.capability === CAPABILITY_IDS.bilingualNextAction);
        if (!task?.output_artifact_id) throw new RuntimeFault('invalid_state', 'Final task did not produce an artifact');
        const artifact = lineage.artifacts.find((item) => item.artifact_id === task.output_artifact_id);
        const evaluation = artifact ? lineage.evaluations.find((item) => item.artifact_id === artifact.artifact_id) : undefined;
        if (!artifact || !evaluation) throw new RuntimeFault('invalid_state', 'Final artifact evaluation is absent');
        const producerRoute = this.registry.getBinding(task.envelope.capability);
        const evaluatorRoute = this.registry.getBinding(evaluation.evaluator_capability);
        if (!producerRoute || !evaluatorRoute) throw new RuntimeFault('evaluation_rejected', 'Final route bindings are unavailable');
        this.finalizer.proveStored({
            artifact, evaluation,
            producer_route_id: producerRoute.route_id,
            evaluator_route_id: evaluatorRoute.route_id,
            producer_capability: task.envelope.capability,
            route_registry: this.registry,
        });
        const scope = EffectiveScopeSchema.parse(input.adoption_scope ?? input.scope);
        // The command envelope is content-addressed by the adopted artifact and
        // evaluation.  Rebuilding it after a worker restart must produce the
        // exact same bytes so the canonical writer can replay the receipt.
        const requestedAt = evaluation.evaluated_at;
        const result = await input.adoption.execute({
            scope,
            command: {
                schema: 'case-command/v1', command_id: `command:adopt:${lineage.run.run_id}`,
                organization_id: input.scope.organization_id, case_id: input.case_id,
                expected_version: input.case_version, idempotency_key: `adopt:${lineage.run.run_id}`,
                correlation_id: `corr:${lineage.run.run_id}`, requested_at: requestedAt,
                body: {
                    type: 'update_case',
                    payload: { agent_artifact_adoption: {
                        artifact, evaluation,
                        producer_route_id: producerRoute.route_id,
                        evaluator_route_id: evaluatorRoute.route_id,
                    } },
                },
            },
        });
        if (result.projection.version !== input.case_version + 1) {
            throw new RuntimeFault('invalid_state', 'Canonical adoption did not advance the case exactly once');
        }
        return { replayed: result.replayed, version: result.projection.version };
    }

    private async enqueueEffect(
        lineage: DurableRunLineage,
        input: DiagnoseAndPlanStartInput,
    ): Promise<OutboxEntry | null> {
        if (!input.effect) return null;
        const task = lineage.tasks.find((item) => item.envelope.capability === CAPABILITY_IDS.bilingualNextAction);
        if (!task?.output_artifact_id) throw new RuntimeFault('invalid_state', 'Cannot enqueue effect without final artifact');
        if (!input.adoption) throw new RuntimeFault('invalid_state', 'External effects require canonical artifact adoption');
        const artifact = lineage.artifacts.find((item) => item.artifact_id === task.output_artifact_id);
        const evaluation = artifact
            ? lineage.evaluations.find((item) => item.artifact_id === artifact.artifact_id)
            : undefined;
        if (!artifact || !evaluation) throw new RuntimeFault('invalid_state', 'Effect artifact evaluation is absent');
        const scope = input.scope;
        return input.effect.outbox.enqueue({
            effect_key: `pilot-next-action:${lineage.run.run_id}`,
            effect_kind: 'message', run_id: lineage.run.run_id, scope_id: scope.scope_id,
            policy_version: scope.policy_version, action: 'external_message',
            proposal_hash: task.output_artifact_id.replace(/^artifact:/, ''), max_attempts: 2,
            envelope: {
                schema: 'delivery/v1', delivery_id: `delivery:pilot:${lineage.run.run_id}`,
                organization_id: scope.organization_id, case_id: input.case_id,
                case_version: input.case_version + 1,
                destination_binding_id: input.effect.destination_binding_id,
                channel: input.effect.channel ?? 'web', payload_artifact_id: task.output_artifact_id,
                required_approval_id: null, correlation_id: `corr:${lineage.run.run_id}`,
                expires_at: deterministicEffectExpiry(lineage, artifact.created_at, evaluation.evaluated_at),
            },
        });
    }
}
