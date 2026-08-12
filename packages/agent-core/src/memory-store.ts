import {
    AgentRunSchema,
    AgentRunPlanSchema,
    AgentRunInputSchema,
    AgentTaskEnvelopeSchema,
    ArtifactEnvelopeSchema,
    CancellationSignalSchema,
    EffectiveScopeSchema,
    EvaluationReceiptSchema,
    ExecutionBudgetSchema,
    type AgentRun,
    type AgentRunInput,
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

const REQUIRED_INPUT_CHECKS = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

function artifactIdentity(artifact: ArtifactEnvelope): Record<string, unknown> {
    return {
        schema_name: artifact.schema_name, scope_id: artifact.scope_id,
        organization_id: artifact.organization_id, case_id: artifact.case_id,
        case_version: artifact.case_version, producer_run_id: artifact.producer_run_id,
        producer_task_id: artifact.producer_task_id, input_hashes: artifact.input_hashes,
        payload_hash: artifact.payload_hash, policy_version: artifact.policy_version,
        data_class: artifact.data_class, retention_days: artifact.retention_days,
        supersedes_artifact_id: artifact.supersedes_artifact_id,
    };
}

function withoutIdentity<T extends Record<string, unknown>>(value: T, ...keys: string[]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function assertContentAddressedRunInput(input: AgentRunInput): void {
    const artifact = input.artifact;
    if (artifact.payload_hash !== sha256(artifact.payload)
        || artifact.artifact_id !== `artifact:${sha256(artifactIdentity(artifact))}`) {
        throw new RuntimeFault('invalid_artifact', 'External artifact content address is invalid');
    }
    const evaluationBody = withoutIdentity(
        input.evaluation as unknown as Record<string, unknown>, 'schema', 'evaluation_id',
    );
    if (input.evaluation.evaluation_id !== `evaluation:${sha256(evaluationBody)}`
        || input.evaluation.artifact_id !== artifact.artifact_id
        || input.evaluation.decision !== 'accept' || !input.evaluation.independent_route
        || artifact.evaluation_state !== 'accepted') {
        throw new RuntimeFault('invalid_artifact', 'External input requires one content-addressed accepted evaluation');
    }
    const checkNames = new Set(input.evaluation.checks.map((check) => check.name));
    if (checkNames.size !== input.evaluation.checks.length
        || !REQUIRED_INPUT_CHECKS.every((name) => input.evaluation.checks
            .some((check) => check.name === name && check.status === 'pass'))) {
        throw new RuntimeFault('invalid_artifact', 'External input evaluation checks are incomplete or ambiguous');
    }
    const proofBody = withoutIdentity(
        input.route_proof as unknown as Record<string, unknown>, 'schema', 'proof_id',
    );
    if (input.route_proof.proof_id !== `route-proof:${sha256(proofBody)}`) {
        throw new RuntimeFault('invalid_artifact', 'External input route proof content address is invalid');
    }
    const inputBody = withoutIdentity(input as unknown as Record<string, unknown>, 'schema', 'input_id');
    if (input.input_id !== `run-input:${sha256(inputBody)}`) {
        throw new RuntimeFault('invalid_artifact', 'External run input content address is invalid');
    }
}

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
    private readonly externalInputs = new Map<string, AgentRunInput>();
    private readonly externalInputKeys = new Map<string, string>();
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
        for (const run of snapshot.runs) {
            const parsed = AgentRunSchema.parse(clone(run));
            if (parsed.plan && parsed.plan_hash !== sha256(parsed.plan)) {
                throw new RuntimeFault('invalid_state', 'Snapshot run plan identity is corrupt');
            }
            store.runs.set(parsed.run_id, parsed);
        }
        for (const task of snapshot.tasks) store.tasks.set(task.envelope.task_id, clone(task));
        for (const artifact of snapshot.artifacts) store.artifacts.set(artifact.artifact_id, ArtifactEnvelopeSchema.parse(clone(artifact)));
        for (const evaluation of snapshot.evaluations) store.evaluations.set(evaluation.evaluation_id, EvaluationReceiptSchema.parse(clone(evaluation)));
        for (const input of snapshot.external_inputs ?? []) store.acceptExternalInput(input, false);
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
        const plan = input.plan ? AgentRunPlanSchema.parse(clone(input.plan)) : null;
        if (session.scope.policy_version !== input.policy_version || session.scope.case_id !== input.case_id) {
            throw new RuntimeFault('scope_mismatch', 'Run does not match session scope');
        }
        const key = `${session.scope.scope_id}:${input.idempotency_key}`;
        const fingerprintInput: Record<string, unknown> = { ...input, budget };
        if (plan) fingerprintInput.plan = plan;
        else delete fingerprintInput.plan;
        const fingerprint = sha256(fingerprintInput);
        const prior = this.runKeys.get(key);
        if (prior) return this.resolveIdempotent(prior, fingerprint, this.runs, 'run');
        if (this.runs.has(input.run_id)) throw new RuntimeFault('idempotency_conflict', 'Run id already exists');
        const timestamp = this.now();
        const run = AgentRunSchema.parse({
            schema: 'agent-run/v1', run_id: input.run_id, session_id: input.session_id,
            scope_id: session.scope.scope_id, organization_id: session.scope.organization_id,
            case_id: input.case_id, case_version: input.case_version, command_id: input.command_id,
            plan, plan_hash: plan ? sha256(plan) : null,
            status: 'pending', task_ids: [], artifact_ids: [], budget,
            consumed: { attempts: 0, wall_ms: 0, tokens: 0, cost_micros: 0, tool_calls: 0 },
            policy_version: input.policy_version, created_at: timestamp, updated_at: timestamp, terminal_at: null,
        });
        this.runs.set(run.run_id, run);
        this.runKeys.set(key, { id: run.run_id, fingerprint });
        this.append('run.created', run.run_id, null, { session_id: run.session_id, budget: run.budget });
        return clone(run);
    }

    registerExternalInput(value: AgentRunInput): AgentRunInput {
        let input: AgentRunInput;
        try {
            input = AgentRunInputSchema.parse(clone(value));
            assertContentAddressedRunInput(input);
        } catch (error) {
            if (error instanceof RuntimeFault) throw error;
            throw new RuntimeFault('invalid_artifact', 'External run input contract is invalid');
        }
        return this.acceptExternalInput(input, true);
    }

    enqueueTask(value: AgentTaskEnvelope): StoredTask {
        const envelope = AgentTaskEnvelopeSchema.parse(clone(value));
        const run = this.runs.get(envelope.run_id);
        if (!run) throw new RuntimeFault('invalid_state', 'Run does not exist');
        if (envelope.scope_id !== run.scope_id || envelope.organization_id !== run.organization_id
            || envelope.case_ref.id !== run.case_id || envelope.case_ref.version !== run.case_version
            || envelope.policy_version !== run.policy_version) {
            throw new RuntimeFault('scope_mismatch', 'Task does not match run scope, case version, or policy');
        }
        const key = `${run.run_id}:${envelope.idempotency_key}`;
        const fingerprint = sha256(envelope);
        const prior = this.taskKeys.get(key);
        if (prior) return this.resolveIdempotent(prior, fingerprint, this.tasks, 'task');
        if (run.status === 'cancelled' || run.status === 'failed' || run.status === 'succeeded') {
            throw new RuntimeFault('invalid_state', 'Run is terminal');
        }
        const session = this.sessions.get(run.session_id)!;
        if (!session.scope.capabilities.includes(envelope.capability)) {
            throw new RuntimeFault('scope_mismatch', 'Capability is not granted by the session scope');
        }
        const now = this.clock.now().getTime();
        if (Date.parse(envelope.expires_at) <= now || (envelope.not_before && Date.parse(envelope.not_before) >= Date.parse(envelope.expires_at))) {
            throw new RuntimeFault('invalid_state', 'Task scheduling window is invalid');
        }
        this.assertDeclaredPlanTask(run, envelope);
        for (const id of envelope.input_artifact_ids) {
            const artifact = this.artifacts.get(id);
            if (!artifact || artifact.scope_id !== run.scope_id || artifact.organization_id !== run.organization_id
                || artifact.case_id !== run.case_id || artifact.case_version !== run.case_version) {
                throw new RuntimeFault('scope_mismatch', `Input artifact ${id} is absent or out of scope`);
            }
        }
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
            if (task.attempts >= Math.min(task.envelope.budget.attempts, run.budget.attempts)) {
                this.finishFailure(task, 'budget_exceeded', false);
                co×Şö¶‰ËkºwµçD¹Á…ÉÍ”¡±½¹”¡Í¥¹…±Y…±Õ”¤¤ì(€€€€€€€½¹ÍĞÁÉ¥½È€ôÑ¡¥Ì¹…¹•±±…Ñ¥½¹Ì¹•Ğ¡Í¥¹…°¹Í¥¹…±}¥¤ì(€€€€€€€¥˜€¡ÁÉ¥½È¤ì(€€€€€€€€€€€¥˜€¡…¹½¹¥…±)Í½¸¡ÁÉ¥½È¤€„ôô…¹½¹¥…±)Í½¸¡Í¥¹…°¤¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥‘•µÁ½Ñ•¹å}½¹™±¥Ğœ°€M¥¹…°¥İ…ÌÉ•ÕÍ•œ¤ì(€€€€€€€€€€€É•ÑÕÉ¸±½¹”¡ÁÉ¥½È¤ì(€€€€€€€ô(€€€€€€€½¹ÍĞÉÕ¸€ôÑ¡¥Ì¹ÉÕ¹Ì¹•Ğ¡Í¥¹…°¹ÉÕ¹}¥¤ì(€€€€€€€¥˜€ …ÉÕ¸¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€…¹•±±…Ñ¥½¸ÉÕ¸‘½•Ì¹½Ğ•á¥ÍĞœ¤ì(€€€€€€€Ñ¡¥Ì¹…¹•±±…Ñ¥½¹Ì¹Í•Ğ¡Í¥¹…°¹Í¥¹…±}¥°Í¥¹…°¤ì(€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ Í¥¹…°¹É•½É‘•œ°ÉÕ¸¹ÉÕ¹}¥°¹Õ±°°ìÍ¥¹…±}¥èÍ¥¹…°¹Í¥¹…±}¥°É•…Í½¹}½‘”èÍ¥¹…°¹É•…Í½¹}½‘”ô¤ì(€€€€€€€™½È€¡½¹ÍĞÑ…Í­%½˜ÉÕ¸¹Ñ…Í­}¥‘Ì¤ì(€€€€€€€€€€€½¹ÍĞÑ…Í¬€ôÑ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡Ñ…Í­%¤„ì(€€€€€€€€€€€¥˜€¡Ñ¡¥Ì¹¥ÍQ•Éµ¥¹…°¡Ñ…Í¬¹ÍÑ…Ñ”¤¤½¹Ñ¥¹Õ”ì(€€€€€€€€€€€Ñ…Í¬¹ÍÑ…Ñ”€ô€…¹•±±•œì(€€€€€€€€€€€Ñ…Í¬¹±•…Í”€ô¹Õ±°ì(€€€€€€€€€€€Ñ…Í¬¹•ÉÉ½É}½‘”€ô€…¹•±±•œì(€€€€€€€€€€€Ñ…Í¬¹ÕÁ‘…Ñ•‘}…Ğ€ôÑ¡¥Ì¹¹½Ü ¤ì(€€€€€€€€€€€Ñ…Í¬¹Ñ•Éµ¥¹…±}É••¥ÁĞ€ôÑ¡¥Ì¹É••¥ÁĞ¡Ñ…Í¬°€…¹•±±•œ°™…±Í”¤ì(€€€€€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ Ñ…Í¬¹…¹•±±•œ°ÉÕ¸¹ÉÕ¹}¥°Ñ…Í­%°ìÍ¥¹…±}¥èÍ¥¹…°¹Í¥¹…±}¥ô¤ì(€€€€€€€ô(€€€€€€€Ñ¡¥Ì¹Í•ÑIÕ¹MÑ…ÑÕÌ¡ÉÕ¸°€…¹•±±•œ¤ì(€€€€€€€É•ÑÕÉ¸±½¹”¡Í¥¹…°¤ì(€€€ô((€€€•ÑIÕ¸¡¥èÍÑÉ¥¹œ¤è•¹ÑIÕ¸ğÕ¹‘•™¥¹•ì½¹ÍĞÙ…±Õ”€ôÑ¡¥Ì¹ÉÕ¹Ì¹•Ğ¡¥¤ìÉ•ÑÕÉ¸Ù…±Õ”€˜˜±½¹”¡Ù…±Õ”¤ìô(€€€•ÑM•ÍÍ¥½¸¡¥èÍÑÉ¥¹œ¤è•¹ÑM•ÍÍ¥½¸ğÕ¹‘•™¥¹•ì½¹ÍĞÙ…±Õ”€ôÑ¡¥Ì¹Í•ÍÍ¥½¹Ì¹•Ğ¡¥¤ìÉ•ÑÕÉ¸Ù…±Õ”€˜˜±½¹”¡Ù…±Õ”¤ìô(€€€•ÑQ…Í¬¡¥èÍÑÉ¥¹œ¤èMÑ½É•‘Q…Í¬ğÕ¹‘•™¥¹•ì½¹ÍĞÙ…±Õ”€ôÑ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡¥¤ìÉ•ÑÕÉ¸Ù…±Õ”€˜˜±½¹”¡Ù…±Õ”¤ìô(€€€•ÑÉÑ¥™…Ğ¡¥èÍÑÉ¥¹œ¤èÉÑ¥™…Ñ¹Ù•±½Á”ğÕ¹‘•™¥¹•ì½¹ÍĞÙ…±Õ”€ôÑ¡¥Ì¹…ÉÑ¥™…ÑÌ¹•Ğ¡¥¤ìÉ•ÑÕÉ¸Ù…±Õ”€˜˜±½¹”¡Ù…±Õ”¤ìô((€€€•Ñ1¥¹•…”¡ÉÕ¹%èÍÑÉ¥¹œ¤èIÕ¹1¥¹•…”ì(€€€€€€€½¹ÍĞÉÕ¸€ôÑ¡¥Ì¹ÉÕ¹Ì¹•Ğ¡ÉÕ¹%¤ì(€€€€€€€¥˜€ …ÉÕ¸¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€IÕ¸‘½•Ì¹½Ğ•á¥ÍĞœ¤ì(€€€€€€€½¹ÍĞÍ•ÍÍ¥½¸€ôÑ¡¥Ì¹Í•ÍÍ¥½¹Ì¹•Ğ¡ÉÕ¸¹Í•ÍÍ¥½¹}¥¤„ì(€€€€€€€½¹ÍĞÑ…Í­Ì€ôÉÕ¸¹Ñ…Í­}¥‘Ì¹µ…À ¡¥¤€ôø±½¹”¡Ñ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡¥¤„¤¤ì(€€€€€€€½¹ÍĞ…ÉÑ¥™…ÑÌ€ôl¸¸¹Ñ¡¥Ì¹…ÉÑ¥™…ÑÌ¹Ù…±Õ•Ì ¥t¹™¥±Ñ•È ¡¥Ñ•´¤€ôø¥Ñ•´¹ÁÉ½‘Õ•É}ÉÕ¹}¥€ôôôÉÕ¹%¤¹µ…À¡±½¹”¤ì(€€€€€€€½¹ÍĞ…ÉÑ¥™…Ñ%‘Ì€ô¹•ÜM•Ğ¡…ÉÑ¥™…ÑÌ¹µ…À ¡¥Ñ•´¤€ôø¥Ñ•´¹…ÉÑ¥™…Ñ}¥¤¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€€€Í•ÍÍ¥½¸è±½¹”¡Í•ÍÍ¥½¸¤°ÉÕ¸è±½¹”¡ÉÕ¸¤°Ñ…Í­Ì°(€€€€€€€€€€€•áÑ•É¹…±}¥¹ÁÕÑÌèÑ¡¥Ì¹½É‘•É•‘áÑ•É¹…±%¹ÁÕÑÌ¡ÉÕ¸¤°…ÉÑ¥™…ÑÌ°(€€€€€€€€€€€•Ù…±Õ…Ñ¥½¹Ìèl¸¸¹Ñ¡¥Ì¹•Ù…±Õ…Ñ¥½¹Ì¹Ù…±Õ•Ì ¥t¹™¥±Ñ•È ¡¥Ñ•´¤€ôø…ÉÑ¥™…Ñ%‘Ì¹¡…Ì¡¥Ñ•´¹…ÉÑ¥™…Ñ}¥¤(€€€€€€€€€€€€€€€ñğÑ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑ-•åÌ¹¡…Ì¡€‘íÉÕ¹%‘ôè‘í¥Ñ•´¹…ÉÑ¥™…Ñ}¥‘õ€¤¤¹µ…À¡±½¹”¤°(€€€€€€€€€€€…¹•±±…Ñ¥½¹Ìèl¸¸¹Ñ¡¥Ì¹…¹•±±…Ñ¥½¹Ì¹Ù…±Õ•Ì ¥t¹™¥±Ñ•È ¡¥Ñ•´¤€ôø¥Ñ•´¹ÉÕ¹}¥€ôôôÉÕ¹%¤¹µ…À¡±½¹”¤°(€€€€€€€€€€€•Ù•¹ÑÌèÑ¡¥Ì¹•Ù•¹ÑÌ¹™¥±Ñ•È ¡¥Ñ•´¤€ôø¥Ñ•´¹ÉÕ¹}¥€ôôôÉÕ¹%(€€€€€€€€€€€€€€€ñğ€¡¥Ñ•´¹ÑåÁ”€ôôô€Í•ÍÍ¥½¸¹É•…Ñ•œ€˜˜¥Ñ•´¹‘•Ñ…¥±Ì¹Í•ÍÍ¥½¹}¥€ôôôÉÕ¸¹Í•ÍÍ¥½¹}¥¤¤¹µ…À¡±½¹”¤°(€€€€€€€ôì(€€€ô((€€€Í¹…ÁÍ¡½Ğ ¤èIÕ¹Ñ¥µ•M¹…ÁÍ¡½Ğì(€€€€€€€½¹ÍĞÑÉ¥Á±•Ì€ô€¡Í½ÕÉ”è5…ÀñÍÑÉ¥¹œ°%‘•µÁ½Ñ•¹åI•½Éø¤€ôøl¸¸¹Í½ÕÉ”¹•¹ÑÉ¥•Ì ¥t(€€€€€€€€€€€€¹µ…À ¡m­•ä°Ù…±Õ•t¤€ôøm­•ä°Ù…±Õ”¹¥°Ù…±Õ”¹™¥¹•ÉÁÉ¥¹Ñt…Ì½¹ÍĞ¤ì(€€€€€€€É•ÑÕÉ¸±½¹”¡ì(€€€€€€€€€€€Í¡•µ„è€…•¹ĞµÉÕ¹Ñ¥µ”µÍ¹…ÁÍ¡½Ğ½ØÄœ°Í•ÅÕ•¹”èÑ¡¥Ì¹Í•ÅÕ•¹”°(€€€€€€€€€€€Í•ÍÍ¥½¹Ìèl¸¸¹Ñ¡¥Ì¹Í•ÍÍ¥½¹Ì¹Ù…±Õ•Ì ¥t°ÉÕ¹Ìèl¸¸¹Ñ¡¥Ì¹ÉÕ¹Ì¹Ù…±Õ•Ì ¥t°Ñ…Í­Ìèl¸¸¹Ñ¡¥Ì¹Ñ…Í­Ì¹Ù…±Õ•Ì ¥t°(€€€€€€€€€€€…ÉÑ¥™…ÑÌèl¸¸¹Ñ¡¥Ì¹…ÉÑ¥™…ÑÌ¹Ù…±Õ•Ì ¥t°•Ù…±Õ…Ñ¥½¹Ìèl¸¸¹Ñ¡¥Ì¹•Ù…±Õ…Ñ¥½¹Ì¹Ù…±Õ•Ì ¥t°(€€€€€€€€€€€•áÑ•É¹…±}¥¹ÁÕÑÌèl¸¸¹Ñ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑÌ¹Ù…±Õ•Ì ¥t°(€€€€€€€€€€€…¹•±±…Ñ¥½¹Ìèl¸¸¹Ñ¡¥Ì¹…¹•±±…Ñ¥½¹Ì¹Ù…±Õ•Ì ¥t°•Ù•¹ÑÌèÑ¡¥Ì¹•Ù•¹ÑÌ°(€€€€€€€€€€€¥‘•µÁ½Ñ•¹äèìÍ•ÍÍ¥½¹ÌèÑÉ¥Á±•Ì¡Ñ¡¥Ì¹Í•ÍÍ¥½¹-•åÌ¤°ÉÕ¹ÌèÑÉ¥Á±•Ì¡Ñ¡¥Ì¹ÉÕ¹-•åÌ¤°Ñ…Í­ÌèÑÉ¥Á±•Ì¡Ñ¡¥Ì¹Ñ…Í­-•åÌ¤ô°(€€€€€€€ô¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”É•½Ù•ÉáÁ¥É•‘±…¥µÌ ¤èÙ½¥ì(€€€€€€€½¹ÍĞ¹½Ü€ôÑ¡¥Ì¹±½¬¹¹½Ü ¤¹•ÑQ¥µ” ¤ì(€€€€€€€™½È€¡½¹ÍĞÑ…Í¬½˜Ñ¡¥Ì¹Ñ…Í­Ì¹Ù…±Õ•Ì ¤¤ì(€€€€€€€€€€€¥˜€ ¡Ñ…Í¬¹ÍÑ…Ñ”€„ôô€±…¥µ•œ€˜˜Ñ…Í¬¹ÍÑ…Ñ”€„ôô€ÉÕ¹¹¥¹œœ¤ñğ€…Ñ…Í¬¹±•…Í”(€€€€€€€€€€€€€€€ñğ…Ñ”¹Á…ÉÍ”¡Ñ…Í¬¹±•…Í”¹±•…Í•}•áÁ¥É•Í}…Ğ¤€ø¹½Ü¤½¹Ñ¥¹Õ”ì(€€€€€€€€€€€½¹ÍĞ•áÁ¥É•‘±…¥´€ôÑ…Í¬¹±•…Í”ì(€€€€€€€€€€€Ñ…Í¬¹±•…Í”€ô¹Õ±°ì(€€€€€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ ±•…Í”¹•áÁ¥É•œ°Ñ…Í¬¹•¹Ù•±½Á”¹ÉÕ¹}¥°Ñ…Í¬¹•¹Ù•±½Á”¹Ñ…Í­}¥°ì…ÑÑ•µÁĞè•áÁ¥É•‘±…¥´¹…ÑÑ•µÁĞô¤ì(€€€€€€€€€€€½¹ÍĞÉÕ¸€ôÑ¡¥Ì¹ÉÕ¹Ì¹•Ğ¡Ñ…Í¬¹•¹Ù•±½Á”¹ÉÕ¹}¥¤„ì(€€€€€€€€€€€¥˜€¡Ñ…Í¬¹…ÑÑ•µÁÑÌ€øô5…Ñ ¹µ¥¸¡Ñ…Í¬¹•¹Ù•±½Á”¹‰Õ‘•Ğ¹…ÑÑ•µÁÑÌ°ÉÕ¸¹‰Õ‘•Ğ¹…ÑÑ•µÁÑÌ¤¤ì(€€€€€€€€€€€€€€€Ñ¡¥Ì¹™¥¹¥Í¡…¥±ÕÉ”¡Ñ…Í¬°€±•…Í•}•áÁ¥É•œ°™…±Í”¤ì(€€€€€€€€€€€ô•±Í”ì(€€€€€€€€€€€€€€€Ñ…Í¬¹ÍÑ…Ñ”€ô€É•ÑÉå}İ…¥Ğœì(€€€€€€€€€€€€€€€Ñ…Í¬¹•ÉÉ½É}½‘”€ô€±•…Í•}•áÁ¥É•œì(€€€€€€€€€€€€€€€Ñ…Í¬¹ÕÁ‘…Ñ•‘}…Ğ€ôÑ¡¥Ì¹¹½Ü ¤ì(€€€€€€€€€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ Ñ…Í¬¹É•ÑÉå}Í¡•‘Õ±•œ°ÉÕ¸¹ÉÕ¹}¥°Ñ…Í¬¹•¹Ù•±½Á”¹Ñ…Í­}¥°ìÉ•…Í½¸è€±•…Í•}•áÁ¥É•œô¤ì(€€€€€€€€€€€ô(€€€€€€€ô(€€€ô((€€€ÁÉ¥Ù…Ñ”™¥¹¥Í¡…¥±ÕÉ”¡Ñ…Í¬èMÑ½É•‘Q…Í¬°½‘”èIÕ¹Ñ¥µ•ÉÉ½É½‘”°É•ÑÉå…‰±”è‰½½±•…¸¤èQ…Í­á•ÕÑ¥½¹I••¥ÁĞì(€€€€€€€½¹ÍĞÉÕ¸€ôÑ¡¥Ì¹ÉÕ¹Ì¹•Ğ¡Ñ…Í¬¹•¹Ù•±½Á”¹ÉÕ¹}¥¤„ì(€€€€€€€Ñ…Í¬¹±•…Í”€ô¹Õ±°ì(€€€€€€€Ñ…Í¬¹•ÉÉ½É}½‘”€ô½‘”ì(€€€€€€€Ñ…Í¬¹ÕÁ‘…Ñ•‘}…Ğ€ôÑ¡¥Ì¹¹½Ü ¤ì(€€€€€€€¥˜€¡É•ÑÉå…‰±”€˜˜Ñ…Í¬¹…ÑÑ•µÁÑÌ€ğ5…Ñ ¹µ¥¸¡Ñ…Í¬¹•¹Ù•±½Á”¹‰Õ‘•Ğ¹…ÑÑ•µÁÑÌ°ÉÕ¸¹‰Õ‘•Ğ¹…ÑÑ•µÁÑÌ¤¤ì(€€€€€€€€€€€Ñ…Í¬¹ÍÑ…Ñ”€ô€É•ÑÉå}İ…¥Ğœì(€€€€€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ Ñ…Í¬¹É•ÑÉå}Í¡•‘Õ±•œ°ÉÕ¸¹ÉÕ¹}¥°Ñ…Í¬¹•¹Ù•±½Á”¹Ñ…Í­}¥°ìÉ•…Í½¸è½‘”°¹•áÑ}…ÑÑ•µÁĞèÑ…Í¬¹…ÑÑ•µÁÑÌ€¬€Äô¤ì(€€€€€€€€€€€É•ÑÕÉ¸Ñ¡¥Ì¹É••¥ÁĞ¡Ñ…Í¬°½‘”°™…±Í”¤ì(€€€€€€€ô(€€€€€€€Ñ…Í¬¹ÍÑ…Ñ”€ô€™…¥±•œì(€€€€€€€½¹ÍĞÉ••¥ÁĞ€ôÑ¡¥Ì¹É••¥ÁĞ¡Ñ…Í¬°½‘”°™…±Í”¤ì(€€€€€€€Ñ…Í¬¹Ñ•Éµ¥¹…±}É••¥ÁĞ€ôÉ••¥ÁĞì(€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ Ñ…Í¬¹™…¥±•œ°ÉÕ¸¹ÉÕ¹}¥°Ñ…Í¬¹•¹Ù•±½Á”¹Ñ…Í­}¥°ìÉ•…Í½¸è½‘”°…ÑÑ•µÁĞèÑ…Í¬¹…ÑÑ•µÁÑÌô¤ì(€€€€€€€™½È€¡½¹ÍĞÍ¥‰±¥¹%½˜ÉÕ¸¹Ñ…Í­}¥‘Ì¤ì(€€€€€€€€€€€½¹ÍĞÍ¥‰±¥¹œ€ôÑ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡Í¥‰±¥¹%¤„ì(€€€€€€€€€€€¥˜€¡Í¥‰±¥¹œ€ôôôÑ…Í¬ñğÑ¡¥Ì¹¥ÍQ•Éµ¥¹…°¡Í¥‰±¥¹œ¹ÍÑ…Ñ”¤¤½¹Ñ¥¹Õ”ì(€€€€€€€€€€€Í¥‰±¥¹œ¹ÍÑ…Ñ”€ô€…¹•±±•œìÍ¥‰±¥¹œ¹±•…Í”€ô¹Õ±°ìÍ¥‰±¥¹œ¹•ÉÉ½É}½‘”€ô½‘”ìÍ¥‰±¥¹œ¹ÕÁ‘…Ñ•‘}…Ğ€ôÑ¡¥Ì¹¹½Ü ¤ì(€€€€€€€€€€€Í¥‰±¥¹œ¹Ñ•Éµ¥¹…±}É••¥ÁĞ€ôÑ¡¥Ì¹É••¥ÁĞ¡Í¥‰±¥¹œ°½‘”°™…±Í”¤ì(€€€€€€€€€€€Ñ¡¥Ì¹…ÁÁ•¹ Ñ…Í¬¹…¹•±±•œ°ÉÕ¸¹ÉÕ¹}¥°Í¥‰±¥¹%°ìÉ•…Í½¸è€ÉÕ¹}™…¥±•œô¤ì(€€€€€€€ô(€€€€€€€Ñ¡¥Ì¹Í•ÑIÕ¹MÑ…ÑÕÌ¡ÉÕ¸°€™…¥±•œ¤ì(€€€€€€€É•ÑÕÉ¸É••¥ÁĞì(€€€ô((€€€ÁÉ¥Ù…Ñ”É•™É•Í¡IÕ¸¡ÉÕ¸è•¹ÑIÕ¸¤èÙ½¥ì(€€€€€€€½¹ÍĞÑ…Í­Ì€ôÉÕ¸¹Ñ…Í­}¥‘Ì¹µ…À ¡¥¤€ôøÑ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡¥¤„¤ì(€€€€€€€½¹ÍĞ‘•±…É•‘½µÁ±•Ñ”€ôÉÕ¸¹Á±…¸(€€€€€€€€€€€€üÉÕ¸¹Á±…¸¹Ñ…Í­Ì¹•Ù•Éä ¡Á±…¹¹•¤€ôøÑ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡Á±…¹¹•¹Ñ…Í­}¥¤ü¹ÍÑ…Ñ”€ôôô€ÍÕ••‘•œ¤(€€€€€€€€€€€€èÑ…Í­Ì¹±•¹Ñ €ø€À€˜˜Ñ…Í­Ì¹•Ù•Éä ¡Ñ…Í¬¤€ôøÑ…Í¬¹ÍÑ…Ñ”€ôôô€ÍÕ••‘•œ¤ì(€€€€€€€¥˜€¡‘•±…É•‘½µÁ±•Ñ”¤Ñ¡¥Ì¹Í•ÑIÕ¹MÑ…ÑÕÌ¡ÉÕ¸°€ÍÕ••‘•œ¤ì(€€€€€€€•±Í”¥˜€¡Ñ…Í­Ì¹Í½µ” ¡Ñ…Í¬¤€ôøÑ…Í¬¹ÍÑ…Ñ”€ôôô€™…¥±•œñğÑ…Í¬¹ÍÑ…Ñ”€ôôô€•áÁ¥É•œ¤¤Ñ¡¥Ì¹Í•ÑIÕ¹MÑ…ÑÕÌ¡ÉÕ¸°€™…¥±•œ¤ì(€€€€€€€•±Í”Ñ¡¥Ì¹Í•ÑIÕ¹MÑ…ÑÕÌ¡ÉÕ¸°€ÉÕ¹¹¥¹œœ¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”…ÍÍ•ÉÑ•±…É•‘A±…¹Q…Í¬¡ÉÕ¸è•¹ÑIÕ¸°•¹Ù•±½Á”è•¹ÑQ…Í­¹Ù•±½Á”¤èÙ½¥ì(€€€€€€€¥˜€ …ÉÕ¸¹Á±…¸¤É•ÑÕÉ¸ì(€€€€€€€½¹ÍĞ‘•±…É•€ôÉÕ¸¹Á±…¸¹Ñ…Í­Ì¹™¥¹ ¡Ñ…Í¬¤€ôøÑ…Í¬¹Ñ…Í­}¥€ôôô•¹Ù•±½Á”¹Ñ…Í­}¥¤ì(€€€€€€€¥˜€ …‘•±…É•¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€Q…Í¬¥Ì¹½Ğ‘•±…É•‰äÑ¡”¥µµÕÑ…‰±”ÉÕ¸Á±…¸œ¤ì(€€€€€€€¥˜€¡‘•±…É•¹…Á…‰¥±¥Ñä€„ôô•¹Ù•±½Á”¹…Á…‰¥±¥Ñä¤ì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥‘•µÁ½Ñ•¹å}½¹™±¥Ğœ°€Q…Í¬…Á…‰¥±¥Ñä‘¥™™•ÉÌ™É½´Ñ¡”¥µµÕÑ…‰±”ÉÕ¸Á±…¸œ¤ì(€€€€€€€ô(€€€€€€€½¹ÍĞ•áÑ•É¹…±ÉÑ¥™…ÑÌ€ô‘•±…É•¹•áÑ•É¹…±}¥¹ÁÕÑ}…ÉÑ¥™…Ñ}¥‘Ì€üümtì(€€€€€€€™½È€¡½¹ÍĞ…ÉÑ¥™…Ñ%½˜•áÑ•É¹…±ÉÑ¥™…ÑÌ¤ì(€€€€€€€€€€€¥˜€ …Ñ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑ-•åÌ¹¡…Ì¡€‘íÉÕ¸¹ÉÕ¹}¥‘ôè‘í…ÉÑ¥™…Ñ%‘õ€¤¤ì(€€€€€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°A±…¸•áÑ•É¹…°¥¹ÁÕĞ€‘í…ÉÑ¥™…Ñ%‘ô¥Ì¹½ĞÉ•¥ÍÑ•É•‘€¤ì(€€€€€€€€€€€ô(€€€€€€€ô(€€€€€€€½¹ÍĞ‘•Á•¹‘•¹åÉÑ¥™…ÑÌ€ô‘•±…É•¹‘•Á•¹‘Í}½¹}Ñ…Í­}¥‘Ì¹µ…À ¡Ñ…Í­%¤€ôøì(€€€€€€€€€€€½¹ÍĞ‘•Á•¹‘•¹ä€ôÑ¡¥Ì¹Ñ…Í­Ì¹•Ğ¡Ñ…Í­%¤ì(€€€€€€€€€€€¥˜€ …‘•Á•¹‘•¹äñğ‘•Á•¹‘•¹ä¹•¹Ù•±½Á”¹ÉÕ¹}¥€„ôôÉÕ¸¹ÉÕ¹}¥ñğ‘•Á•¹‘•¹ä¹ÍÑ…Ñ”€„ôô€ÍÕ••‘•œ(€€€€€€€€€€€€€€€ñğ€…‘•Á•¹‘•¹ä¹½ÕÑÁÕÑ}…ÉÑ¥™…Ñ}¥¤ì(€€€€€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°A±…¸‘•Á•¹‘•¹ä€‘íÑ…Í­%‘ô¡…Ì¹½ĞÁÉ½‘Õ•…¸…•ÁÑ•…ÉÑ¥™…Ñ€¤ì(€€€€€€€€€€€ô(€€€€€€€€€€€É•ÑÕÉ¸‘•Á•¹‘•¹ä¹½ÕÑÁÕÑ}…ÉÑ¥™…Ñ}¥ì(€€€€€€€ô¤ì(€€€€€€€½¹ÍĞ•áÁ•Ñ•‘ÉÑ¥™…ÑÌ€ôl¸¸¹•áÑ•É¹…±ÉÑ¥™…ÑÌ°€¸¸¹‘•Á•¹‘•¹åÉÑ¥™…ÑÍtì(€€€€€€€¥˜€¡…¹½¹¥…±)Í½¸¡•áÁ•Ñ•‘ÉÑ¥™…ÑÌ¤€„ôô…¹½¹¥…±)Í½¸¡•¹Ù•±½Á”¹¥¹ÁÕÑ}…ÉÑ¥™…Ñ}¥‘Ì¤¤ì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€Q…Í¬¥¹ÁÕĞ…ÉÑ¥™…ÑÌ‘¼¹½Ğµ…Ñ ½É‘•É••áÑ•É¹…°¥¹ÁÕÑÌ…¹‘•Á•¹‘•¹¥•Ìœ¤ì(€€€€€€€ô(€€€ô((€€€ÁÉ¥Ù…Ñ”…•ÁÑáÑ•É¹…±%¹ÁÕĞ¡Ù…±Õ”è•¹ÑIÕ¹%¹ÁÕĞ°…ÁÁ•¹‘Ù•¹Ğè‰½½±•…¸¤è•¹ÑIÕ¹%¹ÁÕĞì(€€€€€€€±•Ğ¥¹ÁÕĞè•¹ÑIÕ¹%¹ÁÕĞì(€€€€€€€ÑÉäì(€€€€€€€€€€€¥¹ÁÕĞ€ô•¹ÑIÕ¹%¹ÁÕÑM¡•µ„¹Á…ÉÍ”¡±½¹”¡Ù…±Õ”¤¤ì(€€€€€€€€€€€…ÍÍ•ÉÑ½¹Ñ•¹Ñ‘‘É•ÍÍ•‘IÕ¹%¹ÁÕĞ¡¥¹ÁÕĞ¤ì(€€€€€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€€€€€€€¥˜€¡•ÉÉ½È¥¹ÍÑ…¹•½˜IÕ¹Ñ¥µ•…Õ±Ğ¤Ñ¡É½Ü•ÉÉ½Èì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}…ÉÑ¥™…Ğœ°€áÑ•É¹…°ÉÕ¸¥¹ÁÕĞ½¹ÑÉ…Ğ¥Ì¥¹Ù…±¥œ¤ì(€€€€€€€ô(€€€€€€€½¹ÍĞÉÕ¸€ôÑ¡¥Ì¹ÉÕ¹Ì¹•Ğ¡¥¹ÁÕĞ¹ÉÕ¹}¥¤ì(€€€€€€€¥˜€ …ÉÕ¸ñğ€…ÉÕ¸¹Á±…¸¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€áÑ•É¹…°¥¹ÁÕÑÌÉ•ÅÕ¥É”…¸¥µµÕÑ…‰±”‘•±…É•ÉÕ¸Á±…¸œ¤ì(€€€€€€€½¹ÍĞÍ•ÍÍ¥½¸€ôÑ¡¥Ì¹Í•ÍÍ¥½¹Ì¹•Ğ¡ÉÕ¸¹Í•ÍÍ¥½¹}¥¤ì(€€€€€€€¥˜€ …Í•ÍÍ¥½¸¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€áÑ•É¹…°¥¹ÁÕĞÍ•ÍÍ¥½¸¥Ì…‰Í•¹Ğœ¤ì(€€€€€€€¥˜€¡¥¹ÁÕĞ¹½µµ…¹‘}¥€„ôôÉÕ¸¹½µµ…¹‘}¥ñğ¥¹ÁÕĞ¹Í½Á•}¥€„ôôÉÕ¸¹Í½Á•}¥(€€€€€€€€€€€ñğ¥¹ÁÕĞ¹½É…¹¥é…Ñ¥½¹}¥€„ôôÉÕ¸¹½É…¹¥é…Ñ¥½¹}¥ñğ¥¹ÁÕĞ¹…Í•}É•˜¹¥€„ôôÉÕ¸¹…Í•}¥(€€€€€€€€€€€ñğ¥¹ÁÕĞ¹…Í•}É•˜¹Ù•ÉÍ¥½¸€„ôôÉÕ¸¹…Í•}Ù•ÉÍ¥½¸ñğ¥¹ÁÕĞ¹Á½±¥å}Ù•ÉÍ¥½¸€„ôôÉÕ¸¹Á½±¥å}Ù•ÉÍ¥½¸(€€€€€€€€€€€ñğ¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹ÁÉ½‘Õ•É}ÉÕ¹}¥€ôôôÉÕ¸¹ÉÕ¹}¥(€€€€€€€€€€€ñğ€…Í•ÍÍ¥½¸¹Í½Á”¹‘…Ñ…}±…ÍÍ•Ì¹¥¹±Õ‘•Ì¡¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹‘…Ñ…}±…ÍÌ¤(€€€€€€€€€€€ñğ¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹É•Ñ•¹Ñ¥½¹}‘…åÌ€øÍ•ÍÍ¥½¸¹Í½Á”¹É•Ñ•¹Ñ¥½¹}‘…åÌ¤ì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ Í½Á•}µ¥Íµ…Ñ œ°€áÑ•É¹…°¥¹ÁÕĞ…ÕÑ¡½É¥Ñä‘¥™™•ÉÌ™É½´¥ÑÌÉÕ¸½ÈÍ•ÍÍ¥½¸œ¤ì(€€€€€€€ô(€€€€€€€¥˜€ …ÉÕ¸¹Á±…¸¹Ñ…Í­Ì¹Í½µ” ¡Ñ…Í¬¤€ôøÑ…Í¬¹•áÑ•É¹…±}¥¹ÁÕÑ}…ÉÑ¥™…Ñ}¥‘Ìü¹¥¹±Õ‘•Ì¡¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹…ÉÑ¥™…Ñ}¥¤¤¤ì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€áÑ•É¹…°…ÉÑ¥™…Ğ¥Ì¹½Ğ‘•±…É•‰äÑ¡”¥µµÕÑ…‰±”ÉÕ¸Á±…¸œ¤ì(€€€€€€€ô(€€€€€€€½¹ÍĞ­•ä€ô€‘íÉÕ¸¹ÉÕ¹}¥‘ôè‘í¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹…ÉÑ¥™…Ñ}¥‘õ€ì(€€€€€€€½¹ÍĞÁÉ¥½É%€ôÑ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑ-•åÌ¹•Ğ¡­•ä¤ì(€€€€€€€½¹ÍĞÁÉ¥½È€ôÑ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑÌ¹•Ğ¡¥¹ÁÕĞ¹¥¹ÁÕÑ}¥¤ì(€€€€€€€¥˜€¡ÁÉ¥½É%ñğÁÉ¥½È¤ì(€€€€€€€€€€€½¹ÍĞÍ•±•Ñ•€ôÁÉ¥½È€üüÑ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑÌ¹•Ğ¡ÁÉ¥½É%„¤ì(€€€€€€€€€€€¥˜€ …Í•±•Ñ•ñğÍ•±•Ñ•¹¥¹ÁÕÑ}¥€„ôô¥¹ÁÕĞ¹¥¹ÁÕÑ}¥ñğ…¹½¹¥…±)Í½¸¡Í•±•Ñ•¤€„ôô…¹½¹¥…±)Í½¸¡¥¹ÁÕĞ¤¤ì(€€€€€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥‘•µÁ½Ñ•¹å}½¹™±¥Ğœ°€áÑ•É¹…°¥¹ÁÕĞ¥‘•¹Ñ¥Ñä¥Ì¥µµÕÑ…‰±”œ¤ì(€€€€€€€€€€€ô(€€€€€€€€€€€É•ÑÕÉ¸±½¹”¡Í•±•Ñ•¤ì(€€€€€€€ô(€€€€€€€¥˜€¡…ÁÁ•¹‘Ù•¹Ğ€˜˜€¡ÉÕ¸¹Ñ…Í­}¥‘Ì¹±•¹Ñ €ø€ÀñğlÍÕ••‘•œ°€…¹•±±•œ°€™…¥±•t¹¥¹±Õ‘•Ì¡ÉÕ¸¹ÍÑ…ÑÕÌ¤¤¤ì(€€€€€€€€€€€Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€9•Ü•áÑ•É¹…°¥¹ÁÕÑÌµÕÍĞ‰”É•¥ÍÑ•É•‰•™½É”Ñ…Í¬•¹ÅÕ•Õ”œ¤ì(€€€€€€€ô(€€€€€€€Ñ¡¥Ì¹ÁÕÑ%µµÕÑ…‰±”¡Ñ¡¥Ì¹…ÉÑ¥™…ÑÌ°¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹…ÉÑ¥™…Ñ}¥°¥¹ÁÕĞ¹…ÉÑ¥™…Ğ°€…ÉÑ¥™…Ğœ¤ì(€€€€€€€Ñ¡¥Ì¹ÁÕÑ%µµÕÑ…‰±”¡Ñ¡¥Ì¹•Ù…±Õ…Ñ¥½¹Ì°¥¹ÁÕĞ¹•Ù…±Õ…Ñ¥½¸¹•Ù…±Õ…Ñ¥½¹}¥°¥¹ÁÕĞ¹•Ù…±Õ…Ñ¥½¸°€•Ù…±Õ…Ñ¥½¸œ¤ì(€€€€€€€Ñ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑÌ¹Í•Ğ¡¥¹ÁÕĞ¹¥¹ÁÕÑ}¥°±½¹”¡¥¹ÁÕĞ¤¤ì(€€€€€€€Ñ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑ-•åÌ¹Í•Ğ¡­•ä°¥¹ÁÕĞ¹¥¹ÁÕÑ}¥¤ì(€€€€€€€¥˜€¡…ÁÁ•¹‘Ù•¹Ğ¤Ñ¡¥Ì¹…ÁÁ•¹ •áÑ•É¹…±}¥¹ÁÕĞ¹É•¥ÍÑ•É•œ°ÉÕ¸¹ÉÕ¹}¥°¹Õ±°°ì(€€€€€€€€€€€¥¹ÁÕÑ}¥è¥¹ÁÕĞ¹¥¹ÁÕÑ}¥°…ÉÑ¥™…Ñ}¥è¥¹ÁÕĞ¹…ÉÑ¥™…Ğ¹…ÉÑ¥™…Ñ}¥°(€€€€€€€€€€€•Ù…±Õ…Ñ¥½¹}¥è¥¹ÁÕĞ¹•Ù…±Õ…Ñ¥½¸¹•Ù…±Õ…Ñ¥½¹}¥°ÁÉ½½™}¥è¥¹ÁÕĞ¹É½ÕÑ•}ÁÉ½½˜¹ÁÉ½½™}¥°(€€€€€€€ô¤ì(€€€€€€€É•ÑÕÉ¸±½¹”¡¥¹ÁÕĞ¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”½É‘•É•‘áÑ•É¹…±%¹ÁÕÑÌ¡ÉÕ¸è•¹ÑIÕ¸¤è•¹ÑIÕ¹%¹ÁÕÑmtì(€€€€€€€½¹ÍĞ½É‘•É•‘%‘Ì€ôl¸¸¹¹•ÜM•Ğ¡ÉÕ¸¹Á±…¸ü¹Ñ…Í­Ì¹™±…Ñ5…À ¡Ñ…Í¬¤€ôøÑ…Í¬¹•áÑ•É¹…±}¥¹ÁÕÑ}…ÉÑ¥™…Ñ}¥‘Ì€üümt¤€üümt¥tì(€€€€€€€É•ÑÕÉ¸½É‘•É•‘%‘Ì¹™±…Ñ5…À ¡…ÉÑ¥™…Ñ%¤€ôøì(€€€€€€€€€€€½¹ÍĞ¥¹ÁÕÑ%€ôÑ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑ-•åÌ¹•Ğ¡€‘íÉÕ¸¹ÉÕ¹}¥‘ôè‘í…ÉÑ¥™…Ñ%‘õ€¤ì(€€€€€€€€€€€½¹ÍĞ¥¹ÁÕĞ€ô¥¹ÁÕÑ%€üÑ¡¥Ì¹•áÑ•É¹…±%¹ÁÕÑÌ¹•Ğ¡¥¹ÁÕÑ%¤€èÕ¹‘•™¥¹•ì(€€€€€€€€€€€É•ÑÕÉ¸¥¹ÁÕĞ€üm±½¹”¡¥¹ÁÕĞ¥t€èmtì(€€€€€€€ô¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”Í•ÑIÕ¹MÑ…ÑÕÌ¡ÉÕ¸è•¹ÑIÕ¸°ÍÑ…ÑÕÌè•¹ÑIÕ¹lÍÑ…ÑÕÌt¤èÙ½¥ì(€€€€€€€½¹ÍĞÁÉ¥½È€ôÉÕ¸¹ÍÑ…ÑÕÌì(€€€€€€€ÉÕ¸¹ÍÑ…ÑÕÌ€ôÍÑ…ÑÕÌì(€€€€€€€ÉÕ¸¹ÕÁ‘…Ñ•‘}…Ğ€ôÑ¡¥Ì¹¹½Ü ¤ì(€€€€€€€ÉÕ¸¹Ñ•Éµ¥¹…±}…Ğ€ôÍÑ…ÑÕÌ€ôôô€ÍÕ••‘•œñğÍÑ…ÑÕÌ€ôôô€…¹•±±•œñğÍÑ…ÑÕÌ€ôôô€™…¥±•œ€üÉÕ¸¹ÕÁ‘…Ñ•‘}…Ğ€è¹Õ±°ì(€€€€€€€•¹ÑIÕ¹M¡•µ„¹Á…ÉÍ”¡ÉÕ¸¤ì(€€€€€€€¥˜€¡ÁÉ¥½È€„ôôÍÑ…ÑÕÌ¤Ñ¡¥Ì¹…ÁÁ•¹ ÉÕ¸¹ÍÑ…ÑÕÍ}¡…¹•œ°ÉÕ¸¹ÉÕ¹}¥°¹Õ±°°ì™É½´èÁÉ¥½È°Ñ¼èÍÑ…ÑÕÌô¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”…ÍÍ•ÉÑÑ¥Ù•±…¥´¡Ñ…Í¬èMÑ½É•‘Q…Í¬°±…¥´è1•…Í•±…¥´¤èÙ½¥ì(€€€€€€€¥˜€ …Ñ…Í¬¹±•…Í”ñğÑ…Í¬¹±•…Í”¹±•…Í•}Ñ½­•¸€„ôô±…¥´¹±•…Í•}Ñ½­•¸ñğÑ…Í¬¹±•…Í”¹İ½É­•É}¥€„ôô±…¥´¹İ½É­•É}¥(€€€€€€€€€€€ñğÑ…Í¬¹±•…Í”¹…ÑÑ•µÁĞ€„ôô±…¥´¹…ÑÑ•µÁĞ¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}±…¥´œ°€1•…Í”Ñ½­•¸¥ÌÍÑ…±”½Èµ¥Íµ…Ñ¡•œ¤ì(€€€€€€€¥˜€¡…Ñ”¹Á…ÉÍ”¡Ñ…Í¬¹±•…Í”¹±•…Í•}•áÁ¥É•Í}…Ğ¤€ğôÑ¡¥Ì¹±½¬¹¹½Ü ¤¹•ÑQ¥µ” ¤¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ±•…Í•}•áÁ¥É•œ°€1•…Í”•áÁ¥É•œ°ÑÉÕ”¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”Ù…±¥‘…Ñ•UÍ…”¡ÕÍ…”èIÕ¹Ñ¥µ•UÍ…”¤èIÕ¹Ñ¥µ•UÍ…”ì(€€€€€€€™½È€¡½¹ÍĞÙ…±Õ”½˜=‰©•Ğ¹Ù…±Õ•Ì¡ÕÍ…”¤¤ì(€€€€€€€€€€€¥˜€ …9Õµ‰•È¹¥Í%¹Ñ••È¡Ù…±Õ”¤ñğÙ…±Õ”€ğ€À¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ‰Õ‘•Ñ}•á••‘•œ°€UÍ…”µÕÍĞ‰”™¥¹¥Ñ”¹½¸µ¹•…Ñ¥Ù”¥¹Ñ••ÉÌœ¤ì(€€€€€€€ô(€€€€€€€É•ÑÕÉ¸±½¹”¡ÕÍ…”¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”É••¥ÁĞ¡Ñ…Í¬èMÑ½É•‘Q…Í¬°•ÉÉ½ÈèIÕ¹Ñ¥µ•ÉÉ½É½‘”ğ¹Õ±°°‘ÕÁ±¥…Ñ”è‰½½±•…¸¤èQ…Í­á•ÕÑ¥½¹I••¥ÁĞì(€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€€€ÉÕ¹}¥èÑ…Í¬¹•¹Ù•±½Á”¹ÉÕ¹}¥°Ñ…Í­}¥èÑ…Í¬¹•¹Ù•±½Á”¹Ñ…Í­}¥°…ÑÑ•µÁĞèÑ…Í¬¹…ÑÑ•µÁÑÌ°(€€€€€€€€€€€ÍÑ…Ñ”èÑ…Í¬¹ÍÑ…Ñ”°…ÉÑ¥™…Ñ}¥èÑ…Í¬¹½ÕÑÁÕÑ}…ÉÑ¥™…Ñ}¥°(€€€€€€€€€€€•Ù…±Õ…Ñ¥½¹}¥èÑ…Í¬¹•Ù…±Õ…Ñ¥½¹}¥‘Ì¹…Ğ ´Ä¤€üü¹Õ±°°•ÉÉ½É}½‘”è•ÉÉ½È°‘ÕÁ±¥…Ñ”°(€€€€€€€ôì(€€€ô((€€€ÁÉ¥Ù…Ñ”…ÁÁ•¹¡ÑåÁ”èÍÑÉ¥¹œ°ÉÕ¹%èÍÑÉ¥¹œğ¹Õ±°°Ñ…Í­%èÍÑÉ¥¹œğ¹Õ±°°‘•Ñ…¥±ÌèI•½ÉñÍÑÉ¥¹œ°Õ¹­¹½İ¸ø¤èÙ½¥ì(€€€€€€€Ñ¡¥Ì¹Í•ÅÕ•¹”€¬ô€Äì(€€€€€€€Ñ¡¥Ì¹•Ù•¹ÑÌ¹ÁÕÍ ¡ì(€€€€€€€€€€€•Ù•¹Ñ}¥è•Ù•¹Ğè‘íMÑÉ¥¹œ¡Ñ¡¥Ì¹Í•ÅÕ•¹”¤¹Á…‘MÑ…ÉĞ à°€œÀœ¥õ€°Í•ÅÕ•¹”èÑ¡¥Ì¹Í•ÅÕ•¹”°(€€€€€€€€€€€½ÕÉÉ•‘}…ĞèÑ¡¥Ì¹¹½Ü ¤°ÑåÁ”°ÉÕ¹}¥èÉÕ¹%°Ñ…Í­}¥èÑ…Í­%°‘•Ñ…¥±Ìè±½¹”¡‘•Ñ…¥±Ì¤°(€€€€€€€ô¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”É•Í½±Ù•%‘•µÁ½Ñ•¹ĞñPø¡ÁÉ¥½Èè%‘•µÁ½Ñ•¹åI•½É°™¥¹•ÉÁÉ¥¹ĞèÍÑÉ¥¹œ°Í½ÕÉ”è5…ÀñÍÑÉ¥¹œ°Pø°­¥¹èÍÑÉ¥¹œ¤èPì(€€€€€€€¥˜€¡ÁÉ¥½È¹™¥¹•ÉÁÉ¥¹Ğ€„ôô™¥¹•ÉÁÉ¥¹Ğ¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥‘•µÁ½Ñ•¹å}½¹™±¥Ğœ°€‘í­¥¹‘ô¥‘•µÁ½Ñ•¹ä­•äİ…ÌÉ•ÕÍ•‘€¤ì(€€€€€€€½¹ÍĞÙ…±Õ”€ôÍ½ÕÉ”¹•Ğ¡ÁÉ¥½È¹¥¤ì(€€€€€€€¥˜€ …Ù…±Õ”¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}ÍÑ…Ñ”œ°€‘í­¥¹‘ô¥‘•µÁ½Ñ•¹ä¥¹‘•à¥Ì½ÉÉÕÁÑ€¤ì(€€€€€€€É•ÑÕÉ¸±½¹”¡Ù…±Õ”¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”ÁÕÑ%µµÕÑ…‰±”ñPø¡Í½ÕÉ”è5…ÀñÍÑÉ¥¹œ°Pø°¥èÍÑÉ¥¹œ°Ù…±Õ”èP°­¥¹èÍÑÉ¥¹œ¤èÙ½¥ì(€€€€€€€½¹ÍĞÁÉ¥½È€ôÍ½ÕÉ”¹•Ğ¡¥¤ì(€€€€€€€¥˜€¡ÁÉ¥½È€˜˜…¹½¹¥…±)Í½¸¡ÁÉ¥½È¤€„ôô…¹½¹¥…±)Í½¸¡Ù…±Õ”¤¤Ñ¡É½Ü¹•ÜIÕ¹Ñ¥µ•…Õ±Ğ ¥¹Ù…±¥‘}…ÉÑ¥™…Ğœ°€‘í­¥¹‘ô¥‘•¹Ñ¥Ñä¥Ì¥µµÕÑ…‰±•€¤ì(€€€€€€€¥˜€ …ÁÉ¥½È¤Í½ÕÉ”¹Í•Ğ¡¥°±½¹”¡Ù…±Õ”¤¤ì(€€€ô((€€€ÁÉ¥Ù…Ñ”¥ÍQ•Éµ¥¹…°¡ÍÑ…Ñ”èMÑ½É•‘Q…Í­lÍÑ…Ñ”t¤è‰½½±•…¸ì(€€€€€€€É•ÑÕÉ¸ÍÑ…Ñ”€ôôô€ÍÕ••‘•œñğÍÑ…Ñ”€ôôô€…¹•±±•œñğÍÑ…Ñ”€ôôô€™…¥±•œñğÍÑ…Ñ”€ôôô€•áÁ¥É•œì(€€€ô((€€€ÁÉ¥Ù…Ñ”¹½Ü ¤èÍÑÉ¥¹œìÉ•ÑÕÉ¸Ñ¡¥Ì¹±½¬¹¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ìô)ô