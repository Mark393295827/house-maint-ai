import { createHash, randomUUID } from 'node:crypto';
import { RuntimeFault } from '@house-maint/agent-core';
import type { CancellationSignal, RunStore, DurableTaskClaim } from '@house-maint/persistence/runs';
import type { OutboxClaim, OutboxStore } from '@house-maint/persistence/outbox';
import type { ScopedRunObserver } from '@house-maint/observability/runs';
import { EffectGate } from './effect-gate.js';
import type { ArtifactCapabilityPort, CapabilityExecution, CapabilityUsage, RealtimeTarget, SyntheticDeliveryPort, WorkerClock } from './ports.js';
import type { ArtifactEnvelope } from '@house-maint/contracts';
import { ScopedRealtimePublisher } from './scoped-realtime.js';

export interface WorkerOptions {
    task_lease_ms: number;
    delivery_lease_ms: number;
    retry_delay_ms: number;
}

export interface DrainReceipt {
    completed: number;
    cancelled: number;
    bounded: true;
}

interface ActiveWork {
    kind: 'task' | 'delivery';
    run_id: string | null;
    controller: AbortController;
    promise: Promise<unknown>;
}

function classifyFailure(error: unknown): { readonly code: string; readonly retryable: boolean } {
    if (error instanceof RuntimeFault) return { code: error.code, retryable: error.retryable };
    if (error && typeof error === 'object') {
        const candidate = error as { code?: unknown; retryable?: unknown };
        const code = typeof candidate.code === 'string' ? candidate.code : 'temporarily_unavailable';
        const deterministic = new Set([
            'invalid_artifact', 'scope_mismatch', 'budget_exceeded', 'idempotency_conflict',
            'invalid_state', 'capability_unavailable', 'evaluation_rejected', 'invalid_claim', 'cancelled',
        ]);
        return {
            code,
            retryable: typeof candidate.retryable === 'boolean' ? candidate.retryable : !deterministic.has(code),
        };
    }
    return { code: 'temporarily_unavailable', retryable: true };
}

function addUsage(left: CapabilityUsage, right: CapabilityUsage | undefined, elapsedMs: number): CapabilityUsage {
    const evaluator = right ?? { wall_ms: 0, tokens: 0, cost_micros: 0, tool_calls: 0 };
    return {
        wall_ms: Math.max(left.wall_ms + evaluator.wall_ms, elapsedMs),
        tokens: left.tokens + evaluator.tokens,
        cost_micros: left.cost_micros + evaluator.cost_micros,
        tool_calls: left.tool_calls + evaluator.tool_calls,
    };
}

export class DurableCoordinationWorker {
    private accepting = true;
    private readonly active = new Map<string, ActiveWork>();

    constructor(
        private readonly runs: RunStore,
        private readonly outbox: OutboxStore,
        private readonly capability: ArtifactCapabilityPort,
        private readonly gate: EffectGate,
        private readonly delivery: SyntheticDeliveryPort,
        private readonly realtime: ScopedRealtimePublisher,
        private readonly observer: ScopedRunObserver,
        private readonly clock: WorkerClock,
        private readonly options: WorkerOptions,
    ) {
        for (const value of Object.values(options)) {
            if (!Number.isInteger(value) || value < 1 || value > 300_000) throw new Error('Worker bounds are invalid');
        }
    }

    async runTaskOnce(workerId: string, target: RealtimeTarget): Promise<boolean> {
        if (!this.accepting) return false;
        const claim = await this.runs.claimTask(workerId, this.options.task_lease_ms);
        if (!claim) return false;
        const controller = new AbortController();
        const operation = this.executeTask(claim, target, controller);
        this.active.set(`task:${claim.task_id}`, { kind: 'task', run_id: claim.run_id, controller, promise: operation });
        try { await operation; } finally { this.active.delete(`task:${claim.task_id}`); }
        return true;
    }

