import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type {
    AgentRunInput,
    AgentTaskEnvelope,
    ArtifactEnvelope,
    EvaluationReceipt,
} from '../../../packages/contracts/src/index.js';
import {
    AgentKernel,
    InMemoryAgentStore,
    sha256,
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

const now = '2026-08-02T06:00:00.000Z';
const capabilities = ['diagnosis.structured.v1', 'repair.plan.structured.v1'];
const requiredChecks = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

const plan = {
    schema: 'agent-run-plan/v1' as const,
    plan_id: 'plan:external-inputs:101:v1',
    tasks: [
        {
            task_id: 'task:diagnosis:101', capability: capabilities[0]!,
            external_input_artifact_ids: ['artifact:placeholder:photo', 'artifact:placeholder:text'],
            depends_on_task_ids: [],
        },
        {
            task_id: 'task:repair:101', capability: capabilities[1]!,
            external_input_artifact_ids: ['artifact:placeholder:text'],
            depends_on_task_ids: ['task:diagnosis:101'],
        },
    ],
};

function artifactIdentity(artifact: Omit<ArtifactEnvelope, 'schema' | 'artifact_id' | 'payload' | 'evaluation_state' | 'created_at'>) {
    return artifact;
}

function externalRunInput(
    kind: 'photo' | 'text',
    overrides: { run_id?: string; command_id?: string; policy_version?: string; evaluator_route_id?: string } = {},
): AgentRunInput {
    const runId = overrides.run_id ?? 'run:101';
    const commandId = overrides.command_id ?? 'command:diagnose:101';
    const policyVersion = overrides.policy_version ?? 'policy:v1';
    const payload = kind === 'photo'
        ? { kind, confirmed: true, media_hash: 'c'.repeat(64) }
        : { kind, confirmed: true, text: 'Water is leaking below the kitchen sink.' };
    const artifactBody = artifactIdentity({
        schema_name: 'confirmed-intake/v1', scope_id: 'scope:case:101', organization_id: 7,
        case_id: 101, case_version: 3, producer_run_id: `run:intake:${kind}:101`,
        producer_task_id: `task:intake:${kind}:101`, input_hashes: [], payload_hash: sha256(payload),
        policy_version: policyVersion, data_class: 'personal', retention_days: 14,
        supersedes_artifact_id: null,
    });
    const artifact: ArtifactEnvelope = {
        schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(artifactBody)}`,
        ...artifactBody, payload, evaluation_state: 'accepted', created_at: now,
    };
    const evaluationBody = {
        artifact_id: artifact.artifact_id, evaluator_capability: 'intake.media.critic.v1',
        independent_route: true,
        checks: requiredChecks.map((name) => ({ name, status: 'pass' as const, evidence_codes: ['synthetic_pass'] })),
        decision: 'accept' as const, evaluated_at: now,
    };
    const evaluation: EvaluationReceipt = {
        schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${sha256(evaluationBody)}`,
        ...evaluationBody,
    };
    const routeProofBody = {
        run_id: runId, command_id: commandId, scope_id: artifact.scope_id,
        organization_id: artifact.organization_id, case_ref: { id: artifact.case_id, version: artifact.case_version },
        policy_version: policyVersion, artifact_id: artifact.artifact_id, evaluation_id: evaluation.evaluation_id,
        data_class: artifact.data_class, retention_days: artifact.retention_days,
        producer: { capability: 'intake.media.confirm.v1', route_id: `route:intake:${kind}:confirmed` },
        evaluator: {
            capability: 'intake.media.critic.v1',
            route_id: overrides.evaluator_route_id ?? `route:intake:${kind}:critic`,
        },
        bound_at: now,
    };
    const routeProof = {
        schema: 'agent-run-route-proof/v1' as const,
        proof_id: `route-proof:${sha256(routeProofBody)}`,
        ...routeProofBody,
    };
    const inputBody = {
        run_id: runId, command_id: commandId, scope_id: artifact.scope_id,
        organization_id: artifact.organization_id, case_ref: { id: artifact.case_id, version: artifact.case_version },
        policy_version: policyVersion, artifact, evaluation, route_proof: routeProof,
    };
    return {
        schema: 'agent-run-input/v1', input_id: `run-input:${sha256(inputBody)}`, ...inputBody,
    };
}

