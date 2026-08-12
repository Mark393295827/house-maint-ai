import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type {
    AgentTaskEnvelope,
    ArtifactEnvelope,
    EffectiveScope,
    EvaluationReceipt,
} from '../../../packages/contracts/src/index.js';
import { PostgresRunStore } from '../../../packages/persistence/src/runs/index.js';
import {
    DEFAULT_EMBEDDED_ENTRY,
    readWorkspace,
    startLivePostgres,
} from './live-postgres-harness.js';
import {
    ManualClock,
    runtimeBudget,
    runtimeScope,
    runtimeTask,
} from '../../../packages/testkit/src/agent-runtime/index.js';
import { sha256 } from '../../../packages/agent-core/src/index.js';

const embeddedEntry = process.env.HOUSE_MAINT_EMBEDDED_POSTGRES_ENTRY ?? DEFAULT_EMBEDDED_ENTRY;
const liveAvailable = fs.existsSync(embeddedEntry);
const REQUIRED_CHECKS = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

function artifactIdentity(artifact: Omit<ArtifactEnvelope, 'schema' | 'artifact_id' | 'payload' | 'evaluation_state' | 'created_at'>) {
    return artifact;
}

function acceptedCompletion(task: AgentTaskEnvelope, suffix: string, canonical = true) {
    const payload = { suffix };
    const identity = artifactIdentity({
        schema_name: 'coordination-remediation/v1', scope_id: task.scope_id,
        organization_id: task.organization_id, case_id: task.case_ref.id,
        case_version: task.case_ref.version, producer_run_id: task.run_id,
        producer_task_id: task.task_id, input_hashes: [], payload_hash: sha256(payload),
        policy_version: task.policy_version, data_class: 'personal', retention_days: 14,
        supersedes_artifact_id: null,
    });
    const artifact: ArtifactEnvelope = {
        schema: 'agent-artifact/v1', artifact_id: canonical ? `artifact:${sha256(identity)}` : `artifact:legacy:${suffix}`,
        ...identity, payload, evaluation_state: 'accepted', created_at: '2026-08-02T06:00:00.000Z',
    };
    const evaluationBody = {
        artifact_id: artifact.artifact_id, evaluator_capability: 'artifact.critic.v1',
        independent_route: true,
        checks: REQUIRED_CHECKS.map((name) => ({ name, status: 'pass' as const, evidence_codes: ['synthetic_pass'] })),
        decision: 'accept' as const, evaluated_at: '2026-08-02T06:00:00.000Z',
    };
    const evaluation: EvaluationReceipt = {
        schema: 'evaluation-receipt/v1',
        evaluation_id: canonical ? `evaluation:${sha256(evaluationBody)}` : `evaluation:legacy:${suffix}`,
        ...evaluationBody,
    };
    return { artifact, evaluation, usage: { wall_ms: 1, tokens: 1, cost_micros: 1, tool_calls: 0 } };
}

function scope(overrides: Partial<EffectiveScope> = {}): EffectiveScope {
    return runtimeScope({ capabilities: ['diagnosis.structured.v1'], ...overrides });
}

async function migrate(database: { query: (sql: string, params?: unknown[]) => Promise<unknown> }): Promise<void> {
    await database.query(readWorkspace('packages/persistence/src/runs/001_durable_coordination.postgres.sql'));
    await database.query(readWorkspace('packages/persistence/src/runs/002_composition_lifecycle.postgres.sql'));
    await database.query(readWorkspace('packages/persistence/src/runs/003_external_input_lineage.postgres.sql'));
}

