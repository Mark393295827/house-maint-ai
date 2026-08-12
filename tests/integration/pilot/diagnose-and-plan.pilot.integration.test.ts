import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ArtifactEnvelopeSchema, EffectiveScopeSchema, type AgentRunPlan, type ArtifactEnvelope, type EffectiveScope, type EvaluationReceipt } from '../../../packages/contracts/src/index.js';
import {
    CAPABILITY_IDS,
    DIAGNOSE_AND_PLAN_COMPOSITION,
    createDiagnoseAndPlanRunPlan,
} from '../../../packages/agent-adapters/src/index.js';
import { ArtifactFinalizer, RuntimeFault, sha256 } from '../../../packages/agent-core/src/index.js';
import { PostgresRunStore } from '../../../packages/persistence/src/runs/index.js';
import { PostgresOutboxStore } from '../../../packages/persistence/src/outbox/index.js';
import {
    DEFAULT_EMBEDDED_ENTRY,
    readWorkspace,
    startLivePostgres,
} from '../coordination/live-postgres-harness.js';
import {
    DurableCoordinationWorker,
    EffectGate,
    RegistryArtifactCapabilityPort,
    ScopedRealtimePublisher,
} from '../../../apps/worker/src/index.js';
import { MemoryRunObservationSink, ScopedRunObserver } from '../../../packages/observability/src/runs/index.js';
import type {
    ArtifactCapabilityPort,
    CapabilityExecution,
    DecisionSnapshotPort,
    RealtimePort,
    SyntheticDeliveryPort,
} from '../../../apps/worker/src/index.js';
import { createCapabilityAdapterRegistry } from '../../../packages/agent-adapters/src/index.js';
import { DiagnoseAndPlanCoordinator, resolveRealtimeTarget, type DiagnoseAndPlanStartInput } from '../../../apps/worker/src/index.js';
import type { DurableRunLineage, DurableTaskClaim, RunStore } from '../../../packages/persistence/src/runs/index.js';
import type { OutboxEntry, OutboxStore } from '../../../packages/persistence/src/outbox/index.js';

describe('diagnose-and-plan pilot composition', () => {
    it('declares the bounded producer, independent critic, and bilingual client sequence', () => {
        const plan: AgentRunPlan = createDiagnoseAndPlanRunPlan('run:pilot-red');

        expect(plan.tasks.map((task) => ({
            capability: task.capability,
            dependencies: task.depends_on_task_ids.map((taskId) =>
                plan.tasks.find((candidate) => candidate.task_id === taskId)?.capability),
        }))).toEqual([
            { capability: CAPABILITY_IDS.diagnosis, dependencies: [] },
            { capability: CAPABILITY_IDS.repairPlan, dependencies: [CAPABILITY_IDS.diagnosis] },
            { capability: CAPABILITY_IDS.independentCritic, dependencies: [CAPABILITY_IDS.repairPlan] },
            {
                capability: CAPABILITY_IDS.bilingualNextAction,
                dependencies: [CAPABILITY_IDS.repairPlan, CAPABILITY_IDS.independentCritic],
            },
        ]);

        const criticIndex = DIAGNOSE_AND_PLAN_COMPOSITION.steps
            .findIndex((step) => step.capability === CAPABILITY_IDS.independentCritic);
        const bilingualIndex = DIAGNOSE_AND_PLAN_COMPOSITION.steps
            .findIndex((step) => step.capability === CAPABILITY_IDS.bilingualNextAction);
        expect(criticIndex).toBeLessThan(bilingualIndex);
    });

    it('binds confirmed external inputs before diagnosis and preserves exact lineage order', () => {
        const plan = createDiagnoseAndPlanRunPlan('run:pilot-input', ['artifact:photo', 'artifact:description']);
        expect(plan.tasks[0]?.external_input_artifact_ids).toEqual(['artifact:photo', 'artifact:description']);
        expect(plan.tasks.slice(1).every((task) => task.external_input_artifact_ids === undefined)).toBe(true);
    });

    it('recomputes stored artifact and evaluation identities and requires bilingual proof', () => {
        const clock = { now: () => new Date('2026-01-01T00:00:00.000Z') };
        const finalizer = new ArtifactFinalizer(clock);
        const payload = {
            kind: 'review_plan',
            title: { zh_cn: 'è¯·å®¡é˜…æ–¹æ¡ˆ', en_us: 'Review the plan' },
            instruction: { zh_cn: 'è¯·å®¡é˜…ç»´ä¿®å»ºè®®ã€‚', en_us: 'Review the repair guidance.' },
            safety_notice: null, evidence_request: null, requires_human_action: true,
        };
        const identity = {
            schema_name: 'maintenance-bilingual-next-action/v1', scope_id: 'case:1', organization_id: 1,
            case_id: 1, case_version: 1, producer_run_id: 'run:pilot', producer_task_id: 'task:final',
            input_hashes: [], payload_hash: sha256(payload), policy_version: 'policy:v1', data_class: 'personal',
            retention_days: 14, supersedes_artifact_id: null,
        } as const;
        const artifact: ArtifactEnvelope = ArtifactEnvelopeSchema.parse({
            schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(identity)}`, ...identity,
            payload, evaluation_state: 'accepted', created_at: '2026-01-01T00:00:00.000Z',
        });
        const checks = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost', 'bilingual'].map((name) => ({
            name: name as 'schema' | 'safety' | 'privacy' | 'grounding' | 'scope' | 'cost' | 'bilingual',
            status: 'pass' as const, evidence_codes: ['test'],
        }));
        const body = {
            artifact_id: artifact.artifact_id, evaluator_capability: CAPABILITY_IDS.independentCritic,
            independent_route: true as const, checks, decision: 'accept' as const,
            evaluated_at: '2026-01-01T00:00:01.000Z',
        };
        const evaluation: EvaluationReceipt = {
            schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${sha256({
                artifact_id: body.artifact_id, evaluator_capability: body.evaluator_capability,
                checks: body.checks, decision: body.decision, evaluated_at: body.evaluated_at,
                producer_route_id: 'route:producer', evaluator_route_id: 'route:critic',
            })}`,
            ...body,
        };
        expect(finalizer.proveStored({
            artifact, evaluation, producer_capability: CAPABILITY_IDS.bilingualNextAction,
            producer_route_id: 'route:producer', evaluator_route_id: 'route:critic',
        })).toEqual({ producer_route_id: 'route:producer', evaluator_route_id: 'route:critic' });
        expect(() => finalizer.proveStored({
            artifact: { ...artifact, payload_hash: sha256({ tampered: true }) }, evaluation,
            producer_capability: CAPABILITY_IDS.bilingualNextAction,
            producer_route_id: 'route:producer', evaluator_route_id: 'route:critic',
        })).toThrow(RuntimeFault);
    });
});

function retryScope(): EffectiveScope {
    return EffectiveScopeSchema.parse({
        schema: 'effective-scope/v1', scope_id: 'case:42', scope_kind: 'case', case_id: 42,
        organization_id: 7,
        principal: { principal_id: 'system:pilot', actor_kind: 'system', organization_id: 7,
            role: 'system', authenticated_at: '2026-01-01T00:00:00.000Z' },
        actions: ['read', 'verify', 'message'],
        data_classes: ['public', 'internal', 'personal'], capabilities: Object.values(CAPABILITY_IDS),
        tool_grants: [], purposes: ['pilot retry test'], region: 'cn-south', retention_days: 30,
        policy_version: 'policy:pilot', resolved_at: '2026-01-01T00:00:00.000Z',
        expires_at: '2026-01-02T00:00:00.000Z',
    });
}

