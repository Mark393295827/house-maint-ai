import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type {
    AgentTaskEnvelope,
    ArtifactEnvelope,
    EvaluationReceipt,
} from '../../../packages/contracts/src/index.js';
import {
    AgentKernel,
    InMemoryAgentStore,
    RuntimeFault,
    sha256,
    type CreateRunInput,
} from '../../../packages/agent-core/src/index.js';
import { PostgresRunStore } from '../../../packages/persistence/src/runs/index.js';
import {
    FakeEvaluator,
    FakeHarness,
    ManualClock,
    StaticCapabilityRouter,
    runtimeBudget,
    runtimeScope,
    runtimeTask,
    successfulCapabilityResult,
} from '../../../packages/testkit/src/agent-runtime/index.js';
import {
    DEFAULT_EMBEDDED_ENTRY,
    readWorkspace,
    startLivePostgres,
} from '../coordination/live-postgres-harness.js';

type DeclaredPlan = {
    schema: 'agent-run-plan/v1';
    plan_id: string;
    tasks: Array<{
        task_id: string;
        capability: string;
        depends_on_task_ids: string[];
    }>;
};

const taskSpecs = [
    { task_id: 'task:diagnosis:101', capability: 'diagnosis.structured.v1', depends_on_task_ids: [] },
    { task_id: 'task:repair-plan:101', capability: 'repair.plan.structured.v1', depends_on_task_ids: ['task:diagnosis:101'] },
    { task_id: 'task:critic:101', capability: 'artifact.critic.v1', depends_on_task_ids: ['task:repair-plan:101'] },
    { task_id: 'task:bilingual:101', capability: 'response.bilingual.v1', depends_on_task_ids: ['task:critic:101'] },
];

function declaredPlan(overrides: Partial<DeclaredPlan> = {}): DeclaredPlan {
    return {
        schema: 'agent-run-plan/v1',
        plan_id: 'plan:diagnose-and-plan:101:v1',
        tasks: taskSpecs.map((task) => ({ ...task, depends_on_task_ids: [...task.depends_on_task_ids] })),
        ...overrides,
    };
}

function memoryRuntime(plan = declaredPlan()) {
    const clock = new ManualClock();
    const store = new InMemoryAgentStore(clock);
    const kernel = new AgentKernel(store, clock);
    const scope = runtimeScope({ capabilities: taskSpecs.map((task) => task.capability) });
    kernel.openSession({ session_id: 'session:101', scope, idempotency_key: 'session:101' });
    const input: CreateRunInput & { plan: DeclaredPlan } = {
        run_id: 'run:101', session_id: 'session:101', command_id: 'command:diagnose:101',
        case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
        idempotency_key: 'run:101:v3', plan,
    };
    kernel.createRun(input);
    return { clock, store, kernel, input };
}

function plannedTask(index: number, inputArtifactIds: string[] = []): AgentTaskEnvelope {
    const spec = taskSpecs[index]!;
    return runtimeTask({
        task_id: spec.task_id,
        capability: spec.capability,
        input_artifact_ids: inputArtifactIds,
        idempotency_key: `${spec.task_id}:v1`,
    });
}

function capabilityRouter(firstStepRetries = false): StaticCapabilityRouter {
    const router = new StaticCapabilityRouter();
    for (const [index, spec] of taskSpecs.entries()) {
        const result = successfulCapabilityResult({ step: index + 1 });
        const steps = index === 0 && firstStepRetries
            ? [new RuntimeFault('temporarily_unavailable', 'synthetic retry', true), result]
            : [result];
        router.register(spec.capability, new FakeHarness(`route:producer:${index + 1}`, ...steps));
    }
    return router;
}