function runtime() {
    const clock = new ManualClock();
    const store = new InMemoryAgentStore(clock);
    const kernel = new AgentKernel(store, clock);
    const scope = runtimeScope({ capabilities });
    kernel.openSession({ session_id: 'session:101', scope, idempotency_key: 'session:101' });
    const photo = externalRunInput('photo');
    const text = externalRunInput('text');
    const boundPlan = structuredClone(plan);
    boundPlan.tasks[0]!.external_input_artifact_ids = [photo.artifact.artifact_id, text.artifact.artifact_id];
    boundPlan.tasks[1]!.external_input_artifact_ids = [text.artifact.artifact_id];
    kernel.createRun({
        run_id: 'run:101', session_id: 'session:101', command_id: 'command:diagnose:101',
        case_id: 101, case_version: 3, budget: runtimeBudget(), plan: boundPlan,
        policy_version: 'policy:v1', idempotency_key: 'run:101:v3',
    });
    return { clock, store, kernel, photo, text, boundPlan, scope };
}

function task(spec: typeof plan.tasks[number], inputs: string[]): AgentTaskEnvelope {
    return runtimeTask({
        task_id: spec.task_id, capability: spec.capability, input_artifact_ids: inputs,
        idempotency_key: `${spec.task_id}:v1`,
    });
}

describe('immutable external input lineage in memory', () => {
    it('registers exact accepted bytes, restores ordered lineage, and feeds declared inputs before dependencies', async () => {
        const { clock, store, kernel, photo, text, boundPlan } = runtime();
        expect(() => kernel.enqueueTask(task(boundPlan.tasks[0]!, [photo.artifact.artifact_id, text.artifact.artifact_id])))
            .toThrowError(expect.objectContaining({ code: 'invalid_state' }));

        // Registration order is intentionally opposite to plan order.
        expect(kernel.registerExternalInput(text)).toEqual(text);
        expect(kernel.registerExternalInput(photo)).toEqual(photo);
        expect(kernel.registerExternalInput(photo)).toEqual(photo);
        expect(() => kernel.registerExternalInput({
            ...photo,
            artifact: { ...photo.artifact, payload: { kind: 'photo', confirmed: false } },
        })).toThrowError(expect.objectContaining({ code: 'invalid_artifact' }));
        expect(() => kernel.registerExternalInput({
            ...photo,
            route_proof: { ...photo.route_proof, evaluator: photo.route_proof.producer },
        })).toThrow();

        const snapshot = store.snapshot();
        const restored = InMemoryAgentStore.restore(snapshot, clock);
        const restoredKernel = new AgentKernel(restored, clock);
        expect(restored.getLineage('run:101').external_inputs.map((item) => item.artifact.artifact_id))
            .toEqual([photo.artifact.artifact_id, text.artifact.artifact_id]);
        expect(() => restoredKernel.enqueueTask(task(boundPlan.tasks[0]!, [text.artifact.artifact_id, photo.artifact.artifact_id])))
            .toThrowError(expect.objectContaining({ code: 'invalid_state' }));

        const diagnosisHarness = new FakeHarness('route:producer:diagnosis', successfulCapabilityResult({ diagnosis: 'fixture' }));
        const repairHarness = new FakeHarness('route:producer:repair', successfulCapabilityResult({ repair: 'fixture' }));
        const router = new StaticCapabilityRouter()
            .register(capabilities[0]!, diagnosisHarness)
            .register(capabilities[1]!, repairHarness);
        const evaluator = new FakeEvaluator('route:independent:critic');
        restoredKernel.enqueueTask(task(boundPlan.tasks[0]!, [photo.artifact.artifact_id, text.artifact.artifact_id]));
        const diagnosis = await restoredKernel.executeClaim(restoredKernel.claimNext('worker:diagnosis', 1_000)!, router, evaluator);
        expect(diagnosis.state).toBe('succeeded');
        expect(diagnosisHarness.invocations[0]!.input_artifact_ids)
            .toEqual([photo.artifact.artifact_id, text.artifact.artifact_id]);

        restoredKernel.enqueueTask(task(boundPlan.tasks[1]!, [text.artifact.artifact_id, diagnosis.artifact_id!]));
        const repair = await restoredKernel.executeClaim(restoredKernel.claimNext('worker:repair', 1_000)!, router, evaluator);
        expect(repair.state).toBe('succeeded');
        expect(repairHarness.invocations[0]!.input_artifact_ids)
            .toEqual([text.artifact.artifact_id, diagnosis.artifact_id]);
        expect(restored.getLineage('run:101')).toMatchObject({
            run: { status: 'succeeded' },
            external_inputs: [{ schema: 'agent-run-input/v1' }, { schema: 'agent-run-input/v1' }],
        });
    });

    it('fails closed when a snapshot payload, evaluation, or route proof is substituted', () => {
        const { clock, store, kernel, photo } = runtime();
        kernel.registerExternalInput(photo);
        for (const mutate of [
            (snapshot: ReturnType<InMemoryAgentStore['snapshot']>) => {
                snapshot.external_inputs[0]!.artifact.payload = { substituted: true };
            },
            (snapshot: ReturnType<InMemoryAgentStore['snapshot']>) => {
                snapshot.external_inputs[0]!.evaluation.checks[0]!.evidence_codes = ['substituted'];
            },
            (snapshot: ReturnType<InMemoryAgentStore['snapshot']>) => {
                snapshot.external_inputs[0]!.route_proof.evaluator.route_id = 'route:substituted';
            },
        ]) {
            const snapshot = store.snapshot();
            mutate(snapshot);
            expect(() => InMemoryAgentStore.restore(snapshot, clock))
                .toThrowError(expect.objectContaining({ code: 'invalid_artifact' }));
        }
    });
});