function retryLineage(): DurableRunLineage {
    const payload = {
        kind: 'review_plan',
        title: { zh_cn: 'è¯·å®¡é˜…æ–¹æ¡ˆ', en_us: 'Review the plan' },
        instruction: { zh_cn: 'è¯·å®¡é˜…ç»´ä¿®å»ºè®®ã€‚', en_us: 'Review the repair guidance.' },
        safety_notice: null, evidence_request: null, requires_human_action: true,
    };
    const identity = {
        schema_name: 'maintenance-bilingual-next-action/v1', scope_id: 'case:42', organization_id: 7,
        case_id: 42, case_version: 1, producer_run_id: 'run:retry', producer_task_id: 'task:final',
        input_hashes: [], payload_hash: sha256(payload), policy_version: 'policy:pilot', data_class: 'personal',
        retention_days: 14, supersedes_artifact_id: null,
    } as const;
    const artifact = ArtifactEnvelopeSchema.parse({
        schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(identity)}`,
        ...identity, payload, evaluation_state: 'accepted', created_at: '2026-01-01T00:10:00.000Z',
    });
    const checks = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost', 'bilingual'].map((name) => ({
        name: name as 'schema' | 'safety' | 'privacy' | 'grounding' | 'scope' | 'cost' | 'bilingual',
        status: 'pass' as const, evidence_codes: ['retry-test'],
    }));
    const body = {
        artifact_id: artifact.artifact_id, evaluator_capability: CAPABILITY_IDS.independentCritic,
        independent_route: true as const, checks, decision: 'accept' as const,
        evaluated_at: '2026-01-01T00:11:00.000Z',
    };
    const evaluation: EvaluationReceipt = {
        schema: 'evaluation-receipt/v1', evaluation_id: `evaluation:${sha256({
            artifact_id: body.artifact_id, evaluator_capability: body.evaluator_capability,
            checks: body.checks, decision: body.decision, evaluated_at: body.evaluated_at,
            producer_route_id: 'route:producer', evaluator_route_id: 'route:critic',
        })}`,
        ...body,
    };
    const scope = retryScope();
    const envelope = {
        schema: 'agent-task/v1' as const, run_id: 'run:retry', task_id: 'task:final',
        scope_id: scope.scope_id, organization_id: scope.organization_id,
        case_ref: { id: 42, version: 1 }, capability: CAPABILITY_IDS.bilingualNextAction,
        input_artifact_ids: [], budget: { attempts: 2, wall_ms: 100, tokens: 100, cost_micros: 100, tool_calls: 0 },
        policy_version: scope.policy_version, idempotency_key: 'task:retry:final',
        expires_at: '2026-01-01T01:00:00.000Z',
    };
    return {
        session: { schema: 'agent-session/v1', session_id: 'session:retry', scope, created_at: '2026-01-01T00:00:00.000Z' },
        run: { run_id: 'run:retry' } as DurableRunLineage['run'],
        tasks: [{ envelope, state: 'succeeded', attempts: 1, lease_owner: null, lease_token: null,
            lease_expires_at: null, output_artifact_id: artifact.artifact_id, evaluation_id: evaluation.evaluation_id,
            error_code: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:11:00.000Z' }],
        external_inputs: [], artifacts: [artifact], evaluations: [evaluation], signals: [], events: [],
    } as unknown as DurableRunLineage;
}

function retryCoordinator(clock: { now(): Date }): DiagnoseAndPlanCoordinator {
    const registry = { getBinding: (capability: string) => ({
        capability, route_id: capability === CAPABILITY_IDS.independentCritic ? 'route:critic' : 'route:producer',
    }) };
    return new DiagnoseAndPlanCoordinator(
        {} as RunStore, {} as never, registry as never, new ArtifactFinalizer(clock), { clock },
    );
}

function retryInput(overrides: Partial<DiagnoseAndPlanStartInput> = {}): DiagnoseAndPlanStartInput {
    const scope = retryScope();
    return {
        session_id: 'session:retry', run_id: 'run:retry', command_id: 'command:retry', case_id: 42,
        case_version: 1, scope, budget: { attempts: 2, wall_ms: 100, tokens: 100, cost_micros: 100, tool_calls: 0 },
        confirmed_inputs: [], ...overrides,
    };
}

describe('diagnose-and-plan coordinator/worker retry invariants', () => {
    it('replays a successful adoption with an immutable command envelope', async () => {
        const lineage = retryLineage();
        const commands: unknown[] = [];
        let tick = 0;
        const coordinator = retryCoordinator({ now: () => new Date(`2026-01-01T00:1${2 + tick++}:00.000Z`) });
        const input = retryInput({
            adoption: {
                execute: async ({ command }) => {
                    if (commands.length && sha256(commands[0]) !== sha256(command)) {
                        throw new RuntimeFault('idempotency_conflict', 'adoption command changed on retry');
                    }
                    commands.push(command);
                    return { replayed: commands.length > 1, commandHash: sha256(command), event: {}, projection: { id: 42, version: 2 } };
                },
            },
        });
        const adopt = (coordinator as unknown as {
            adoptFinalArtifact(value: DurableRunLineage, input: DiagnoseAndPlanStartInput): Promise<unknown>;
        }).adoptFinalArtifact.bind(coordinator);
        await adopt(lineage, input);
        await adopt(lineage, input);
        expect(commands).toHaveLength(2);
        expect(commands[0]).toEqual(commands[1]);
    });

    it('reuses a static content-addressed delivery envelope across effect retries', async () => {
        const lineage = retryLineage();
        const intents: unknown[] = [];
        const outbox = { enqueue: async (intent: unknown) => {
            intents.push(intent);
            return { ...(intent as object), state: 'ready', attempts: 0, next_attempt_at: '2026-01-01T00:00:00.000Z' } as OutboxEntry;
        } } as unknown as OutboxStore;
        let tick = 0;
        const coordinator = retryCoordinator({ now: () => new Date(`2026-01-01T00:1${2 + tick++}:00.000Z`) });
        const input = retryInput({ adoption: { execute: async () => ({ replayed: true, commandHash: 'a'.repeat(64), event: {}, projection: { id: 42, version: 2 } }) }, effect: {
            outbox, destination_binding_id: 'binding:pilot', channel: 'web',
        } });
        const enqueue = (coordinator as unknown as {
            enqueueEffect(value: DurableRunLineage, input: DiagnoseAndPlanStartInput): Promise<unknown>;
        }).enqueueEffect.bind(coordinator);
        await enqueue(lineage, input);
        await enqueue(lineage, input);
        expect(intents).toHaveLength(2);
        expect((intents[0] as { envelope: unknown }).envelope).toEqual((intents[1] as { envelope: unknown }).envelope);
    });

    it('fails closed when an effect is requested without adoption authority', async () => {
        const lineage = retryLineage();
        const enqueueCalls: unknown[] = [];
        const outbox = { enqueue: async (intent: unknown) => {
            enqueueCalls.push(intent);
            return intent as OutboxEntry;
        } } as unknown as OutboxStore;
        const coordinator = retryCoordinator({ now: () => new Date('2026-01-01T00:12:00.000Z') });
        const input = retryInput({ effect: { outbox, destination_binding_id: 'binding:pilot' } });
        const enqueue = (coordinator as unknown as {
            enqueueEffect(value: DurableRunLineage, input: DiagnoseAndPlanStartInput): Promise<unknown>;
        }).enqueueEffect.bind(coordinator);
        await expect(enqueue(lineage, input)).rejects.toMatchObject({ code: 'invalid_state' });
        expect(enqueueCalls).toHaveLength(0);
    });

    it('respects deterministic RuntimeFault retryability when failing a task', async () => {
        const scope = retryScope();
        const task = retryLineage().tasks[0]!;×nõ¶‰žËkºwµçhlÍåÍÑ•´éÁ¥±½Ðt°(€€€€€€€ô¤ì(€€€€€€€•áÁ•Ð  ¤€ôøÉ•Í½±Ù•I•…±Ñ¥µ•Q…É•Ð¡ìÍ½Á”°…Í•}¥è€ÐÈ°Ñ…É•Ðèì(€€€€€€€€€€€½É…¹¥é…Ñ¥½¹}¥è€à°Í½Á•}¥è€…Í”èÐÈœ°…Í•}¥è€ÐÈ°ÁÉ¥¹¥Á…±}¥‘ÌèlÍåÍÑ•´éÁ¥±½Ðt°(€€€€€€€ôô¤¤¹Ñ½Q¡É½Ü¡IÕ¹Ñ¥µ•…Õ±Ð¤ì(€€€ô¤ì((€€€¥Ð Ù…±¥‘…Ñ•ÌÑ¡”É•…±Ñ¥µ”Ñ…É•Ð‰•™½É”½Á•¹¥¹œ„Í•ÍÍ¥½¸½ÈÉÕ¸œ°…Íå¹Œ€ ¤€ôøì(€€€€€€€½¹ÍÐ½½É‘¥¹…Ñ½È€ôÉ•ÑÉå½½É‘¥¹…Ñ½È¡ì¹½Üè€ ¤€ôø¹•Ü…Ñ” œÈÀÈØ´ÀÄ´ÀÅPÀÀèÄÈèÀÀ¸ÀÀÁhœ¤ô¤ì(€€€€€€€±•ÐÍÑ…ÉÑ•€ô™…±Í”ì(€€€€€€€€¡½½É‘¥¹…Ñ½È…ÌÕ¹­¹½Ý¸…Ìì(€€€€€€€€€€€ÍÑ…ÉÐ¡¥¹ÁÕÐè¥…¹½Í•¹‘A±…¹MÑ…ÉÑ%¹ÁÕÐ¤èAÉ½µ¥Í”ñÕ¹­¹½Ý¸øì(€€€€€€€ô¤¹ÍÑ…ÉÐ€ô…Íå¹Œ€ ¤€ôøì(€€€€€€€€€€€ÍÑ…ÉÑ•€ôÑÉÕ”ì(€€€€€€€€€€€É•ÑÕÉ¸íôì(€€€€€€€ôì(€€€€€€€½¹ÍÐ¥¹ÁÕÐ€ôÉ•ÑÉå%¹ÁÕÐ¡ìÉ•…±Ñ¥µ•}Ñ…É•Ðèì(€€€€€€€€€€€½É…¹¥é…Ñ¥½¹}¥è€à°Í½Á•}¥è€…Í”èÐÈœ°…Í•}¥è€ÐÈ°ÁÉ¥¹¥Á…±}¥‘ÌèlÍåÍÑ•´éÁ¥±½Ðt°(€€€€€€€ôô¤ì(€€€€€€€…Ý…¥Ð•áÁ•Ð¡½½É‘¥¹…Ñ½È¹ÉÕ¹Q½½µÁ±•Ñ¥½¸¡¥¹ÁÕÐ¤¤¹É•©•ÑÌ¹Ñ½5…Ñ¡=‰©•Ð¡ì½‘”è€Í½Á•}µ¥Íµ…Ñ œô¤ì(€€€€€€€•áÁ•Ð¡ÍÑ…ÉÑ•¤¹Ñ½	”¡™…±Í”¤ì(€€€ô¤ì((€€€¥Ð É•©•ÑÌ•µÁÑäÉ•…±Ñ¥µ”ÁÉ¥¹¥Á…±Ì‰•™½É”‰•¥¹¹¥¹œ½È½µÁ±•Ñ¥¹œ„Ñ…Í¬œ°…Íå¹Œ€ ¤€ôøì(€€€€€€€½¹ÍÐÍ½Á”€ôÉ•ÑÉåM½Á” ¤ì(€€€€€€€½¹ÍÐÑ…Í¬€ôÉ•ÑÉå1¥¹•…” ¤¹Ñ…Í­ÍlÁt„ì(€€€€€€€½¹ÍÐ±…¥´€ôìÉÕ¹}¥è€ÉÕ¸éÉ•ÑÉäœ°Ñ…Í­}¥èÑ…Í¬¹•¹Ù•±½Á”¹Ñ…Í­}¥°Ý½É­•É}¥è€Ý½É­•ÈéÍ½Á”œ°(€€€€€€€€€€€±•…Í•}Ñ½­•¸è€±•…Í”éÍ½Á”œ°…ÑÑ•µÁÐè€Ä°±•…Í•}•áÁ¥É•Í}…Ðè€œÈÀÈØ´ÀÄ´ÀÅPÀÄèÀÀèÀÀ¸ÀÀÁhœ°É•±…¥µ•è™…±Í”°(€€€€€€€€€€€Ñ…Í¬èÑ…Í¬¹•¹Ù•±½Á”ô…ÌÕÉ…‰±•Q…Í­±…¥´ì(€€€€€€€±•Ð‰•…¸€ô€Àì(€€€€€€€±•Ð½µÁ±•Ñ•€ô€Àì(€€€€€€€±•ÐÁÕ‰±¥Í¡•€ô€Àì(€€€€€€€½¹ÍÐÉÕ¹Ì€ôì±…¥µQ…Í¬è…Íå¹Œ€ ¤€ôø±…¥´°‰•¥¹Q…Í¬è…Íå¹Œ€ ¤€ôøì‰•…¸€¬ô€ÄìÉ•ÑÕÉ¸Ñ…Í¬ìô°(€€€€€€€€€€€½µÁ±•Ñ•Q…Í¬è…Íå¹Œ€ ¤€ôøì½µÁ±•Ñ•€¬ô€ÄìÉ•ÑÕÉ¸Ñ…Í¬ìô°(€€€€€€€€€€€™…¥±Q…Í¬è…Íå¹Œ€ ¤€ôøÑ…Í¬ô…ÌÕ¹­¹½Ý¸…ÌIÕ¹MÑ½É”ì(€€€€€€€½¹ÍÐ…Á…‰¥±¥ÑäèÉÑ¥™…Ñ…Á…‰¥±¥ÑåA½ÉÐ€ôì•á•ÕÑ”è…Íå¹Œ€ ¤€ôøì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È …Á…‰¥±¥ÑäÍ¡½Õ±¹½Ð•á•ÕÑ”™½È…¸¥¹Ù…±¥Ñ…É•Ðœ¤ì(€€€€€€€ôôì(€€€€€€€½¹ÍÐÝ½É­•È€ô¹•ÜÕÉ…‰±•½½É‘¥¹…Ñ¥½¹]½É­•È (€€€€€€€€€€€ÉÕ¹Ì°íô…Ì¹•Ù•È°…Á…‰¥±¥Ñä°íô…Ì¹•Ù•È°íô…Ì¹•Ù•È°(€€€€€€€€€€€¹•ÜM½Á•‘I•…±Ñ¥µ•AÕ‰±¥Í¡•È¡ìÁÕ‰±¥Í è…Íå¹Œ€ ¤€ôøìÁÕ‰±¥Í¡•€¬ô€Äìôô¤°(€€€€€€€€€€€¹•ÜM½Á•‘IÕ¹=‰Í•ÉÙ•È¡¹•Ü5•µ½ÉåIÕ¹=‰Í•ÉÙ…Ñ¥½¹M¥¹¬ ¤¤°ì¹½Üè€ ¤€ôø¹•Ü…Ñ” œÈÀÈØ´ÀÄ´ÀÅPÀÀèÄÈèÀÀ¸ÀÀÁhœ¤ô°(€€€€€€€€€€€ìÑ…Í­}±•…Í•}µÌè€ÄÀÀ°‘•±¥Ù•Éå}±•…Í•}µÌè€ÄÀÀ°É•ÑÉå}‘•±…å}µÌè€Äô°(€€€€€€€€¤ì(€€€€€€€…Ý…¥ÐÝ½É­•È¹ÉÕ¹Q…Í­=¹” Ý½É­•ÈéÍ½Á”œ°ì½É…¹¥é…Ñ¥½¹}¥èÍ½Á”¹½É…¹¥é…Ñ¥½¹}¥°(€€€€€€€€€€€Í½Á•}¥èÍ½Á”¹Í½Á•}¥°…Í•}¥èÍ½Á”¹…Í•}¥„°ÁÉ¥¹¥Á…±}¥‘Ìèlœtô¤ì(€€€€€€€•áÁ•Ð¡‰•…¸¤¹Ñ½	” À¤ì(€€€€€€€•áÁ•Ð¡½µÁ±•Ñ•¤¹Ñ½	” À¤ì(€€€€€€€•áÁ•Ð¡ÁÕ‰±¥Í¡•¤¹Ñ½	” À¤ì(€€€ô¤ì)ô¤ì()½¹ÍÐ•µ‰•‘‘•‘¹ÑÉä€ôÁÉ½•ÍÌ¹•¹Ø¹!=UM}5%9Q}5	}A=MQIM}9QId€üüU1Q}5	}9QIdì()‘•ÍÉ¥‰”¹Í­¥Á%˜ …™Ì¹•á¥ÍÑÍMå¹Œ¡•µ‰•‘‘•‘¹ÑÉä¤¤ ‘ÕÉ…‰±”‘¥…¹½Í”µ…¹µÁ±…¸Á¥±½Ð‰É¥‘”œ°€ ¤€ôøì(€€€¥Ð ÉÕ¹ÌÑ¡”™½ÕÈÍÑ…•Ì™É½´½¹™¥Éµ•¥¹ÁÕÑÌ°…‘½ÁÑÌ½¹”°…¹½¹Ù•É•Ì½¹”™…­”•™™•Ðœ°…Íå¹Œ€ ¤€ôøì(€€€€€€€½¹ÍÐ¡…É¹•ÍÌ€ô…Ý…¥ÐÍÑ…ÉÑ1¥Ù•A½ÍÑÉ•Ì¡•µ‰•‘‘•‘¹ÑÉä¤ì(€€€€€€€±•Ð‘…Ñ…‰…Í”€ô¡…É¹•ÍÌ¹‘…Ñ…‰…Í”ì(€€€€€€€ÑÉäì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä IQQ	1ÕÍ•ÉÌ€¡¥MI%0AI%5Id-d¤œ¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä IQQ	1É•Á½ÉÑÌ€¡¥MI%0AI%5Id-d¤œ¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Í•ÉÙ•È½‘ˆ½µ¥É…Ñ¥½¹Ì½Á½ÍÑÉ•Ì¼ÀÀÙ}½É…¹¥é…Ñ¥½¹}…Í•}™½Õ¹‘…Ñ¥½¸¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Í•ÉÙ•È½‘ˆ½µ¥É…Ñ¥½¹Ì½É•½¹ÍÑÉÕÑ¥½¸¼ÀÀÅ}…¹½¹¥…±}…Í•}…ÕÑ¡½É¥Ñä¹Á½ÍÑÉ•Ì¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Á…­…•Ì½Á•ÉÍ¥ÍÑ•¹”½ÍÉŒ½ÉÕ¹Ì¼ÀÀÁ}…Í•}•Ù•¹Ñ}É•‘Õ•É}ØÉ}½µÁ…Ð¹Á½ÍÑÉ•Ì¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Á…­…•Ì½Á•ÉÍ¥ÍÑ•¹”½ÍÉŒ½ÉÕ¹Ì¼ÀÀÅ}‘ÕÉ…‰±•}½½É‘¥¹…Ñ¥½¸¹Á½ÍÑÉ•Ì¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Á…­…•Ì½Á•ÉÍ¥ÍÑ•¹”½ÍÉŒ½ÉÕ¹Ì¼ÀÀÉ}½µÁ½Í¥Ñ¥½¹}±¥™•å±”¹Á½ÍÑÉ•Ì¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Á…­…•Ì½Á•ÉÍ¥ÍÑ•¹”½ÍÉŒ½ÉÕ¹Ì¼ÀÀÍ}•áÑ•É¹…±}¥¹ÁÕÑ}±¥¹•…”¹Á½ÍÑÉ•Ì¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡É•…‘]½É­ÍÁ…” Á…­…•Ì½Á•ÉÍ¥ÍÑ•¹”½ÍÉŒ½½ÕÑ‰½à¼ÀÀÅ}ÑÉ…¹Í…Ñ¥½¹…±}½ÕÑ‰½à¹Á½ÍÑÉ•Ì¹ÍÅ°œ¤¤ì(€€€€€€€€€€€…Ý…¥Ð‘…Ñ…‰…Í”¹ÅÕ•Éä¡%9MIP%9Q<½É…¹¥é…Ñ¥½¹Ì€¡¥±Í±Õœ±¹…µ”¤Y1UL€ Ä°Á¥±½ÐµÄÈœ°A¥±½ÐDÈœ¥€¤ì((€€€€€€€€€€€½¹ÍÐ¹½Ü€ô¹•Ü…Ñ” ¤ì(€€€€€€€€€€€½¹ÍÐ‰…Í•M½Á”€ô€¡…Í•%üè¹Õµ‰•È¤è™™•Ñ¥Ù•M½Á”€ôø™™•Ñ¥Ù•M½Á•M¡•µ„¹Á…ÉÍ”¡ì(€€€€€€€€€€€€€€€Í¡•µ„è€•™™•Ñ¥Ù”µÍ½Á”½ØÄœ…Ì½¹ÍÐ°Í½Á•}¥è…Í•%€ü…Í”è‘í…Í•%‘õ€€è€½É…¹¥é…Ñ¥½¸èÄœ°(€€€€€€€€€€€€€€€Í½Á•}­¥¹è…Í•%€ü€…Í”œ…Ì½¹ÍÐ€è€½É…¹¥é…Ñ¥½¸œ…Ì½¹ÍÐ°½É…¹¥é…Ñ¥½¹}¥è€Ä°(€€€€€€€€€€€€€€€€¸¸¸¡…Í•%€üì…Í•}¥è…Í•%ô€èíô¤°(€€€€€€€€€€€€€€€ÁÉ¥¹¥Á…°èìÁÉ¥¹¥Á…±}¥è€ÍåÍÑ•´éÄÈµÁ¥±½Ðœ°…Ñ½É}­¥¹è€ÍåÍÑ•´œ…Ì½¹ÍÐ°½É…¹¥é…Ñ¥½¹}¥è€Ä°(€€€€€€€€€€€€€€€€€€€É½±”è€ÍåÍÑ•´œ…Ì½¹ÍÐ°…ÕÑ¡•¹Ñ¥…Ñ•‘}…Ðè¹•Ü…Ñ”¡¹½Ü¹•ÑQ¥µ” ¤€´€Å|ÀÀÀ¤¹Ñ½%M=MÑÉ¥¹œ ¤ô°(€€€€€€€€€€€€€€€…Ñ¥½¹ÌèlÉ•…œ°€½¹ÑÉ¥‰ÕÑ”œ°€µ…¹…”œ°€µ•ÍÍ…”œ°€‘¥ÍÁ…Ñ œ°€Ù•É¥™ät°(€€€€€€€€€€€€€€€‘…Ñ…}±…ÍÍ•ÌèlÁÕ‰±¥Œœ°€¥¹Ñ•É¹…°œ°€Á•ÉÍ½¹…°œ°€Í•¹Í¥Ñ¥Ù•}µ•‘¥„œ°€™¥¹…¹¥…°œ°€±•…±}…‘Ù¥Í½Éät°(€€€€€€€€€€€€€€€…Á…‰¥±¥Ñ¥•Ìè=‰©•Ð¹Ù…±Õ•Ì¡A	%1%Qe}%L¤°Ñ½½±}É…¹ÑÌèmt°ÁÕÉÁ½Í•Ìèlµ…¥¹Ñ•¹…¹”‘¥…¹½Í¥Ìt°(€€€€€€€€€€€€€€€É•¥½¸è€¸µÍ½ÕÑ œ°É•Ñ•¹Ñ¥½¹}‘…åÌè€ÌÀ°Á½±¥å}Ù•ÉÍ¥½¸è€Á½±¥äéÄÈµØÄœ°(€€€€€€€€€€€€€€€É•Í½±Ù•‘}…Ðè¹•Ü…Ñ”¡¹½Ü¹•ÑQ¥µ” ¤€´€Å|ÀÀÀ¤¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€€€€€€€€€•áÁ¥É•Í}…Ðè¹•Ü…Ñ”¡¹½Ü¹•ÑQ¥µ” ¤€¬€Í|ØÀÁ|ÀÀÀ¤¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€€€€€ô¤ì(€€€€€€€€€€€€¼¼Q¡”…¹½¹¥…°ÝÉ¥Ñ•È¥Ì¥¹©•Ñ•Ñ¡É½Õ Ñ¡”ÑåÁ•…‘½ÁÑ¥½¸(€€€€€€€€€€€€¼¼Á½ÉÐ‰•±½ÜìÑ¡¥ÌÁ¥±½Ð­••ÁÌ‘½µ…¥¸É•Á½Í¥Ñ½É¥•Ì½ÕÐ½˜Ý½É­•È(€€€€€€€€€€€€¼¼…¹…‘…ÁÑ•ÈÍ½ÕÉ”Ý¡¥±”ÍÑ¥±°ÁÉ½Ù¥¹œ8€´ø8¬Ä…ÕÑ¡½É¥Ñä¸(€€€€€€€€€€€½¹ÍÐ…Í•%€ô€ääì(€€€€€€€€€€€½¹ÍÐÍ½Á”€ô‰…Í•M½Á”¡…Í•%¤ì(€€€€€€€€€€€½¹ÍÐÉ•ÅÕ¥É•‘¡•­Ì€ôlÍ¡•µ„œ°€Í…™•Ñäœ°€ÁÉ¥Ù…äœ°€É½Õ¹‘¥¹œœ°€Í½Á”œ°€½ÍÐt…Ì½¹ÍÐì(€€€€€€€€€€€½¹ÍÐ•áÑ•É¹…±A…å±½…€ôì­¥¹è€Á¡½Ñ¼œ°½¹™¥Éµ•èÑÉÕ”°µ•‘¥…}¡…Í è€„œ¹É•Á•…Ð ØÐ¤ôì(€€€€€€€€€€€½¹ÍÐ•áÑ•É¹…±	½‘ä€ôì(€€€€€€€€€€€€€€€Í¡•µ…}¹…µ”è€½¹™¥Éµ•µ¥¹Ñ…­”½ØÄœ°Í½Á•}¥èÍ½Á”¹Í½Á•}¥°½É…¹¥é…Ñ¥½¹}¥è€Ä°(€€€€€€€€€€€€€€€…Í•}¥è…Í•%°…Í•}Ù•ÉÍ¥½¸è€Ä°ÁÉ½‘Õ•É}ÉÕ¹}¥è€ÉÕ¸é¥¹Ñ…­”éÄÈœ°ÁÉ½‘Õ•É}Ñ…Í­}¥è€Ñ…Í¬é¥¹Ñ…­”éÄÈœ°(€€€€€€€€€€€€€€€¥¹ÁÕÑ}¡…Í¡•Ìèmt°Á…å±½…‘}¡…Í èÍ¡„ÈÔØ¡•áÑ•É¹…±A…å±½…¤°Á½±¥å}Ù•ÉÍ¥½¸èÍ½Á”¹Á½±¥å}Ù•ÉÍ¥½¸°(€€€€€€€€€€€€€€€‘…Ñ…}±…ÍÌè€Á•ÉÍ½¹…°œ…Ì½¹ÍÐ°É•Ñ•¹Ñ¥½¹}‘…åÌè€ÄÐ°ÍÕÁ•ÉÍ•‘•Í}…ÉÑ¥™…Ñ}¥è¹Õ±°°(€€€€€€€€€€€ôì(€€€€€€€€€€€½¹ÍÐ•áÑ•É¹…±ÉÑ¥™…Ð€ôÉÑ¥™…Ñ¹Ù•±½Á•M¡•µ„¹Á…ÉÍ”¡ì(€€€€€€€€€€€€€€€Í¡•µ„è€…•¹Ðµ…ÉÑ¥™…Ð½ØÄœ°…ÉÑ¥™…Ñ}¥è…ÉÑ¥™…Ðè‘íÍ¡„ÈÔØ¡•áÑ•É¹…±	½‘ä¥õ€°(€€€€€€€€€€€€€€€€¸¸¹•áÑ•É¹…±	½‘ä°Á…å±½…è•áÑ•É¹…±A…å±½…°•Ù…±Õ…Ñ¥½¹}ÍÑ…Ñ”è€…•ÁÑ•œ°É•…Ñ•‘}…Ðè¹½Ü¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€€€€€ô¤ì(€€€€€€€€€€€½¹ÍÐ•áÑ•É¹…±Ù…±Õ…Ñ¥½¹	½‘ä€ôì(€€€€€€€€€€€€€€€…ÉÑ¥™…Ñ}¥è•áÑ•É¹…±ÉÑ¥™…Ð¹…ÉÑ¥™…Ñ}¥°•Ù…±Õ…Ñ½É}…Á…‰¥±¥Ñäè€¥¹Ñ…­”¹µ•‘¥„¹É¥Ñ¥Œ¹ØÄœ°(€€€€€€€€€€€€€€€¥¹‘•Á•¹‘•¹Ñ}É½ÕÑ”èÑÉÕ”…Ì½¹ÍÐ°(€€€€€€€€€€€€€€€¡•­ÌèÉ•ÅÕ¥É•‘¡•­Ì¹µ…À ¡¹…µ”¤€ôø€¡ì¹…µ”°ÍÑ…ÑÕÌè€Á…ÍÌœ…Ì½¹ÍÐ°•Ù¥‘•¹•}½‘•Ìèl½¹™¥Éµ•tô¤¤°(€€€€€€€€€€€€€€€‘•¥Í¥½¸è€…•ÁÐœ…Ì½¹ÍÐ°•Ù…±Õ…Ñ•‘}…Ðè¹½Ü¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€€€€€ôì(€€€€€€€€€€€½¹ÍÐ•áÑ•É¹…±Ù…±Õ…Ñ¥½¸€ôì(€€€€€€€€€€€€€€€Í¡•µ„è€•Ù…±Õ…Ñ¥½¸µÉ••¥ÁÐ½ØÄœ…Ì½¹ÍÐ°(€€€€€€€€€€€€€€€•Ù…±Õ…Ñ¥½¹}¥è•Ù…±Õ…Ñ¥½¸è‘íÍ¡„ÈÔØ¡•áÑ•É¹…±Ù…±Õ…Ñ¥½¹	½‘ä¥õ€°(€€€€€€€€€€€€€€€€¸¸¹•áÑ•É¹…±Ù…±Õ…Ñ¥½¹	½‘ä°(€€€€€€€€€€€ôì(€€€€€€€€€€€½¹ÍÐÁÉ½½™	½‘ä€ôì(€€€€€€€€€€€€€€€ÉÕ¹}¥è€ÉÕ¸éÄÈµÁ¥±½Ðœ°½µµ…¹‘}¥è€½µµ…¹éÄÈé‘¥…¹½Í”œ°Í½Á•}¥èÍ½Á”¹Í½Á•}¥°(€€€€€€€€€€€€€€€½É…¹¥é…Ñ¥½¹}¥è€Ä°…Í•}É•˜èì¥è…Í•%°Ù•ÉÍ¥½¸è€Äô°Á½±¥å}Ù•ÉÍ¥½¸èÍ½Á”¹Á½±¥å}Ù•ÉÍ¥½¸°(€€€€€€€€€€€€€€€…ÉÑ¥™…Ñ}¥è•áÑ•É¹…±ÉÑ¥™…Ð¹…ÉÑ¥™…Ñ}¥°•Ù…±Õ…Ñ¥½¹}¥è•áÑ•É¹…±Ù…±Õ…Ñ¥½¸¹•Ù…±Õ…Ñ¥½¹}¥°(€€€€€€€€€€€€€€€‘…Ñ…}±…ÍÌè•áÑ•É¹…±ÉÑ¥™…Ð¹‘…Ñ…}±…ÍÌ°É•Ñ•¹Ñ¥½¹}‘…åÌè•áÑ•É¹…±ÉÑ¥™…Ð¹É•Ñ•¹Ñ¥½¹}‘…åÌ°(€€€€€€€€€€€€€€€ÁÉ½‘Õ•Èèì…Á…‰¥±¥Ñäè€¥¹Ñ…­”¹µ•‘¥„¹½¹™¥É´¹ØÄœ°É½ÕÑ•}¥è€É½ÕÑ”é¥¹Ñ…­”é½¹™¥É´œô°(€€€€€€€€€€€€€€€•Ù…±Õ…Ñ½Èèì…Á…‰¥±¥Ñäè€¥¹Ñ…­”¹µ•‘¥„¹É¥Ñ¥Œ¹ØÄœ°É½ÕÑ•}¥è€É½ÕÑ”é¥¹Ñ…­”éÉ¥Ñ¥Œœô°‰½Õ¹‘}…Ðè¹½Ü¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€€€€€ôì(€€€€€€€€€€€½¹ÍÐÉ½ÕÑ•AÉ½½˜€ôìÍ¡•µ„è€…•¹ÐµÉÕ¸µÉ½ÕÑ”µÁÉ½½˜½ØÄœ…Ì½¹ÍÐ°ÁÉ½½™}¥èÉ½ÕÑ”µÁÉ½½˜è‘íÍ¡„ÈÔØ¡ÁÉ½½™	½‘ä¥õ€°€¸¸¹ÁÉ½½™	½‘äôì(€€€€€€€€€€€½¹ÍÐ¥¹ÁÕÑ	½‘ä€ôì(€€€€€€€€€€€€€€€ÉÕ¹}¥è€ÉÕ¸éÄÈµÁ¥±½Ðœ°½µµ…¹‘}¥è€½µµ…¹éÄÈé‘¥…¹½Í”œ°Í½Á•}¥èÍ½Á”¹Í½Á•}¥°(€€€€€€€€€€€€€€€½É…¹¥é…Ñ¥½¹}¥è€Ä°…Í•}É•˜èì¥è…Í•%°Ù•ÉÍ¥½¸è€Äô°Á½±¥å}Ù•ÉÍ¥½¸èÍ½Á”¹Á½±¥å}Ù•ÉÍ¥½¸°(€€€€€€€€€€€€€€€…ÉÑ¥™…Ðè•áÑ•É¹…±ÉÑ¥™…Ð°•Ù…±Õ…Ñ¥½¸è•áÑ•É¹…±Ù…±Õ…Ñ¥½¸°É½ÕÑ•}ÁÉ½½˜èÉ½ÕÑ•AÉ½½˜°(€€€€€€€€€€€ôì(€€€€€€€€€€€½¹ÍÐ½¹™¥Éµ•€ôì(€€€€€€€€€€€€€€€Í¡•µ„è€…•¹ÐµÉÕ¸µ¥¹ÁÕÐ½ØÄœ…Ì½¹ÍÐ°¥¹ÁÕÑ}¥èÉÕ¸µ¥¹ÁÕÐè‘íÍ¡„ÈÔØ¡¥¹ÁÕÑ	½‘ä¥õ€°€¸¸¹¥¹ÁÕÑ	½‘ä°(€€€€€€€€€€€ôì((€€€€€€€€€€€½¹ÍÐ½ÕÑÁÕÑ½È€ô€¡…Á…‰¥±¥ÑäèÍÑÉ¥¹œ°¥¹ÁÕÑÌèÉ•…‘½¹±äìÍ¡•µ…}¹…µ”èÍÑÉ¥¹œìÁ…å±½…‘}¡…Í èÍÑÉ¥¹œõmt¤€ôøì(€€€€€€€€€€€€€€€¥˜€¡…Á…‰¥±¥Ñä€ôôôA	%1%Qe}%L¹‘¥…¹½Í¥Ì¤É•ÑÕÉ¸ì(€€€€€€€€€€€€€€€€€€€…Ñ•½Éäè€Á±Õµ‰¥¹œœ°Í•Ù•É¥Ñäè€µ½‘•É…Ñ”œ°¥ÍÍÕ•}ÍÕµµ…Éäè€Må¹Ñ¡•Ñ¥Œ±•…¬œ°½¹™¥‘•¹”è€À¸ä°(€€€€€€€€€€€€€€€€€€€½‰Í•ÉÙ…Ñ¥½¹ÌèlMå¹Ñ¡•Ñ¥ŒÁ¡½Ñ¼½¹™¥Éµ•t°Õ¹•ÉÑ…¥¹Ñäè¹Õ±°°•µ•É•¹äè™…±Í”°Í…™•Ñå}Ý…É¹¥¹Ìèmt°(€€€€€€€€€€€€€€€ôì(€€€€€€€€€€€€€€€¥˜€¡…Á…‰¥±¥Ñä€ôôôA	%1%Qe}%L¹É•Á…¥ÉA±…¸¤É•ÑÕÉ¸ì(€€€€€€€€€€€€€€€€€€€ÍÕµµ…Éäèìé¡}¸è€Ÿ–Ï¦^·’úošÂÓ–æÛšŽš~—–¾–ÂŽœ°•¹}ÕÌè€M¡ÕÐ½™˜Ý…Ñ•È…¹¥¹ÍÁ•ÐÑ¡”Í•…°¸œô°(€€€€€€€€€€€€€€€€€€€ÍÑ•ÁÌèmì½É‘•Èè€Ä°¥¹ÍÑÉÕÑ¥½¸èìé¡}¸è€Ÿ–Ï¦^·’úošÂÓŽœ°•¹}ÕÌè€M¡ÕÐ½™˜Ñ¡”Ý…Ñ•È¸œô°Í…™•Ñå}É¥Ñ¥…°è™…±Í”õt°(€€€€€€€€€€€€€€€€€€€Í…™•Ñå}¹½Ñ•Ìèmt°ÁÉ½™•ÍÍ¥½¹…±}É•ÅÕ¥É•è™…±Í”°‘ÕÉ…Ñ¥½¹}µ¥¹ÕÑ•Ìèìµ¥¸è€ÄÀ°µ…àè€ÈÀô°(€€€€€€€€€€€€€€€ôì(€€€€€€€€€€€€€€€¥˜€¡…Á…‰¥±¥Ñä€ôôôA	%1%Qe}%L¹¥¹‘•Á•¹‘•¹ÑÉ¥Ñ¥Œ¤É•ÑÕÉ¸ì(€€€€€€€€€€€€€€€€€€€ÍÕ‰©•Ñ}Í¡•µ…}¹…µ”è¥¹ÁÕÑÍlÁtü¹Í¡•µ…}¹…µ”€üü€µ…¥¹Ñ•¹…¹”µÉ•Á…¥ÈµÁ±…¸½ØÄœ°(€€€€€€€€€€€€€€€€€€€ÍÕ‰©•Ñ}Á…å±½…‘}¡…Í è¥¹ÁÕÑÍlÁtü¹Á…å±½…‘}¡…Í €üü€œÀœ¹É•Á•…Ð ØÐ¤°É½ÕÑ•}¥¹‘•Á•¹‘•¹ÐèÑÉÕ”°(€€€€€€€€€€€€€€€€€€€¡•­Ìèl¸¸¹É•ÅÕ¥É•‘¡•­Ì°€‰¥±¥¹Õ…°t¹µ…À ¡¹…µ”¤€ôø€¡ì¹…µ”°ÍÑ…ÑÕÌè€Á…ÍÌœ…Ì½¹ÍÐ°•Ù¥‘•¹•}½‘•ÌèlÉ¥Ñ¥Œtô¤¤°(€€€€€€€€€€€€€€€€€€€‘•¥Í¥½¸è€…•ÁÐœ°É•Ý½É­}™¥•±‘Ìèmt°±¥•¹Ñ}Ù¥Í¥‰¥±¥Ñäè€¥¹Ñ•É¹…±}½¹±äœ°(€€€€€€€€€€€€€€€ôì(€€€€€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€€€€€€€€€€€­¥¹è€É•Ù¥•Ý}Á±…¸œ°Ñ¥Ñ±”èìé¡}¸è€Ÿ¢¾ß–º‡¦bšZçš† œ°•¹}ÕÌè€I•Ù¥•ÜÑ¡”Á±…¸œô°(€€€€€€€€€€€€€€€€€€€¥¹ÍÑÉÕÑ¥½¸èìé¡}¸è€Ÿ¢¾ß–º‡¦bžîÓ’þ»–îë¢º»Žœ°•¹}ÕÌè€I•Ù¥•ÜÑ¡”É•Á…¥ÈÕ¥‘…¹”¸œô°(€€€€€€€€€€€€€€€€€€€Í…™•Ñå}¹½Ñ¥”è¹Õ±°°•Ù¥‘•¹•}É•ÅÕ•ÍÐè¹Õ±°°É•ÅÕ¥É•Í}¡Õµ…¹}…Ñ¥½¸èÑÉÕ”°(€€€€€€€€€€€€€€€ôì(€€€€€€€€€€€ôì(€€€€€€€€€€€½¹ÍÐ‰¥¹‘¥¹Ì€ô=‰©•Ð¹™É½µ¹ÑÉ¥•Ì¡=‰©•Ð¹Ù…±Õ•Ì¡A	%1%Qe}%L¤¹µ…À ¡…Á…‰¥±¥Ñä¤€ôøm…Á…‰¥±¥Ñä°ì(€€€€€€€€€€€€€€€É½ÕÑ•}¥èÉ½ÕÑ”è‘í…Á…‰¥±¥Ñä¹É•Á±…•±° œ¸œ°€œ´œ¥õ€°(€€€€€€€€€€€€€€€¥¹Ù½­”è…Íå¹Œ€¡É•ÅÕ•ÍÐèì…Á…‰¥±¥ÑäèÍÑÉ¥¹œì¥¹ÁÕÑÌèÉ•…‘½¹±äìÍ¡•µ…}¹…µ”èÍÑÉ¥¹œìÁ…å±½…‘}¡…Í èÍÑÉ¥¹œõmtô¤€ôø€¡ì(€€€€€€€€€€€€€€€€€€€Á…å±½…è½ÕÑÁÕÑ½È¡É•ÅÕ•ÍÐ¹…Á…‰¥±¥Ñä°É•ÅÕ•ÍÐ¹¥¹ÁÕÑÌ¤°ÕÍ…”èìÝ…±±}µÌè€Ä°Ñ½­•¹Ìè€Ä°½ÍÑ}µ¥É½Ìè€Ä°Ñ½½±}…±±Ìè€Àô°(€€€€€€€€€€€€€€€ô¤°(€€€€€€€€€€€õt¤¤…Ì¹•Ù•Èì(€€€€€€€€€€€½¹ÍÐÉ•¥ÍÑÉä€ôÉ•…Ñ•…Á…‰¥±¥Ñå‘…ÁÑ•ÉI•¥ÍÑÉä¡‰¥¹‘¥¹Ì¤ì(€€€€€€€€€€€½¹ÍÐ…Á…‰¥±¥ÑäèÉÑ¥™…Ñ…Á…‰¥±¥ÑåA½ÉÐ€ô¹•ÜI•¥ÍÑÉåÉÑ¥™…Ñ…Á…‰¥±¥ÑåA½ÉÐ¡É•¥ÍÑÉä°¹•ÜÉÑ¥™…Ñ¥¹…±¥é•È¡ì¹½Üè€ ¤€ôø¹•Ü…Ñ” ¤ô¤¤ì(€€€€€€€€€€€½¹ÍÐÉÕ¹MÑ½É”€ô¹•ÜA½ÍÑÉ•ÍIÕ¹MÑ½É”¡‘…Ñ…‰…Í”¤ì(€€€€€€€€€€€½¹ÍÐ½ÕÑ‰½à€ô¹•ÜA½ÍÑÉ•Í=ÕÑ‰½áMÑ½É”¡‘…Ñ…‰…Í”¤ì(€€€€€€€€€€€½¹ÍÐÉ•…±Ñ¥µ•A½ÉÐèI•…±Ñ¥µ•A½ÉÐ€ôìÁÕ‰±¥Í è…Íå¹Œ€ ¤€ôøÕ¹‘•™¥¹•ôì(€€€€€€€€€€€½¹ÍÐ‘•¥Í¥½¹Ìè•¥Í¥½¹M¹…ÁÍ¡½ÑA½ÉÐ€ôì±½…è…Íå¹Œ€¡¥¹Ñ•¹Ð¤€ôø€¡ì(€€€€€€€€€€€€€€€½É…¹¥é…Ñ¥½¹}¥è€Ä°Í½Á•}¥èÍ½Á”¹Í½Á•}¥°…Í•}¥è…Í•%°…Í•}Ù•ÉÍ¥½¸è€È°(€€€€€€€€€€€€€€€Á½±¥å}Ù•ÉÍ¥½¸èÍ½Á”¹Á½±¥å}Ù•ÉÍ¥½¸°‘•¥Í¥½¹}Ù…±¥èÑÉÕ”°‘•±¥Ù•Éå}­¥±±}ÍÝ¥Ñ è™…±Í”°(€€€€€€€€€€€€€€€‘•ÍÑ¥¹…Ñ¥½¸èì‰¥¹‘¥¹}¥è¥¹Ñ•¹Ð¹•¹Ù•±½Á”¹‘•ÍÑ¥¹…Ñ¥½¹}‰¥¹‘¥¹}¥°½É…¹¥é…Ñ¥½¹}¥è€Ä°Í½Á•}¥èÍ½Á”¹Í½Á•}¥°…Í•}¥è…Í•%°…Ñ¥Ù”èÑÉÕ”ô°(€€€€€€€€€€€ô¤ôì(€€€€€€€€€€€½¹ÍÐ‘•±¥Ù•ÉäèMå¹Ñ¡•Ñ¥•±¥Ù•ÉåA½ÉÐ€ôì‘•±¥Ù•Èè…Íå¹Œ€¡ì¥‘•µÁ½Ñ•¹å}­•äô¤€ôø€¡ìÍÑ…ÑÕÌè€‘•±¥Ù•É•œ°•áÑ•É¹…±}É•™•É•¹•}¡…Í èÍ¡„ÈÔØ¡¥‘•µÁ½Ñ•¹å}­•ä¤°É•…Í½¹}½‘”è€™…­”œô¤ôì(€€€€€€€€€€€½¹ÍÐÝ½É­•È€ô¹•ÜÕÉ…‰±•½½É‘¥¹…Ñ¥½¹]½É­•È (€€€€€€€€€€€€€€€ÉÕ¹MÑ½É”°½ÕÑ‰½à°…Á…‰¥±¥Ñä°¹•Ü™™•Ñ…Ñ”¡‘•¥Í¥½¹Ì°ì¹½Üè€ ¤€ôø¹•Ü…Ñ” ¤ô¤°‘•±¥Ù•Éä°(€€€€€€€€€€€€€€€¹•ÜM½Á•‘I•…±Ñ¥µ•AÕ‰±¥Í¡•È¡É•…±Ñ¥µ•A½ÉÐ¤°¹•ÜM½Á•‘IÕ¹=‰Í•ÉÙ•È¡¹•Ü5•µ½ÉåIÕ¹=‰Í•ÉÙ…Ñ¥½¹M¥¹¬ ¤¤°(€€€€€€€€€€€€€€€ì¹½Üè€ ¤€ôø¹•Ü…Ñ” ¤ô°ìÑ…Í­}±•…Í•}µÌè€Õ|ÀÀÀ°‘•±¥Ù•Éå}±•…Í•}µÌè€Õ|ÀÀÀ°É•ÑÉå}‘•±…å}µÌè€Äô°(€€€€€€€€€€€€¤ì(€€€€€€€€€€€½¹ÍÐ½½É‘¥¹…Ñ½È€ô¹•Ü¥…¹½Í•¹‘A±…¹½½É‘¥¹…Ñ½È¡ÉÕ¹MÑ½É”°Ý½É­•È°É•¥ÍÑÉä°¹•ÜÉÑ¥™…Ñ¥¹…±¥é•È¡ì¹½Üè€ ¤€ôø¹•Ü…Ñ” ¤ô¤¤ì(€€€€€€€€€€€½¹ÍÐÉ•ÍÕ±Ð€ô…Ý…¥Ð½½É‘¥¹…Ñ½È¹ÉÕ¹Q½½µÁ±•Ñ¥½¸¡ì(€€€€€€€€€€€€€€€Í•ÍÍ¥½¹}¥è€Í•ÍÍ¥½¸éÄÈµÁ¥±½Ðœ°ÉÕ¹}¥è€ÉÕ¸éÄÈµÁ¥±½Ðœ°½µµ…¹‘}¥è€½µµ…¹éÄÈé‘¥…¹½Í”œ°(€€€€€€€€€€€€€€€…Í•}¥è…Í•%°…Í•}Ù•ÉÍ¥½¸è€Ä°Í½Á”°‰Õ‘•Ðèì…ÑÑ•µÁÑÌè€È°Ý…±±}µÌè€ÌÁ|ÀÀÀ°Ñ½­•¹Ìè€É|ÀÀÀ°½ÍÑ}µ¥É½Ìè€ÔÁ|ÀÀÀ°Ñ½½±}…±±Ìè€Àô°(€€€€€€€€€€€€€€€½¹™¥Éµ•‘}¥¹ÁÕÑÌèm½¹™¥Éµ•‘t°…‘½ÁÑ¥½¸èì•á•ÕÑ”è…Íå¹Œ€¡ì½µµ…¹ô¤€ôøì(€€€€€€€€€€€€€€€€€€€½¹ÍÐ…‘½ÁÑ¥½¸€ô½µµ…¹…Ìì•áÁ•Ñ•‘}Ù•ÉÍ¥½¸üè¹Õµ‰•Èì‰½‘äüèìÑåÁ”üèÍÑÉ¥¹œôôì(€€€€€€€€€€€€€€€€€€€•áÁ•Ð¡…‘½ÁÑ¥½¸¹‰½‘äü¹ÑåÁ”¤¹Ñ½	” ÕÁ‘…Ñ•}…Í”œ¤ì(€€€€€€€€€€€€€€€€€€€É•ÑÕÉ¸ìÉ•Á±…å•è™…±Í”°½µµ…¹‘!…Í èÍ¡„ÈÔØ¡½µµ…¹¤°•Ù•¹Ðèíô°ÁÉ½©•Ñ¥½¸èì¥è…Í•%°Ù•ÉÍ¥½¸è€¡…‘½ÁÑ¥½¸¹•áÁ•Ñ•‘}Ù•ÉÍ¥½¸€üü€À¤€¬€Äôôì(€€€€€€€€€€€€€€€ôô°(€€€€€€€€€€€€€€€…‘½ÁÑ¥½¹}Í½Á”èÍ½Á”°•™™•Ðèì½ÕÑ‰½à°‘•ÍÑ¥¹…Ñ¥½¹}‰¥¹‘¥¹}¥è€‰¥¹‘¥¹œéÄÈœ°¡…¹¹•°è€Ý•ˆœô°(€€€€€€€€€€€ô¤ì(€€€€€€€€€€€•áÁ•Ð¡É•ÍÕ±Ð¹ÁÉ½É•ÍÌ¤¹Ñ½ÅÕ…°¡lÈÔ°€ÔÀ°€ÜÔ°€ÄÀÁt¤ì(€€€€€€€€€€€€¼¼AÉ½‘Õ•ÈÁ±ÕÌ¥¹‘•Á•¹‘•¹ÐÉ¥Ñ¥ŒÕÍ…”¥Ì¡…É•Ñ¼Ñ¡”‘ÕÉ…‰±”(€€€€€€€€€€€€¼¼ÉÕ¸‰Õ‘•ÐìÑ¡”É¥Ñ¥ŒÌ¥¹Ñ•É¹…°¥¹Ù½…Ñ¥½¸…¹¹½Ð‘¥Í…ÁÁ•…È(€€€€€€€€€€€€¼¼‰•¡¥¹Ñ¡”•Ù…±Õ…Ñ½È‰½Õ¹‘…Éä¸(€€€€€€€€€€€•áÁ•Ð¡É•ÍÕ±Ð¹ÉÕ¸¹½¹ÍÕµ•¤¹Ñ½5…Ñ¡=‰©•Ð¡ìÑ½­•¹Ìè€Ü°½ÍÑ}µ¥É½Ìè€Ü°Ñ½½±}…±±Ìè€Àô¤ì(€€€€€€€€€€€•áÁ•Ð¡É•ÍÕ±Ð¹ÉÕ¸¹½¹ÍÕµ•¹Ý…±±}µÌ¤¹Ñ½	•É•…Ñ•ÉQ¡…¹=ÉÅÕ…° Ü¤ì(€€€€€€€€€€€•áÁ•Ð¡É•ÍÕ±Ð¹±¥•¹Ñ}…ÉÑ¥™…Ð¹Á…å±½…¤¹¹½Ð¹Ñ½!…Ù•AÉ½Á•ÉÑä ±¥•¹Ñ}Ù¥Í¥‰¥±¥Ñäœ¤ì(€€€€€€€€€€€•áÁ•Ð¡É•ÍÕ±Ð¹…‘½ÁÑ¥½¸ü¹Ù•ÉÍ¥½¸¤¹Ñ½	” È¤ì(€€€€€€€€€€€•áÁ•Ð¡É•ÍÕ±Ð¹•™™•Ðü¹‘ÕÁ±¥…Ñ”¤¹¹½Ð¹Ñ½	”¡ÑÉÕ”¤ì(€€€€€€€€€€€½¹ÍÐ‘ÕÁ±¥…Ñ•™™•Ð€ô…Ý…¥Ð½ÕÑ‰½à¹•¹ÅÕ•Õ”¡ì(€€€€€€€€€€€€€€€•™™•Ñ}­•äèÁ¥±½Ðµ¹•áÐµ…Ñ¥½¸è‘íÉ•ÍÕ±Ð¹ÉÕ¸¹ÉÕ¹}¥‘õ€°•™™•Ñ}­¥¹è€µ•ÍÍ…”œ°ÉÕ¹}¥èÉ•ÍÕ±Ð¹ÉÕ¸¹ÉÕ¹}¥°(€€€€€€€€€€€€€€€Í½Á•}¥èÍ½Á”¹Í½Á•}¥°Á½±¥å}Ù•ÉÍ¥½¸èÍ½Á”¹Á½±¥å}Ù•ÉÍ¥½¸°…Ñ¥½¸è€•áÑ•É¹…±}µ•ÍÍ…”œ°ÁÉ½Á½Í…±}¡…Í èÉ•ÍÕ±Ð¹•™™•Ð„¹ÁÉ½Á½Í…±}¡…Í °µ…á}…ÑÑ•µÁÑÌè€È°(€€€€€€€€€€€€€€€•¹Ù•±½Á”èÉ•ÍÕ±Ð¹•™™•Ð„¹•¹Ù•±½Á”°(€€€€€€€€€€€ô¤ì(€€€€€€€€€€€•áÁ•Ð¡‘ÕÁ±¥…Ñ•™™•Ð¹‘ÕÁ±¥…Ñ”¤¹Ñ½	”¡ÑÉÕ”¤ì(€€€€€€€€€€€…Ý…¥Ð¡…É¹•ÍÌ¹ÍÑ½À ¤ì(€€€€€€€€€€€‘…Ñ…‰…Í”€ô…Ý…¥Ð¡…É¹•ÍÌ¹É•ÍÑ…ÉÐ ¤ì(€€€€€€€€€€€•áÁ•Ð ¡…Ý…¥Ð¹•ÜA½ÍÑÉ•ÍIÕ¹MÑ½É”¡‘…Ñ…‰…Í”¤¹•Ñ1¥¹•…”¡É•ÍÕ±Ð¹ÉÕ¸¹ÉÕ¹}¥¤¤¹ÉÕ¸¹ÍÑ…ÑÕÌ¤¹Ñ½	” ÍÕ••‘•œ¤ì(€€€€€€€ô™¥¹…±±äì(€€€€€€€€€€€…Ý…¥Ð¡…É¹•ÍÌ¹±•…¹ÕÀ ¤ì(€€€€€€€ô(€€€ô°€ÄÈÁ|ÀÀÀ¤ì)ô¤ì