    async runOutboxOnce(workerId: string): Promise<boolean> {
        if (!this.accepting) return false;
        const claim = await this.outbox.claim(workerId, this.options.delivery_lease_ms);
        if (!claim) return false;
        const controller = new AbortController();
        const operation = this.executeDelivery(claim, controller);
        this.active.set(`delivery:${claim.delivery_id}`, {
            kind: 'delivery', run_id: claim.entry.run_id, controller, promise: operation,
        });
        try { await operation; } finally { this.active.delete(`delivery:${claim.delivery_id}`); }
        return true;
    }

    async cancel(signal: CancellationSignal): Promise<void> {
        await this.runs.cancelRun(signal);
        for (const item of this.active.values()) if (item.run_id === signal.run_id) item.controller.abort();
    }

    async drain(graceMs: number): Promise<DrainReceipt> {
        if (!Number.isInteger(graceMs) || graceMs < 1 || graceMs > 300_000) throw new Error('Drain grace must be finite');
        this.accepting = false;
        const initial = [...this.active.values()];
        const finished = await this.waitBounded(initial.map((item) => item.promise), graceMs);
        if (finished) return { completed: initial.length, cancelled: 0, bounded: true };
        const runIds = new Set(initial.flatMap((item) => item.run_id ? [item.run_id] : []));
        for (const runId of runIds) {
            await this.runs.cancelRun({
                schema: 'cancellation-signal/v1', signal_id: `signal:shutdown:${randomUUID()}`,
                run_id: runId, requested_by_principal_id: 'system:durable-worker',
                reason_code: 'shutdown', requested_at: this.clock.now().toISOString(),
            });
        }
        for (const item of initial) item.controller.abort();
        await this.waitBounded(initial.map((item) => item.promise), Math.min(graceMs, 1_000));
        return { completed: initial.length - this.active.size, cancelled: this.active.size || initial.length, bounded: true };
    }

    private async executeTask(claim: DurableTaskClaim, target: RealtimeTarget, controller: AbortController): Promise<void> {
        const started = this.clock.now().getTime();
        try {
            if (target.organization_id !== claim.task.organization_id
                || target.case_id !== claim.task.case_ref.id
                || target.scope_id !== `case:${claim.task.case_ref.id}`
                || target.principal_ids.length === 0
                || target.principal_ids.some((principalId) => !principalId)) {
                throw new RuntimeFault('scope_mismatch', 'Realtime target is outside the task case scope');
            }
            await this.runs.beginTask(claim);
            const lineage = this.capability.executeWithContext
                ? await this.runs.getLineage(claim.run_id)
                : null;
            const inputArtifacts: ArtifactEnvelope[] = lineage
                ? claim.task.input_artifact_ids.flatMap((id) => {
                    const produced = lineage.artifacts.find((artifact) => artifact.artifact_id === id);
                    const external = lineage.external_inputs.find((input) => input.artifact.artifact_id === id)?.artifact;
                    return produced ? [produced] : external ? [external] : [];
                })
                : [];
            if (this.capability.executeWithContext && inputArtifacts.length !== claim.task.input_artifact_ids.length) {
                throw Object.assign(new Error('Task input artifact lineage is incomplete'), { code: 'invalid_artifact' });
            }
            const completion = lineage && this.capability.executeWithContext
                ? await this.capability.executeWithContext({
                    task: claim.task, scope: lineage.session.scope,
                    input_artifacts: inputArtifacts, signal: controller.signal,
                })
                : await this.capability.execute({ task: claim.task, signal: controller.signal });
            const evaluatorUsage = completion.evaluation_usage;
            const charged: CapabilityExecution = {
                ...completion,
                usage: addUsage(completion.usage, evaluatorUsage, Math.max(0, this.clock.now().getTime() - started)),
            };
            const task = await this.runs.completeTask(claim, charged);
            const latest = await this.runs.getLineage(claim.run_id);
            const total = latest.run.plan?.tasks.length ?? Math.max(1, latest.tasks.length);
            const succeeded = latest.tasks.filter((item) => item.state === 'succeeded').length;
            const progressPercent = Math.min(100, Math.max(0, Math.trunc((succeeded / total) * 100)));
            const final = latest.run.status === 'succeeded';
            const stage = claim.task.capability.includes('diagnosis') ? 'diagnosis'
                : claim.task.capability.includes('next-action') ? 'verification' : 'resolution';
            await this.realtime.publish(target, {
                schema: 'case-progress/v1', organization_id: claim.task.organization_id,
                case_id: claim.task.case_ref.id, case_version: claim.task.case_ref.version,
                stage,
                run: { run_id: claim.run_id, status: final ? 'completed' : 'working', progress_percent: progressPercent },
                next_action: { kind: 'review_plan', display: { zh_cn: '请审阅方案', en_us: 'Review the plan' }, artifact_id: task.output_artifact_id },
                updated_at: this.clock.now().toISOString(),
            });
            await this.observer.record({
                schema: 'run-observation/v1', event_id: `observation:${randomUUID()}`,
                organization_id: claim.task.organization_id, scope_id: claim.task.scope_id,
                case_id: claim.task.case_ref.id, run_id: claim.run_id, task_id: claim.task_id,
                event_type: 'task.completed', outcome: 'accepted', reason_code: 'evaluated_artifact',
                occurred_at: this.clock.now().toISOString(),
                metrics: { wall_ms: Math.max(0, this.clock.now().getTime() - started), attempts: claim.attempt },
            }, { organization_id: claim.task.organization_id, scope_id: claim.task.scope_id, case_id: claim.task.case_ref.id });
        } catch (error) {
            const failure = classifyFailure(error);
            const code = controller.signal.aborted ? 'cancelled' : failure.code;
            await this.runs.failTask(claim, code, !controller.signal.aborted && failure.retryable,
                new Date(this.clock.now().getTime() + this.options.retry_delay_ms).toISOString());
        }
    }

