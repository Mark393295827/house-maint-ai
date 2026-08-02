import { describe, expect, it } from 'vitest';
import {
    AgentKernel,
    InMemoryAgentStore,
    RuntimeFault,
    sha256,
} from '../../../packages/agent-core/src/index.js';
import {
    AbortIgnoringEvaluator,
    ClockAdvancingEvaluator,
    FakeEvaluator,
    FakeHarness,
    ManualClock,
    StaticCapabilityRouter,
    runtimeBudget,
    runtimeScope,
    runtimeTask,
    successfulCapabilityResult,
} from '../../../packages/testkit/src/agent-runtime/index.js';

function runtime(options: { runBudget?: ReturnType<typeof runtimeBudget>; taskBudget?: ReturnType<typeof runtimeBudget> } = {}) {
    const clock = new ManualClock();
    const store = new InMemoryAgentStore(clock);
    const kernel = new AgentKernel(store, clock);
    kernel.openSession({ session_id: 'session:101', scope: runtimeScope(), idempotency_key: 'session:101' });
    kernel.createRun({
        run_id: 'run:101', session_id: 'session:101', command_id: 'command:diagnose:101',
        case_id: 101, case_version: 3, budget: options.runBudget ?? runtimeBudget(),
        policy_version: 'policy:v1', idempotency_key: 'run:101:v3',
    });
    kernel.enqueueTask(runtimeTask({ budget: options.taskBudget ?? runtimeBudget() }));
    return { clock, store, kernel };
}