describe('declared composition run lifecycle', () => {
    it('treats the run attempt budget as a per-task ceiling rather than a total task limit', async () => {
        const plan = declaredPlan({
            plan_id: 'plan:parallel-budget-proof:101:v1',
            tasks: taskSpecs.map((task) => ({ ...task, depends_on_task_ids: [] })),
        });
        const { store, kernel } = memoryRuntime(plan);
        const router = capabilityRouter();
        const evaluator = new FakeEvaluator('route:independent:budget-proof');
        for (let index = 0; index < taskSpecs.length; index += 1) kernel.enqueueTask(plannedTask(index));

        await kernel.executeClaim(kernel.claimNext('worker:one', 1_000)!, router, evaluator);
        await kernel.executeClaim(kernel.claimNext('worker:two', 1_000)!, router, evaluator);
        expect(kernel.claimNext('worker:three', 1_000)).toMatchObject({ attempt: 1 });
        expect(store.getRun('run:101')).toMatchObject({ status: 'running', consumed: { attempts: 3 } });
    });

    it('stages four artifact-dependent tasks without terminalizing early or globally capping attempts', async () => {
        const { store, kernel } = memoryRuntime();
        const router = capabilityRouter(true);
        const evaluator = new FakeEvaluator('route:independent:lifecycle');

        expect(store.getRun('run:101')).toMatchObject({
            plan: { plan_id: 'plan:diagnose-and-plan:101:v1', tasks: taskSpecs },
            plan_hash: sha256(declaredPlan()),
        });

        expect(kernel.enqueueTask(plannedTask(0))).toEqual(kernel.enqueueTask(plannedTask(0)));
        expect(await kernel.executeClaim(kernel.claimNext('worker:first', 1_000)!, router, evaluator))
            .toMatchObject({ state: 'retry_wait', attempt: 1 });
        let receipt = await kernel.executeClaim(kernel.claimNext('worker:first-retry', 1_000)!, router, evaluator);
        expect(receipt).toMatchObject({ state: 'succeeded', attempt: 2 });
        expect(store.getRun('run:101')).toMatchObject({ status: 'running', terminal_at: null });

        for (let index = 1; index < taskSpecs.length; index += 1) {
            const task = plannedTask(index, [receipt.artifact_id!]);
            expect(kernel.enqueueTask(task)).toEqual(kernel.enqueueTask(task));
            receipt = await kernel.executeClaim(kernel.claimNext(`worker:${index + 1}`, 1_000)!, router, evaluator);
            expect(receipt).toMatchObject({ state: 'succeeded', attempt: 1 });
            if (index < taskSpecs.length - 1) {
                expect(store.getRun('run:101')).toMatchObject({ status: 'running', terminal_at: null });
            }
        }

        expect(store.getRun('run:101')).toMatchObject({
            status: 'succeeded',
            task_ids: taskSpecs.map((task) => task.task_id),
            consumed: { attempts: 5 },
        });
        expect(kernel.enqueueTask(plannedTask(3, [store.getTask(taskSpecs[2]!.task_id)!.output_artifact_id!])))
            .toEqual(store.getTask(taskSpecs[3]!.task_id));
    });

    it('restores a declared plan and performs exactly one bounded lease reclaim', () => {
        const { clock, store, kernel } = memoryRuntime();
        kernel.enqueueTask(plannedTask(0));
        expect(kernel.claimNext('worker:lost', 50)).toMatchObject({ attempt: 1, reclaimed: false });
        const checkpoint = store.snapshot();
        const corrupted = structuredClone(checkpoint);
        corrupted.runs[0]!.plan!.tasks[0]!.capability = 'diagnosis.changed.v1';
        expect(() => InMemoryAgentStore.restore(corrupted, clock))
            .toThrowError(expect.objectContaining({ code: 'invalid_state' }));
        clock.advance(51);

        const restored = InMemoryAgentStore.restore(checkpoint, clock);
        const restoredKernel = new AgentKernel(restored, clock);
        const reclaim = restoredKernel.claimNext('worker:restart', 1_000)!;
        expect(reclaim).toMatchObject({ attempt: 2, reclaimed: true });
        restored.beginExecution(reclaim);
        restored.completeAttempt(reclaim, {
            usage: { wall_ms: 1, tokens: 0, cost_micros: 0, tool_calls: 0 },
        });
        expect(restoredKernel.claimNext('worker:third', 1_000)).toBeNull();
        expect(restored.getRun('run:101')).toMatchObject({ status: 'running', consumed: { attempts: 2 } });
    });

    it('keeps plan identity immutable and denies unknown tasks or dependency substitution', async () => {
        const { kernel, input } = memoryRuntime();
        expect(kernel.createRun(input)).toEqual(kernel.createRun(input));
        expect(() => kernel.createRun({
            ...input,
            plan: declaredPlan({ plan_id: 'plan:conflict:101:v2' }),
        })).toThrowError(expect.objectContaining({ code: 'idempotency_conflict' }));
        expect(() => kernel.enqueueTask(runtimeTask({
            task_id: 'task:unknown:101',
            idempotency_key: 'task:unknown:101:v1',
        }))).toThrowError(expect.objectContaining({ code: 'invalid_state' }));

        expect(() => kernel.enqueueTask(plannedTask(1, ['artifact:substitute'])))
            .toThrowError(expect.objectContaining({ code: 'invalid_state' }));
    });
});