    private async executeDelivery(claim: OutboxClaim, controller: AbortController): Promise<void> {
        const entry = await this.outbox.beginDelivery(claim);
        const decision = await this.gate.revalidate(entry);
        if (!decision.allowed) {
            await this.outbox.cancel(claim, decision.code);
            return;
        }
        try {
            const result = await this.delivery.deliver({
                idempotency_key: claim.delivery_id, effect_kind: entry.effect_kind,
                envelope: entry.envelope, signal: controller.signal,
            });
            await this.outbox.recordDelivery(claim, {
                schema: 'delivery-receipt/v1', delivery_id: claim.delivery_id,
                attempt: claim.attempt, status: result.status,
                external_reference_hash: result.external_reference_hash,
                reason_code: result.reason_code, recorded_at: this.clock.now().toISOString(),
            }, new Date(this.clock.now().getTime() + this.options.retry_delay_ms).toISOString());
        } catch (error) {
            const failure = classifyFailure(error);
            const reason = controller.signal.aborted ? 'shutdown' : failure.code;
            await this.outbox.recordDelivery(claim, {
                schema: 'delivery-receipt/v1', delivery_id: claim.delivery_id,
                attempt: claim.attempt,
                status: controller.signal.aborted || failure.retryable ? 'retryable_failure' : 'permanent_failure',
                external_reference_hash: null,
                reason_code: reason, recorded_at: this.clock.now().toISOString(),
            }, new Date(this.clock.now().getTime() + this.options.retry_delay_ms).toISOString());
        }
    }

    private waitBounded(promises: Promise<unknown>[], ms: number): Promise<boolean> {
        if (!promises.length) return Promise.resolve(true);
        return new Promise((resolve) => {
            let settled = false;
            const timer = setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, ms);
            Promise.allSettled(promises).then(() => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(true);
            });
        });
    }
}

export function deliveryReferenceHash(reference: string): string {
    return createHash('sha256').update(reference).digest('hex');
}