const embeddedEntry = process.env.HOUSE_MAINT_EMBEDDED_POSTGRES_ENTRY ?? DEFAULT_EMBEDDED_ENTRY;

function durableCompletion(taskEnvelope: AgentTaskEnvelope) {
    const payload = { diagnosis: 'synthetic live proof' };
    const identity = artifactIdentity({
        schema_name: 'diagnosis-result/v1', scope_id: taskEnvelope.scope_id,
        organization_id: taskEnvelope.organization_id, case_id: taskEnvelope.case_ref.id,
        case_version: taskEnvelope.case_ref.version, producer_run_id: taskEnvelope.run_id,
        producer_task_id: taskEnvelope.task_id, input_hashes: [], payload_hash: sha256(payload),
        policy_version: taskEnvelope.policy_version, data_class: 'personal', retention_days: 14,
        supersedes_artifact_id: null,
    });
    const artifact: ArtifactEnvelope = {
        schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(identity)}`, ...identity,
        payload, evaluation_state: 'accepted', created_at: now,
    };
    const evaluationBody = {
        artifact_id: artifact.artifact_id, evaluator_capability: 'artifact.critic.v1', independent_route: true,
        checks: requiredChecks.map((name) => ({ name, status: 'pass' as const, evidence_codes: ['synthetic_pass'] })),
        decision: 'accept' as const, evaluated_at: now,
    };
    const evaluation: EvaluationReceipt = {
        schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${sha256(evaluationBody)}`,
        ...evaluationBody,
    };
    return { artifact, evaluation, usage: { wall_ms: 1, tokens: 1, cost_micros: 1, tool_calls: 0 } };
}