const embeddedEntry = process.env.HOUSE_MAINT_EMBEDDED_POSTGRES_ENTRY ?? DEFAULT_EMBEDDED_ENTRY;

function acceptedCompletion(task: AgentTaskEnvelope, step: number): {
    artifact: ArtifactEnvelope;
    evaluation: EvaluationReceipt;
    usage: { wall_ms: number; tokens: number; cost_micros: number; tool_calls: number };
} {
    const payload = { step };
    const artifactIdentity = {
        schema_name: 'composition-stage/v1', scope_id: task.scope_id,
        organization_id: task.organization_id, case_id: task.case_ref.id,
        case_version: task.case_ref.version, producer_run_id: task.run_id,
        producer_task_id: task.task_id, input_hashes: [], payload_hash: sha256(payload),
        policy_version: task.policy_version, data_class: 'personal', retention_days: 14,
        supersedes_artifact_id: null,
    } as const;
    const artifact: ArtifactEnvelope = {
        schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(artifactIdentity)}`,
        ...artifactIdentity, payload, evaluation_state: 'accepted', created_at: '2026-08-02T06:00:00.000Z',
    };
    const evaluationBody = {
        artifact_id: artifact.artifact_id, evaluator_capability: 'artifact.critic.v1',
        independent_route: true as const,
        checks: ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'].map((name) => ({
            name: name as 'schema' | 'safety' | 'privacy' | 'grounding' | 'scope' | 'cost',
            status: 'pass' as const, evidence_codes: ['synthetic_pass'],
        })),
        decision: 'accept' as const, evaluated_at: '2026-08-02T06:00:00.000Z',
    };
    const evaluation: EvaluationReceipt = {
        schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${sha256({
            ...evaluationBody, producer_route_id: `route:producer:${step}`, evaluator_route_id: 'route:critic',
        })}`,
        ...evaluationBody,
    };
    return { artifact, evaluation, usage: { wall_ms: 1, tokens: 1, cost_micros: 1, tool_calls: 0 } };
}

