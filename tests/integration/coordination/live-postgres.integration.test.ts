import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { EffectiveScope } from '@house-maint/contracts';
import { CaseCommandService, replayCaseEvents } from '../../../packages/domain/src/index.js';
import { PostgresCaseCommandRepository } from '../../../packages/persistence/src/cases/index.js';
import { PostgresRunStore } from '../../../packages/persistence/src/runs/index.js';
import { PostgresOutboxStore, type EffectIntent } from '../../../packages/persistence/src/outbox/index.js';
import { MemoryRunObservationSink, ScopedRunObserver } from '../../../packages/observability/src/runs/index.js';
import {
    DurableCoordinationWorker,
    EffectGate,
    ScopedRealtimePublisher,
    deliveryReferenceHash,
    type ArtifactCapabilityPort,
    type DecisionSnapshotPort,
    type RealtimePort,
    type SyntheticDeliveryPort,
} from '../../../apps/worker/src/index.js';
import {
    DEFAULT_EMBEDDED_ENTRY,
    readWorkspace,
    startLivePostgres,
} from './live-postgres-harness.js';

const embeddedEntry = process.env.HOUSE_MAINT_EMBEDDED_POSTGRES_ENTRY ?? DEFAULT_EMBEDDED_ENTRY;
const liveAvailable = fs.existsSync(embeddedEntry);
const clock = { now: () => new Date() };
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');

function scope(caseId?: number): EffectiveScope {
    const now = Date.now();
    return {
        schema: 'effective-scope/v1', scope_id: caseId ? `case:${caseId}` : 'organization:1',
        scope_kind: caseId ? 'case' : 'organization', organization_id: 1,
        ...(caseId ? { case_id: caseId } : {}),
        principal: {
            principal_id: 'system:g7-live', actor_kind: 'system', organization_id: 1,
            role: 'system', authenticated_at: new Date(now - 1_000).toISOString(),
        },
        actions: ['read', 'contribute', 'manage', 'message', 'dispatch', 'verify'],
        data_classes: ['internal', 'personal'],
        capabilities: ['maintenance.diagnose-and-plan.v1'], tool_grants: [],
        purposes: ['maintenance diagnosis'], region: 'cn-south', retention_days: 30,
        policy_version: 'policy-live-v1', resolved_at: new Date(now - 1_000).toISOString(),
        expires_at: new Date(now + 3_600_000).toISOString(),
    };
}

function command(input: {
    id: string;
    key: string;
    expected: number;
    caseId?: number;
    body: Record<string, unknown>;
}) {
    return {
        schema: 'case-command/v1', command_id: input.id, organization_id: 1,
        ...(input.caseId ? { case_id: input.caseId } : {}),
        expected_version: input.expected, idempotency_key: input.key,
        correlation_id: `corr:${input.id}`, body: input.body,
        requested_at: new Date().toISOString(),
    };
}