describe.skipIf(!fs.existsSync(embeddedEntry))('live PostgreSQL external input lineage', () => {
    it('survives restart, prevents row mutation, and rejects evaluation substitution before task mutation', async () => {
        const harness = await startLivePostgres(embeddedEntry);
        const clock = new ManualClock();
        let database = harness.database;
        let verifierFailure: unknown;
        try {
            await database.query(readWorkspace('packages/persistence/src/runs/001_durable_coordination.postgres.sql'));
            await database.query(readWorkspace('packages/persistence/src/runs/002_composition_lifecycle.postgres.sql'));
            await database.query(readWorkspace('packages/persistence/src/runs/003_external_input_lineage.postgres.sql'));
            let sequence = 0;
            const ids = { next: (prefix: 'lease' | 'event') => `${prefix}:external:${++sequence}` };
            let store = new PostgresRunStore(database, clock, ids);
            const scope = runtimeScope({ capabilities });
            const photo = externalRunInput('photo');
            const boundPlan = {
                schema: 'agent-run-plan/v1' as const, plan_id: 'plan:live:external:101',
                tasks: [{
                    task_id: 'task:diagnosis:101', capability: capabilities[0]!,
                    external_input_artifact_ids: [photo.artifact.artifact_id], depends_on_task_ids: [],
                }],
            };
            await store.openSession({ session_id: 'session:101', scope, idempotency_key: 'session:101' });
            await store.createRun({
                run_id: 'run:101', session_id: 'session:101', command_id: 'command:diagnose:101',
                case_id: 101, case_version: 3, budget: runtimeBudget(), plan: boundPlan,
                policy_version: 'policy:v1', idempotency_key: 'run:101:v3',
            });
            expect(await store.registerExternalInput(photo)).toEqual(photo);
            expect(await store.registerExternalInput(photo)).toEqual(photo);
            await expect(store.registerExternalInput({
                ...photo,
                evaluation: {
                    ...photo.evaluation,
                    checks: photo.evaluation.checks.map((check, index) => index === 0
                        ? { ...check, evidence_codes: ['substituted'] } : check),
                },
            })).rejects.toMatchObject({ code: 'invalid_artifact' });
            await expect(database.query(
                `UPDATE hm_agent_run_inputs SET command_id='command:forbidden' WHERE run_id='run:101'`,
            )).rejects.toMatchObject({ code: '42501' });

            database = await harness.restart();
            store = new PostgresRunStore(database, clock, ids);
            expect((await store.getLineage('run:101')).external_inputs).toEqual([photo]);

            const envelope = task(boundPlan.tasks[0]!, [photo.artifact.artifact_id]);
            await store.enqueueTask(envelope);
            const claim = (await store.claimTask('worker:live', 1_000))!;
            await store.beginTask(claim);
            const completion = durableCompletion(claim.task);
            await database.query(
                `INSERT INTO hm_agent_artifacts (
                    artifact_id, run_id, task_id, organization_id, scope_id, case_id,
                    case_version, policy_version, payload_hash, envelope_json, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
                [completion.artifact.artifact_id, claim.run_id, claim.task_id,
                    completion.artifact.organization_id, completion.artifact.scope_id,
                    completion.artifact.case_id, completion.artifact.case_version,
                    completion.artifact.policy_version, completion.artifact.payload_hash,
                    JSON.stringify(completion.artifact), completion.artifact.created_at],
            );
            const substituted = {
                ...completion.evaluation,
                checks: completion.evaluation.checks.map((check, index) => index === 0
                    ? { ...check, evidence_codes: ['substituted'] } : check),
            };
            await database.query(
                `INSERT INTO hm_agent_evaluations (evaluation_id, artifact_id, run_id, task_id, receipt_json, created_at)
                 VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
                [substituted.evaluation_id, substituted.artifact_id, claim.run_id, claim.task_id,
                    JSON.stringify(substituted), substituted.evaluated_at],
            );
            await expect(store.completeTask(claim, completion)).rejects.toMatchObject({ code: 'idempotency_conflict' });
            expect(await store.getTask(claim.task_id)).toMatchObject({
                state: 'running', output_artifact_id: null, evaluation_id: null,
            });
            expect((await store.getLineage('run:101')).run.consumed).toMatchObject({
                wall_ms: 0, tokens: 0, cost_micros: 0, tool_calls: 0,
            });
        } catch (error) {
            verifierFailure = error;
        }
        try {
            await harness.cleanup();
        } catch (error) {
            verifierFailure = verifierFailure
                ? new AggregateError([verifierFailure, error], 'External-input verifier and cleanup both failed')
                : error;
        }
        const cleanup = harness.cleanupEvidence();
        expect(cleanup.directory_removed).toBe(true);
        expect(cleanup.shutdowns).toHaveLength(2);
        for (const shutdown of cleanup.shutdowns) expect(shutdown.verified_remaining_pids).toEqual([]);
        if (verifierFailure) throw verifierFailure;
    }, 120_000);
});