describe.skipIf(!fs.existsSync(embeddedEntry))('live PostgreSQL declared composition lifecycle', () => {
    it('persists plan identity, staged dependencies, aggregate telemetry, and bounded reclaim', async () => {
        const harness = await startLivePostgres(embeddedEntry);
        const clock = new ManualClock();
        let database = harness.database;
        let verifierFailure: unknown;
        try {
            await database.query(readWorkspace('packages/persistence/src/runs/001_durable_coordination.postgres.sql'));
            await database.query(readWorkspace('packages/persistence/src/runs/002_composition_lifecycle.postgres.sql'));
            let sequence = 0;
            const ids = { next: (prefix: 'lease' | 'event') => `${prefix}:lifecycle:${++sequence}` };
            let store = new PostgresRunStore(database, clock, ids);
            const plan = declaredPlan();
            const scope = runtimeScope({ capabilities: taskSpecs.map((task) => task.capability) });
            await store.openSession({ session_id: 'session:101', scope, idempotency_key: 'session:101' });
            const runInput = {
                run_id: 'run:101', session_id: 'session:101', command_id: 'command:diagnose:101',
                case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
                idempotency_key: 'run:101:v3', plan,
            };
            const createdRun = await store.createRun(runInput);
            expect(createdRun).toMatchObject({ plan, plan_hash: sha256(plan) });
            expect(createdRun).toEqual(await store.createRun(runInput));
            await expect(store.createRun({
                ...runInput,
                plan: declaredPlan({ plan_id: 'plan:conflict:101:v2' }),
            })).rejects.toMatchObject({ code: 'idempotency_conflict' });
            await expect(database.query(
                `UPDATE hm_agent_run_plans SET plan_id='plan:forbidden:101:v2' WHERE run_id='run:101'`,
            )).rejects.toMatchObject({ code: '42501' });

            const firstTask = plannedTask(0);
            await store.enqueueTask(firstTask);
            expect(await store.enqueueTask(firstTask)).toEqual(await store.getTask(firstTask.task_id));
            expect(await store.claimTask('worker:lost', 50)).toMatchObject({ attempt: 1, reclaimed: false });
            clock.advance(51);
            database = await harness.restart();
            store = new PostgresRunStore(database, clock, ids);
            let claim = (await store.claimTask('worker:restart', 1_000))!;
            expect(claim).toMatchObject({ attempt: 2, reclaimed: true });
            await store.beginTask(claim);
            let completed = acceptedCompletion(claim.task, 1);
            await store.completeTask(claim, completed);
            expect((await store.getLineage('run:101')).run).toMatchObject({ status: 'running', terminal_at: null });

            for (let index = 1; index < taskSpecs.length; index += 1) {
                const task = plannedTask(index, [completed.artifact.artifact_id]);
                await store.enqueueTask(task);
                claim = (await store.claimTask(`worker:${index + 1}`, 1_000))!;
                await store.beginTask(claim);
                completed = acceptedCompletion(claim.task, index + 1);
                await store.completeTask(claim, completed);
            }

            const lineage = await store.getLineage('run:101');
            expect(lineage.run).toMatchObject({
                status: 'succeeded', consumed: { attempts: 5 }, plan, plan_hash: sha256(plan),
            });
            expect(lineage.tasks.map((task) => task.envelope.task_id)).toEqual(taskSpecs.map((task) => task.task_id));
            expect(await store.enqueueTask(plannedTask(3, [lineage.tasks[2]!.output_artifact_id!])))
                .toEqual(await store.getTask(taskSpecs[3]!.task_id));
            await expect(store.enqueueTask(runtimeTask({
                task_id: 'task:unknown:101', idempotency_key: 'task:unknown:101:v1',
            }))).rejects.toMatchObject({ code: 'invalid_state' });
            expect(await store.claimTask('worker:third', 1_000)).toBeNull();
        } catch (error) {
            verifierFailure = error;
        }
        try {
            await harness.cleanup();
        } catch (error) {
            verifierFailure = verifierFailure
                ? new AggregateError([verifierFailure, error], 'Lifecycle verifier and cleanup both failed')
                : error;
        }
        const cleanup = harness.cleanupEvidence();
        expect(cleanup.directory_removed).toBe(true);
        expect(cleanup.shutdowns).toHaveLength(2);
        for (const shutdown of cleanup.shutdowns) expect(shutdown.verified_remaining_pids).toEqual([]);
        if (verifierFailure) throw verifierFailure;
    }, 120_000);
});