describe.skipIf(!liveAvailable)('live PostgreSQL reconstruction and coordination proofs', () => {
    it('runs migrations, concurrency, trigger, committed replay, and durable restart proofs', async () => {
        const harness = await startLivePostgres(embeddedEntry);
        let database = harness.database;
        let stage = 'migration_setup';
        let verifierFailure: Error | null = null;
        try {
            await database.query('CREATE TABLE users (id SERIAL PRIMARY KEY)');
            await database.query('CREATE TABLE reports (id SERIAL PRIMARY KEY)');
            await database.query(readWorkspace('server/db/migrations/postgres/006_organization_case_foundation.sql'));
            await database.query(readWorkspace('server/db/migrations/reconstruction/001_canonical_case_authority.postgres.sql'));
            await database.query(readWorkspace('packages/persistence/src/runs/000_case_event_reducer_v2_compat.postgres.sql'));
            await database.query(readWorkspace('packages/persistence/src/runs/001_durable_coordination.postgres.sql'));
            await database.query(readWorkspace('packages/persistence/src/outbox/001_transactional_outbox.postgres.sql'));
            await database.query(`INSERT INTO organizations (id,slug,name) VALUES (1,'g7-synthetic','G7 Synthetic')`);

            const migrated = await database.query<{ name: string }>(`
                SELECT table_name AS name FROM information_schema.tables
                 WHERE table_schema=current_schema()
                   AND table_name IN ('maintenance_cases','case_events','case_command_receipts',
                       'hm_agent_sessions','hm_agent_runs','hm_agent_tasks','hm_outbox','hm_delivery_receipts')
                 ORDER BY table_name`);
            expect(migrated.rows).toHaveLength(8);

            stage = 'domain_open';
            const caseService = new CaseCommandService(new PostgresCaseCommandRepository(database), () => new Date().toISOString());
            const opened = await caseService.execute({
                scope: scope(),
                command: command({
                    id: 'open-live', key: 'open-live', expected: 0,
                    body: { type: 'open_case', payload: {
                        title: 'Synthetic leak', description: 'Synthetic water leak evidence only',
                        priority: 'normal', evidence: [],
                    } },
                }),
            });
            const caseId = opened.projection.id;

            // Mandatory proof 1: two real connections race with the same expected version.
            stage = 'expected_version_conflict';
            const competing = [
                command({ id: 'update-left', key: 'update-left', expected: 1, caseId,
                    body: { type: 'update_case', payload: { title: 'Synthetic left winner' } } }),
                command({ id: 'update-right', key: 'update-right', expected: 1, caseId,
                    body: { type: 'update_case', payload: { title: 'Synthetic right winner' } } }),
            ];
            const conflict = await Promise.allSettled(competing.map((value) => caseService.execute({ command: value, scope: scope() })));
            expect(conflict.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
            expect(conflict.filter((result) => result.status === 'rejected')).toHaveLength(1);
            expect((conflict.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason.code)
                .toBe('version_conflict');

            // Mandatory proof 2: two connections with the exact same key converge.
            stage = 'same_key_convergence';
            const same = command({ id: 'same-key', key: 'same-key-live', expected: 2, caseId,
                body: { type: 'update_case', payload: { priority: 'urgent' } } });
            const converged = await Promise.all([
                caseService.execute({ command: same, scope: scope() }),
                caseService.execute({ command: same, scope: scope() }),
            ]);
            expect(converged.map((result) => result.replayed).sort()).toEqual([false, true]);
            expect(new Set(converged.map((result) => result.event.event_id)).size).toBe(1);
            expect((await database.query<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM case_command_receipts
                  WHERE organization_id=1 AND idempotency_key='same-key-live'`,
            )).rows[0]?.count).toBe('1');

            // Mandatory proof 3: canonical trigger denies an unowned mutation.
            stage = 'trigger_denial';
            const denied = await Promise.allSettled([
                database.query(`UPDATE maintenance_cases SET title='forbidden' WHERE organization_id=1 AND id=$1`, [caseId]),
            ]);
            expect(denied[0]?.status).toBe('rejected');
            expect((denied[0] as PromiseRejectedResult).reason.code).toBe('42501');

            const current = await caseService.getCase(scope(), caseId);
            expect(current.version).toBe(3);
            stage = 'durable_restart_setup';
            const caseScope = scope(caseId);
            const runtime = new PostgresRunStore(database);
            await runtime.openSession({ session_id: 'session:restart', scope: caseScope, idempotency_key: 'session-restart' });
            await runtime.createRun({
                run_id: 'run:restart', session_id: 'session:restart', command_id: 'same-key',
                case_id: caseId, case_version: current.version,
                budget: { attempts: 2, wall_ms: 30_000, tokens: 2_000, cost_micros: 50_000, tool_calls: 0 },
                policy_version: caseScope.policy_version, idempotency_key: 'run-restart',
            });
            const taskEnvelope = {
                schema: 'agent-task/v1' as const, run_id: 'run:restart', task_id: 'task:restart',
                scope_id: caseScope.scope_id, organization_id: 1,
                case_ref: { id: caseId, version: current.version },
                capability: 'maintenance.diagnose-and-plan.v1', input_artifact_ids: [],
                budget: { attempts: 2, wall_ms: 20_000, tokens: 1_000, cost_micros: 25_000, tool_calls: 0 },
                policy_version: caseScope.policy_version, idempotency_key: 'task-restart',
                expires_at: new Date(Date.now() + 3_600_000).toISOString(),
            };
            const firstTask = await runtime.enqueueTask(taskEnvelope);
            const duplicateTask = await runtime.enqueueTask(taskEnvelope);
            expect(duplicateTask.envelope.task_id).toBe(firstTask.envelope.task_id);
            expect((await database.query<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM hm_agent_tasks WHERE task_id='task:restart'`,
            )).rows[0]?.count).toBe('1');
            const abandonedTaskClaim = await runtime.claimTask('worker:before-restart', 150);
            expect(abandonedTaskClaim?.reclaimed).toBe(false);

            const outbox = new PostgresOutboxStore(database);
            const baseIntent: EffectIntent = {
                effect_key: `assignment:${caseId}:${current.version}`,
                effect_kind: 'assignment', run_id: 'run:restart', scope_id: caseScope.scope_id,
                policy_version: caseScope.policy_version, action: 'dispatch', proposal_hash: hash('assignment-proposal'),
                max_attempts: 3,
                envelope: {
                    schema: 'delivery/v1', delivery_id: 'delivery:assignment', organization_id: 1,
                    case_id: caseId, case_version: current.version, destination_binding_id: 'binding:worker-1',
                    channel: 'worker_portal', payload_artifact_id: 'artifact:assignment-proposal',
                    required_approval_id: null, correlation_id: 'corr:assignment',
                    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
                },
            };
            const insertedEffect = await outbox.enqueue(baseIntent);
            const duplicateEffect = await outbox.enqueue(baseIntent);
            expect(insertedEffect.duplicate).toBe(false);
            expect(duplicateEffect.duplicate).toBe(true);
            const ingress = {
                source: 'webhook' as const, idempotency_key: 'webhook:synthetic:1',
                payload_hash: hash('synthetic-webhook'), result_ref: 'delivery:assignment',
                recorded_at: new Date().toISOString(),
            };
            expect((await outbox.recordIngress(ingress)).duplicate).toBe(false);
            expect((await outbox.recordIngress(ingress)).duplicate).toBe(true);
            const abandonedDeliveryClaim = await outbox.claim('delivery:before-restart', 150);
            expect(abandonedDeliveryClaim?.reclaimed).toBe(false);

            // Mandatory proof 4 plus runtime/outbox proof: committed state survives a real server stop/start.
            stage = 'postgres_stop';
            await harness.stop();
            stage = 'postgres_restart';
            database = await harness.restart();
            stage = 'committed_case_replay';
            const restartedCases = new CaseCommandService(new PostgresCaseCommandRepository(database), () => new Date().toISOString());
            const replayed = await restartedCases.execute({ command: same, scope: scope() });
            expect(replayed.replayed).toBe(true);
            expect(replayed.projection.version).toBe(3);
            expect(replayCaseEvents(await restartedCases.getTimeline(scope(), caseId))).toEqual(replayed.projection);

            const restartedRuntime = new PostgresRunStore(database);
            const restartedOutbox = new PostgresOutboxStore(database);
            const observations = new MemoryRunObservationSink();
            const realtimeEvents: unknown[] = [];
            const realtimePort: RealtimePort = {
                publish: async (target, progress) => { realtimeEvents.push({ target, progress }); },
            };
            const capabilityInputs: string[][] = [];
            const capability: ArtifactCapabilityPort = {
                execute: async (input) => {
                    capabilityInputs.push(Object.keys(input).sort());
                    const payload = { summary: { zh_cn: '合成方案', en_us: 'Synthetic plan' } };
                    const payloadHash = hash(JSON.stringify(payload));
                    return {
                        artifact: {
                            schema: 'agent-artifact/v1', artifact_id: `artifact:${input.task.task_id}`,
                            schema_name: 'maintenance-plan/v1', scope_id: input.task.scope_id,
                            organization_id: input.task.organization_id, case_id: input.task.case_ref.id,
                            case_version: input.task.case_ref.version, producer_run_id: input.task.run_id,
                            producer_task_id: input.task.task_id, input_hashes: [], payload_hash: payloadHash,
                            payload, policy_version: input.task.policy_version, data_class: 'internal',
                            retention_days: 30, evaluation_state: 'accepted', supersedes_artifact_id: null,
                            created_at: new Date().toISOString(),
                        },
                        evaluation: {
                            schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${input.task.task_id}`,
                            artifact_id: `artifact:${input.task.task_id}`,
                            evaluator_capability: 'maintenance.critic.independent.v1', independent_route: true,
                            checks: ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'].map((name) => ({
                                name: name as 'schema' | 'safety' | 'privacy' | 'grounding' | 'scope' | 'cost',
                                status: 'pass' as const, evidence_codes: ['synthetic_pass'],
                            })),
                            decision: 'accept', evaluated_at: new Date().toISOString(),
                        },
                        usage: { wall_ms: 1, tokens: 10, cost_micros: 10, tool_calls: 0 },
                    };
                },
            };
            const delivered = new Set<string>();
            const deliveryCalls: string[] = [];
            const fakeDelivery: SyntheticDeliveryPort = {
                deliver: async ({ idempotency_key }) => {
                    deliveryCalls.push(idempotency_key);
                    delivered.add(idempotency_key);
                    return { status: 'delivered', external_reference_hash: deliveryReferenceHash(`fake:${idempotency_key}`), reason_code: 'synthetic_delivered' };
                },
            };
            const decisions: DecisionSnapshotPort = {
                load: async (intent) => ({
                    organization_id: 1, scope_id: caseScope.scope_id, case_id: caseId,
                    case_version: current.version, policy_version: caseScope.policy_version,
                    decision_valid: true, delivery_kill_switch: false,
                    destination: {
                        binding_id: intent.envelope.destination_binding_id, organization_id: 1,
                        scope_id: caseScope.scope_id, case_id: caseId, active: true,
                    },
                }),
            };
            const worker = new DurableCoordinationWorker(
                restartedRuntime, restartedOutbox, capability, new EffectGate(decisions, clock),
                fakeDelivery, new ScopedRealtimePublisher(realtimePort),
                new ScopedRunObserver(observations), clock,
                { task_lease_ms: 2_000, delivery_lease_ms: 2_000, retry_delay_ms: 1 },
            );
            stage = 'runtime_lease_reclaim';
            expect(await worker.runTaskOnce('worker:after-restart', {
                organization_id: 1, scope_id: caseScope.scope_id, case_id: caseId,
                principal_ids: ['system:g7-live'],
            })).toBe(true);
            expect(capabilityInputs).toEqual([['signal', 'task']]);
            expect((await restartedRuntime.getLineage('run:restart')).tasks[0]?.attempts).toBe(2);
            expect((await restartedRuntime.getLineage('run:restart')).tasks[0]?.state).toBe('succeeded');
            expect((await restartedRuntime.getLineage('run:restart')).run.consumed.attempts).toBe(2);
            expect(realtimeEvents).toHaveLength(1);
            expect(observations.snapshot()).toHaveLength(1);

            stage = 'outbox_lease_reclaim';
            expect(await worker.runOutboxOnce('delivery:after-restart')).toBe(true);
            expect(deliveryCalls).toEqual(['delivery:assignment']);
            expect(delivered.size).toBe(1);
            expect((await restartedOutbox.get('delivery:assignment'))?.attempts).toBe(2);
            expect((await restartedOutbox.get('delivery:assignment'))?.state).toBe('delivered');
            expect((await database.query<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM hm_outbox WHERE effect_kind='assignment'`,
            )).rows[0]?.count).toBe('1');
            expect(await worker.runOutboxOnce('delivery:duplicate-probe')).toBe(false);

            // A message retries after a synthetic pre-effect failure, then records one effect.
            stage = 'outbox_retry';
            const messageIntent: EffectIntent = {
                ...baseIntent, effect_key: `message:${caseId}:${current.version}`,
                effect_kind: 'message', action: 'external_message', proposal_hash: hash('message-proposal'),
                envelope: {
                    ...baseIntent.envelope, delivery_id: 'delivery:message', channel: 'web',
                    destination_binding_id: 'binding:resident-1', correlation_id: 'corr:message',
                },
            };
            await restartedOutbox.enqueue(messageIntent);
            await restartedOutbox.enqueue(messageIntent);
            let firstMessage = true;
            const retryDelivery: SyntheticDeliveryPort = {
                deliver: async ({ idempotency_key }) => {
                    deliveryCalls.push(idempotency_key);
                    if (firstMessage) {
                        firstMessage = false;
                        return { status: 'retryable_failure', external_reference_hash: null, reason_code: 'synthetic_timeout' };
                    }
                    delivered.add(idempotency_key);
                    return { status: 'delivered', external_reference_hash: deliveryReferenceHash(`fake:${idempotency_key}`), reason_code: 'synthetic_delivered' };
                },
            };
            const retryWorker = new DurableCoordinationWorker(
                restartedRuntime, restartedOutbox, capability, new EffectGate(decisions, clock),
                retryDelivery, new ScopedRealtimePublisher(realtimePort),
                new ScopedRunObserver(observations), clock,
                { task_lease_ms: 2_000, delivery_lease_ms: 2_000, retry_delay_ms: 1 },
            );
            expect(await retryWorker.runOutboxOnce('delivery:retry-1')).toBe(true);
            await new Promise((resolve) => setTimeout(resolve, 5));
            expect(await retryWorker.runOutboxOnce('delivery:retry-2')).toBe(true);
            expect((await restartedOutbox.receipts('delivery:message')).map((receipt) => receipt.status))
                .toEqual(['retryable_failure', 'delivered']);
            expect(delivered.has('delivery:message')).toBe(true);
            expect(deliveryCalls.filter((id) => id === 'delivery:message')).toHaveLength(2);
            expect((await database.query<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM hm_outbox WHERE effect_kind='message'`,
            )).rows[0]?.count).toBe('1');

            // Bounded graceful drain persists shutdown cancellation and aborts an uncooperative capability.
            stage = 'bounded_drain';
            await restartedRuntime.openSession({ session_id: 'session:drain', scope: caseScope, idempotency_key: 'session-drain' });
            await restartedRuntime.createRun({
                run_id: 'run:drain', session_id: 'session:drain', command_id: 'drain-command',
                case_id: caseId, case_version: current.version,
                budget: { attempts: 1, wall_ms: 30_000, tokens: 100, cost_micros: 100, tool_calls: 0 },
                policy_version: caseScope.policy_version, idempotency_key: 'run-drain',
            });
            await restartedRuntime.enqueueTask({ ...taskEnvelope, run_id: 'run:drain', task_id: 'task:drain',
                idempotency_key: 'task-drain', budget: { ...taskEnvelope.budget, attempts: 1 } });
            let started!: () => void;
            const entered = new Promise<void>((resolve) => { started = resolve; });
            const blockingCapability: ArtifactCapabilityPort = {
                execute: ({ signal }) => new Promise((_resolve, reject) => {
                    started();
                    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { code: 'cancelled' })), { once: true });
                }),
            };
            const drainWorker = new DurableCoordinationWorker(
                restartedRuntime, restartedOutbox, blockingCapability, new EffectGate(decisions, clock),
                fakeDelivery, new ScopedRealtimePublisher(realtimePort),
                new ScopedRunObserver(observations), clock,
                { task_lease_ms: 2_000, delivery_lease_ms: 2_000, retry_delay_ms: 1 },
            );
            const active = drainWorker.runTaskOnce('worker:drain', {
                organization_id: 1, scope_id: caseScope.scope_id, case_id: caseId,
                principal_ids: ['system:g7-live'],
            });
            await entered;
            const drain = await drainWorker.drain(10);
            await active;
            expect(drain.bounded).toBe(true);
            expect((await restartedRuntime.getTask('task:drain'))?.state).toBe('cancelled');
            expect((await restartedRuntime.getLineage('run:drain')).signals).toHaveLength(1);
            expect(await drainWorker.runTaskOnce('worker:after-drain', {
                organization_id: 1, scope_id: caseScope.scope_id, case_id: caseId,
                principal_ids: ['system:g7-live'],
            })).toBe(false);
        } catch (error) {
            const detail = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
            verifierFailure = new Error(`Live PostgreSQL verifier failed at ${stage}: ${detail}`, { cause: error });
        }
        try {
            await harness.cleanup();
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            const cleanupFailure = new Error(`Live PostgreSQL verifier cleanup failed after ${stage}: ${detail}`, { cause: error });
            verifierFailure = verifierFailure
                ? new AggregateError([verifierFailure, cleanupFailure], 'Live verifier and cleanup both failed')
                : cleanupFailure;
        }
        const cleanupEvidence = harness.cleanupEvidence();
        try {
            expect(cleanupEvidence.directory_removed).toBe(true);
            expect(cleanupEvidence.shutdowns).toHaveLength(2);
            for (const shutdown of cleanupEvidence.shutdowns) {
                expect(shutdown.tracked_pids).toContain(shutdown.root_pid);
                expect(shutdown.tracked_pids.length).toBeGreaterThan(1);
                expect(shutdown.verified_remaining_pids).toEqual([]);
            }
            console.log(`G7_CLEANUP_EVIDENCE ${JSON.stringify(cleanupEvidence)}`);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            const evidenceFailure = new Error(`Live PostgreSQL cleanup evidence failed: ${detail}`, { cause: error });
            verifierFailure = verifierFailure
                ? new AggregateError([verifierFailure, evidenceFailure], 'Live verifier and cleanup evidence both failed')
                : evidenceFailure;
        }
        if (verifierFailure) throw verifierFailure;
    }, 120_000);
});