describe.skipIf(!liveAvailable)('PostgresRunStore remediation invariants', () => {
    it('rejects expired scopes, ungranted capabilities, and invalid scheduling windows before mutation', async () => {
        const harness = await startLivePostgres(embeddedEntry);
        const clock = new ManualClock();
        try {
            await migrate(harness.database);
            const store = new PostgresRunStore(harness.database, clock);
            await expect(store.openSession({
                session_id: 'session:expired', scope: scope({ expires_at: '2026-08-02T05:59:59.000Z' }),
                idempotency_key: 'session:expired',
            })).rejects.toMatchObject({ code: 'scope_mismatch' });
            await store.openSession({ session_id: 'session:valid', scope: scope(), idempotency_key: 'session:valid' });
            await store.createRun({
                run_id: 'run:guards', session_id: 'session:valid', command_id: 'command:guards',
                case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
                idempotency_key: 'run:guards',
            });
            const ungranted = runtimeTask({
                run_id: 'run:guards', task_id: 'task:ungranted', idempotency_key: 'task:ungranted',
                capability: 'repair.plan.structured.v1',
            });
            await expect(store.enqueueTask(ungranted)).rejects.toMatchObject({ code: 'scope_mismatch' });
            await expect(store.enqueueTask(runtimeTask({
                run_id: 'run:guards', task_id: 'task:expired', idempotency_key: 'task:expired',
                expires_at: '2026-08-02T06:00:00.000Z',
            }))).rejects.toMatchObject({ code: 'invalid_state' });
            await expect(store.enqueueTask(runtimeTask({
                run_id: 'run:guards', task_id: 'task:window', idempotency_key: 'task:window',
                not_before: '2026-08-02T06:01:00.000Z', expires_at: '2026-08-02T06:01:00.000Z',
            }))).rejects.toMatchObject({ code: 'invalid_state' });
            expect((await harness.database.query<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM hm_agent_tasks WHERE run_id='run:guards'`,
            ) as { rows: Array<{ count: string }> }).rows[0]?.count).toBe('0');
        } finally {
            await harness.cleanup();
        }
    }, 120_000);

    it('terminalizes ready and leased tasks once their task window expires', async () => {
        const harness = await startLivePostgres(embeddedEntry);
        const clock = new ManualClock();
        try {
            await migrate(harness.database);
            const store = new PostgresRunStore(harness.database, clock);
            await store.openSession({ session_id: 'session:expiry', scope: scope(), idempotency_key: 'session:expiry' });
            await store.createRun({
                run_id: 'run:expiry', session_id: 'session:expiry', command_id: 'command:expiry',
                case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
                idempotency_key: 'run:expiry',
            });
            const readyTask = runtimeTask({
                run_id: 'run:expiry', task_id: 'task:ready-expired', idempotency_key: 'task:ready-expired',
                expires_at: '2026-08-02T06:00:00.100Z',
            });
            await store.enqueueTask(readyTask);
            clock.advance(101);
            expect(await store.claimTask('worker:expiry-ready', 1_000)).toBeNull();
            expect(await store.getTask(readyTask.task_id)).toMatchObject({ state: 'expired', error_code: 'task_expired' });

            await store.openSession({ session_id: 'session:lease-expiry', scope: scope(), idempotency_key: 'session:lease-expiry' });
            await store.createRun({
                run_id: 'run:lease-expiry', session_id: 'session:lease-expiry', command_id: 'command:lease-expiry',
                case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
                idempotency_key: 'run:lease-expiry',
            });
            const leasedTask = runtimeTask({
                run_id: 'run:lease-expiry', task_id: 'task:leased-expired', idempotency_key: 'task:leased-expired',
                expires_at: '2026-08-02T06:00:00.200Z',
            });
            await store.enqueueTask(leasedTask);
            const claim = await store.claimTask('worker:expiry-lease', 1_000);
            expect(claim).toMatchObject({ task_id: leasedTask.task_id, attempt: 1 });
            clock.advance(100);
            expect(await store.claimTask('worker:expiry-reclaim', 1_000)).toBeNull();
            expect(await store.getTask(leasedTask.task_id)).toMatchObject({ state: 'expired', error_code: 'task_expired' });
        } finally {
            await harness.cleanup();
        }
    }, 120_000);

    it('enforces canonical identities for declared plans, preserves planless legacy hashes, and denies row mutation', async () => {
        const harness = await startLivePostgres(embeddedEntry);
        const clock = new ManualClock();
        try {
            await migrate(harness.database);
            const store = new PostgresRunStore(harness.database, clock);
            const plan = {
                schema: 'agent-run-plan/v1' as const, plan_id: 'plan:canonical',
                tasks: [{ task_id: 'task:canonical', capability: 'diagnosis.structured.v1', depends_on_task_ids: [] }],
            };
            await store.openSession({ session_id: 'session:canonical', scope: scope(), idempotency_key: 'session:canonical' });
            await store.createRun({
                run_id: 'run:canonical', session_id: 'session:canonical', command_id: 'command:canonical',
                case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
                idempotency_key: 'run:canonical', plan,
            });
            const task = runtimeTask({ run_id: 'run:canonical', task_id: 'task:canonical', idempotency_key: 'task:canonical' });
            await store.enqueueTask(task);
            const claim = (await store.claimTask('worker:canonical', 1_000))!;
            await store.beginTask(claim);
            const nonCanonical = acceptedCompletion(claim.task, 'noncanonical', false);
            await expect(store.completeTask(claim, nonCanonical)).rejects.toMatchObject({ code: 'invalid_artifact' });
            expect(await store.getTask(task.task_id)).toMatchObject({ state: 'running', output_artifact_id: null });
            const canonical = acceptedCompletion(claim.task, 'canonical');
            await store.completeTask(claim, canonical);
            await expect(harness.database.query(`
                UPDATE hm_agent_artifacts SET envelope_json='{}'::jsonb
                 WHERE artifact_id=$1`, [canonical.artifact.artifact_id])).rejects.toMatchObject({ code: '42501' });
            await expect(harness.database.query(`
                UPDATE hm_agent_evaluations SET receipt_json='{}'::jsonb
                 WHERE evaluation_id=$1`, [canonical.evaluation.evaluation_id])).rejects.toMatchObject({ code: '42501' });

            await store.openSession({ session_id: 'session:legacy', scope: scope(), idempotency_key: 'session:legacy' });
            await store.createRun({
                run_id: 'run:legacy', session_id: 'session:legacy', command_id: 'command:legacy',
                case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
                idempotency_key: 'run:legacy',
            });
            const legacyTask = runtimeTask({ run_id: 'run:legacy', task_id: 'task:legacy', idempotency_key: 'task:legacy' });
            await store.enqueueTask(legacyTask);
            const legacyClaim = (await store.claimTask('worker:legacy', 1_000))!;
            await store.beginTask(legacyClaim);
            const legacy = acceptedCompletion(legacyClaim.task, 'legacy', false);
            legacy.artifact.payload_hash = createHash('sha256')
                .update(JSON.stringify(legacy.artifact.payload)).digest('hex');
            await expect(store.completeTask(legacyClaim, legacy)).resolves.toMatchObject({ state: 'succeeded' });
        } finally {
            await harness.cleanup();
        }
    }, 120_000);
});