describe('effect-free agent kernel integration', () => {
    it('routes a scoped task through an independent evaluator and records complete immutable lineage', async () => {
        const { store, kernel } = runtime();
        const harness = new FakeHarness('route:diagnosis', successfulCapabilityResult());
        const router = new StaticCapabilityRouter().register('diagnosis.structured.v1', harness);
        const evaluator = new FakeEvaluator();
        const claim = kernel.claimNext('worker:one', 1_000)!;
        const receipt = await kernel.executeClaim(claim, router, evaluator);

        expect(receipt).toMatchObject({ state: 'succeeded', attempt: 1, duplicate: false, error_code: null });
        const lineage = store.getLineage('run:101');
        expect(lineage.run).toMatchObject({ status: 'succeeded', consumed: { attempts: 1, tokens: 120 } });
        expect(lineage.artifacts).toHaveLength(1);
        expect(lineage.artifacts[0]).toMatchObject({
            payload_hash: sha256({ diagnosis: 'fixture leak' }), evaluation_state: 'accepted',
            producer_run_id: 'run:101', producer_task_id: 'task:diagnosis:101', scope_id: 'scope:case:101',
        });
        expect(lineage.evaluations[0]).toMatchObject({ decision: 'accept', independent_route: true });
        expect(lineage.events.map((event) => event.sequence)).toEqual(
            lineage.events.map((_, index) => index + 1),
        );
        expect(lineage.events.map((event) => event.type)).toEqual(expect.arrayContaining([
            'session.created', 'run.created', 'task.enqueued', 'task.claimed', 'task.started',
            'capability.routed', 'budget.charged', 'artifact.recorded', 'evaluation.recorded',
            'task.succeeded', 'run.status_changed',
        ]));
        expect(harness.invocations[0]).toMatchObject({ tool_count: 0, scope_id: 'scope:case:101' });

        const external = store.getArtifact(lineage.artifacts[0].artifact_id)!;
        external.payload.diagnosis = 'mutated';
        expect(store.getArtifact(external.artifact_id)?.payload).toEqual({ diagnosis: 'fixture leak' });
    });

    it('charges capability and evaluator elapsed wall time to both task and run', async () => {
        const { clock, store, kernel } = runtime();
        const harness = new FakeHarness('route:diagnosis', () => {
            clock.advance(30);
            const result = successfulCapabilityResult();
            return { ...result, usage: { ...result.usage, wall_ms: 80 } };
        });
        const evaluator = new ClockAdvancingEvaluator(clock, 40);
        const receipt = await kernel.executeClaim(
            kernel.claimNext('worker:one', 1_000)!,
            new StaticCapabilityRouter().register('diagnosis.structured.v1', harness),
            evaluator,
        );

        expect(receipt).toMatchObject({ state: 'succeeded', error_code: null });
        const lineage = store.getLineage('run:101');
        expect(lineage.tasks[0].consumed.wall_ms).toBe(120);
        expect(lineage.run.consumed.wall_ms).toBe(120);
        expect(lineage.events.find((event) => event.type === 'budget.charged')?.details)
            .toMatchObject({ usage: { wall_ms: 120 } });
    });

    it('deduplicates enqueue, active claims, and completion without re-invoking the harness', async () => {
        const { store, kernel } = runtime();
        const harness = new FakeHarness('route:diagnosis', successfulCapabilityResult());
        const router = new StaticCapabilityRouter().register('diagnosis.structured.v1', harness);
        const evaluator = new FakeEvaluator();
        expect(kernel.enqueueTask(runtimeTask()).attempts).toBe(0);
        const claim = kernel.claimNext('worker:one', 1_000)!;
        expect(kernel.claimNext('worker:two', 1_000)).toBeNull();
        const first = await kernel.executeClaim(claim, router, evaluator);
        const duplicate = await kernel.executeClaim(claim, router, evaluator);
        expect(duplicate).toEqual({ ...first, duplicate: true });
        expect(harness.invocations).toHaveLength(1);
        expect(evaluator.invocations).toHaveLength(1);
        expect(store.getLineage('run:101').artifacts).toHaveLength(1);
    });

    it('recovers an expired lease from a snapshot and allows exactly one bounded reclaim', async () => {
        const { clock, store, kernel } = runtime();
        const first = kernel.claimNext('worker:lost', 50)!;
        expect(first).toMatchObject({ attempt: 1, reclaimed: false });
        const checkpoint = store.snapshot();
        clock.advance(51);

        const restoredStore = InMemoryAgentStore.restore(checkpoint, clock);
        const restoredKernel = new AgentKernel(restoredStore, clock);
        const second = restoredKernel.claimNext('worker:recovery', 1_000)!;
        expect(second).toMatchObject({ attempt: 2, reclaimed: true });
        const harness = new FakeHarness('route:diagnosis', successfulCapabilityResult());
        const receipt = await restoredKernel.executeClaim(
            second,
            new StaticCapabilityRouter().register('diagnosis.structured.v1', harness),
            new FakeEvaluator(),
        );
        expect(receipt.state).toBe('succeeded');
        const lineage = restoredStore.getLineage('run:101');
        expect(lineage.tasks[0].claim_history.map((claim) => claim.worker_id)).toEqual(['worker:lost', 'worker:recovery']);
        expect(lineage.events.filter((event) => event.type === 'lease.expired')).toHaveLength(1);
        expect(restoredKernel.claimNext('worker:third', 1_000)).toBeNull();
    });

    it('delivers cancellation idempotently to an in-flight fake harness', async () => {
        const { store, kernel } = runtime();
        const harness = new FakeHarness('route:diagnosis', (request) => new Promise((_, reject) => {
            request.signal.addEventListener('abort', () => reject(new RuntimeFault('cancelled', 'aborted')), { once: true });
        }));
        const claim = kernel.claimNext('worker:one', 2_000)!;
        const executing = kernel.executeClaim(
            claim,
            new StaticCapabilityRouter().register('diagnosis.structured.v1', harness),
            new FakeEvaluator(),
        );
        const signal = {
            schema: 'cancellation-signal/v1' as const, signal_id: 'signal:user:101', run_id: 'run:101',
            requested_by_principal_id: 'principal:resident:9', reason_code: 'user_requested' as const,
            requested_at: '2026-08-02T06:00:00.000Z',
        };
        expect(kernel.cancel(signal)).toEqual(kernel.cancel(signal));
        expect(await executing).toMatchObject({ state: 'cancelled', error_code: 'cancelled', duplicate: true });
        const lineage = store.getLineage('run:101');
        expect(lineage.run.status).toBe('cancelled');
        expect(lineage.cancellations).toHaveLength(1);
        expect(lineage.events.filter((event) => event.type === 'signal.recorded')).toHaveLength(1);
    });

    it('delivers cancellation while an abort-ignoring evaluator is pending', async () => {
        const { store, kernel } = runtime();
        const evaluator = new AbortIgnoringEvaluator();
        const executing = kernel.executeClaim(
            kernel.claimNext('worker:one', 1_000)!,
            new StaticCapabilityRouter().register(
                'diagnosis.structured.v1',
                new FakeHarness('route:diagnosis', successfulCapabilityResult()),
            ),
            evaluator,
        );
        for (let turn = 0; turn < 10 && evaluator.pendingCount === 0; turn += 1) await Promise.resolve();
        expect(evaluator.pendingCount).toBe(1);

        kernel.cancel({
            schema: 'cancellation-signal/v1', signal_id: 'signal:user:evaluator', run_id: 'run:101',
            requested_by_principal_id: 'principal:resident:9', reason_code: 'user_requested',
            requested_at: '2026-08-02T06:00:00.000Z',
        });
        expect(await executing).toMatchObject({ state: 'cancelled', error_code: 'cancelled', duplicate: true });
        expect(evaluator.observedSignals[0].aborted).toBe(true);
        const terminalSnapshot = store.snapshot();
        evaluator.acceptNext();
        await Promise.resolve();
        expect(store.snapshot()).toEqual(terminalSnapshot);
    });

    it('hard-stops before evaluation when reported usage exceeds a finite budget', async () => {
        const budget = runtimeBudget({ tokens: 100 });
        const { store, kernel } = runtime({ runBudget: budget, taskBudget: budget });
        const result = successfulCapabilityResult();
        const harness = new FakeHarness('route:diagnosis', { ...result, usage: { ...result.usage, tokens: 101 } });
        const evaluator = new FakeEvaluator();
        const receipt = await kernel.executeClaim(
            kernel.claimNext('worker:one', 1_000)!,
            new StaticCapabilityRouter().register('diagnosis.structured.v1', harness), evaluator,
        );
        expect(receipt).toMatchObject({ state: 'failed', error_code: 'budget_exceeded' });
        expect(evaluator.invocations).toHaveLength(0);
        expect(store.getLineage('run:101')).toMatchObject({ run: { status: 'failed' }, artifacts: [] });
    });

    it('caps unavailable-route retries at two attempts', async () => {
        const { store, kernel } = runtime();
        const router = new StaticCapabilityRouter();
        const evaluator = new FakeEvaluator();
        const first = await kernel.executeClaim(kernel.claimNext('worker:one', 1_000)!, router, evaluator);
        expect(first).toMatchObject({ state: 'retry_wait', error_code: 'capability_unavailable', attempt: 1 });
        const second = await kernel.executeClaim(kernel.claimNext('worker:two', 1_000)!, router, evaluator);
        expect(second).toMatchObject({ state: 'failed', error_code: 'capability_unavailable', attempt: 2 });
        expect(store.getRun('run:101')).toMatchObject({ status: 'failed', consumed: { attempts: 2 } });
        expect(kernel.claimNext('worker:three', 1_000)).toBeNull();
    });

    it('records malformed and non-independent artifacts as rejected evidence', async () => {
        const malformed = successfulCapabilityResult({ provider: 'forbidden-fixture' });
        const firstRuntime = runtime();
        const malformedHarness = new FakeHarness('route:diagnosis', malformed, malformed);
        const malformedRouter = new StaticCapabilityRouter().register('diagnosis.structured.v1', malformedHarness);
        const evaluator = new FakeEvaluator();
        expect(await firstRuntime.kernel.executeClaim(firstRuntime.kernel.claimNext('worker:one', 1_000)!, malformedRouter, evaluator))
            .toMatchObject({ state: 'retry_wait', error_code: 'invalid_artifact' });
        expect(await firstRuntime.kernel.executeClaim(firstRuntime.kernel.claimNext('worker:two', 1_000)!, malformedRouter, evaluator))
            .toMatchObject({ state: 'failed', error_code: 'invalid_artifact' });
        expect(firstRuntime.store.getLineage('run:101').artifacts).toHaveLength(0);
        expect(evaluator.invocations).toHaveLength(0);

        const secondRuntime = runtime();
        const route = 'route:shared';
        const sharedHarness = new FakeHarness(route, successfulCapabilityResult());
        const receipt = await secondRuntime.kernel.executeClaim(
            secondRuntime.kernel.claimNext('worker:one', 1_000)!,
            new StaticCapabilityRouter().register('diagnosis.structured.v1', sharedHarness),
            new FakeEvaluator(route),
        );
        expect(receipt).toMatchObject({ state: 'retry_wait', error_code: 'evaluation_rejected' });
        expect(secondRuntime.store.getLineage('run:101')).toMatchObject({
            artifacts: [{ evaluation_state: 'rejected' }], evaluations: [{ independent_route: false }],
        });
    });

    it('terminates a non-returning harness at the wall-time boundary', async () => {
        const budget = runtimeBudget({ wall_ms: 100 });
        const { kernel } = runtime({ runBudget: budget, taskBudget: budget });
        const harness = new FakeHarness('route:diagnosis', () => new Promise(() => undefined));
        const startedAt = Date.now();
        const receipt = await kernel.executeClaim(
            kernel.claimNext('worker:one', 1_000)!,
            new StaticCapabilityRouter().register('diagnosis.structured.v1', harness),
            new FakeEvaluator(),
        );
        expect(receipt).toMatchObject({ state: 'failed', error_code: 'budget_exceeded' });
        expect(Date.now() - startedAt).toBeLessThan(1_000);
    });

    it('bounds an abort-ignoring evaluator and consumes a late rejection without mutation', async () => {
        const budget = runtimeBudget({ wall_ms: 100 });
        const { store, kernel } = runtime({ runBudget: budget, taskBudget: budget });
        const evaluator = new AbortIgnoringEvaluator();
        const startedAt = Date.now();
        const receipt = await kernel.executeClaim(
            kernel.claimNext('worker:one', 1_000)!,
            new StaticCapabilityRouter().register(
                'diagnosis.structured.v1',
                new FakeHarness('route:diagnosis', successfulCapabilityResult()),
            ),
            evaluator,
        );

        expect(receipt).toMatchObject({ state: 'failed', error_code: 'budget_exceeded' });
        expect(Date.now() - startedAt).toBeLessThan(1_000);
        expect(evaluator).toMatchObject({ pendingCount: 1 });
        expect(evaluator.observedSignals[0].aborted).toBe(true);
        expect(store.getLineage('run:101')).toMatchObject({
            run: { status: 'failed', consumed: { wall_ms: 101 } },
            tasks: [{ state: 'failed', consumed: { wall_ms: 101 } }],
            artifacts: [],
            evaluations: [],
        });

        const terminalSnapshot = store.snapshot();
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => unhandled.push(reason);
        process.on('unhandledRejection', onUnhandled);
        try {
            evaluator.rejectNext(new Error('late evaluator rejection'));
            await new Promise<void>((resolve) => setImmediate(resolve));
            expect(unhandled).toEqual([]);
            expect(store.snapshot()).toEqual(terminalSnapshot);
        } finally {
            process.off('unhandledRejection', onUnhandled);
        }
    });
});
