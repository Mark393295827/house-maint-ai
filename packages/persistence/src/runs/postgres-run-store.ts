import { createHash, randomUUID } from 'node:crypto';
import {
    AgentRunSchema,
    AgentRunInputSchema,
    AgentRunPlanSchema,
    AgentTaskEnvelopeSchema,
    ArtifactEnvelopeSchema,
    CancellationSignalSchema,
    EffectiveScopeSchema,
    EvaluationReceiptSchema,
    ExecutionBudgetSchema,
    type AgentRun,
    type AgentRunInput,
    type AgentRunPlan,
    type AgentTaskEnvelope,
    type ArtifactEnvelope,
    type EvaluationReceipt,
} from '@house-maint/contracts';
import {
    CoordinationStoreError,
    type CancellationSignal,
    type CoordinationClock,
    type CreateDurableRun,
    type DurableRunLineage,
    type DurableSession,
    type DurableTask,
    type DurableTaskClaim,
    type IdSource,
    type OpenDurableSession,
    type RunStore,
    type SqlClient,
    type TaskCompletion,
    type TransactionalSql,
} from './types.js';

interface SessionRow {
    session_id: string;
    scope_json: unknown;
    fingerprint: string;
    created_at: string | Date;
}

interface RunRow {
    run_id: string;
    session_id: string;
    organization_id: number | string;
    scope_id: string;
    case_id: number | string;
    case_version: number | string;
    command_id: string;
    policy_version: string;
    status: AgentRun['status'];
    budget_json: unknown;
    consumed_json: unknown;
    fingerprint: string;
    created_at: string | Date;
    updated_at: string | Date;
    terminal_at: string | Date | null;
}

interface TaskRow {
    task_id: string;
    run_id: string;
    envelope_json: unknown;
    fingerprint: string;
    state: DurableTask['state'];
    attempt_count: number | string;
    lease_owner: string | null;
    lease_token: string | null;
    lease_expires_at: string | Date | null;
    output_artifact_id: string | null;
    evaluation_id: string | null;
    error_code: string | null;
    created_at: string | Date;
    updated_at: string | Date;
}

interface PlanRow {
    run_id: string;
    plan_id: string;
    plan_hash: string;
    plan_json: unknown;
    created_at: string | Date;
}

interface RunInputRow {
    input_id: string;
    run_id: string;
    command_id: string;
    organization_id: number | string;
    scope_id: string;
    case_id: number | string;
    case_version: number | string;
    policy_version: string;
    artifact_id: string;
    evaluation_id: string;
    proof_id: string;
    input_hash: string;
    artifact_hash: string;
    evaluation_hash: string;
    route_proof_hash: string;
    input_json: unknown;
    created_at: string | Date;
}

const systemClock: CoordinationClock = { now: () => new Date() };
const randomIds: IdSource = { next: (prefix) => `${prefix}:${randomUUID()}` };

function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function fingerprint(value: unknown): string {
    return createHash('sha256').update(stable(value)).digest('hex');
}

function legacyJsonFingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const REQUIRED_INPUT_CHECKS = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

function withoutIdentity<T extends Record<string, unknown>>(value: T, ...keys: string[]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function artifactIdentity(artifact: AgentRunInput['artifact']): Record<string, unknown> {
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

function assertAcceptedEvaluation(evaluation: AgentRunInput['evaluation']): void {
    const checkNames = new Set(evaluation.checks.map((check) => check.name));
    if (evaluation.decision !== 'accept' || !evaluation.independent_route
        || checkNames.size !== evaluation.checks.length
        || !REQUIRED_INPUT_CHECKS.every((name) => evaluation.checks
            .some((check) => check.name === name && check.status === 'pass'))) {
        throw new CoordinationStoreError('invalid_artifact', 'A complete independent accepted evaluation is required');
    }
}

function assertScopeActive(scope: {
    expires_at: string;
}, now: Date): void {
    if (Date.parse(scope.expires_at) <= now.getTime()) {
        throw new CoordinationStoreError('scope_mismatch', 'Scope is expired');
    }
}

function assertTaskSchedule(task: AgentTaskEnvelope, now: Date): void {
    const expiresAt = Date.parse(task.expires_at);
    if (expiresAt <= now.getTime()
        || (task.not_before !== undefined && Date.parse(task.not_before) >= expiresAt)) {
        throw new CoordinationStoreError('invalid_state', 'Task scheduling window is invalid');
    }
}

function assertStoredArtifactIdentity(
    artifact: ArtifactEnvelope,
    declaredPlan: AgentRunPlan | null,
): void {
    const canonicalPayloadHash = fingerprint(artifact.payload);
    const legacyPayloadHash = legacyJsonFingerprint(artifact.payload);
    if (artifact.payload_hash !== canonicalPayloadHash
        && (declaredPlan || artifact.payload_hash !== legacyPayloadHash)) {
        throw new CoordinationStoreError('invalid_artifact', 'Artifact payload hash is invalid');
    }
    if (declaredPlan && artifact.artifact_id !== `artifact:${fingerprint(artifactIdentity(artifact))}`) {
        throw new CoordinationStoreError('invalid_artifact', 'Declared-plan artifact content address is invalid');
    }
}

function assertStoredEvaluationIdentity(
    evaluation: EvaluationReceipt,
    declaredPlan: AgentRunPlan | null,
): void {
    if (!declaredPlan) return;
    // Route-bound evaluation IDs include producer/evaluator route proof bytes,
    // which are intentionally not persisted in EvaluationReceipt. Persistence
    // therefore validates the stable content-address shape and lets the
    // ArtifactFinalizer verify the full route-bound identity before completion.
    if (!/^evaluation:[a-f0-9]{64}$/.test(evaluation.evaluation_id)) {
        throw new CoordinationStoreError('invalid_artifact', 'Declared-plan evaluation content address is invalid');
    }
}

function assertContentAddressedRunInput(input: AgentRunInput): void {
    const artifact = input.artifact;
    if (artifact.payload_hash !== fingerprint(artifact.payload)
        || artifact.artifact_id !== `artifact:${fingerprint(artifactIdentity(artifact))}`) {
        throw new CoordinationStoreError('invalid_artifact', 'External artifact content address is invalid');
    }
    assertAcceptedEvaluation(input.evaluation);
    const evaluationBody = withoutIdentity(
        input.evaluation as unknown as Record<string, unknown>, 'schema', 'evaluation_id',
    );
    if (input.evaluation.evaluation_id !== `evaluation:${fingerprint(evaluationBody)}`
        || input.evaluation.artifact_id !== artifact.artifact_id
        || artifact.evaluation_state !== 'accepted') {
        throw new CoordinationStoreError('invalid_artifact', 'External input evaluation content address is invalid');
    }
    const proofBody = withoutIdentity(
        input.route_proof as unknown as Record<string, unknown>, 'schema', 'proof_id',
    );
    if (input.route_proof.proof_id !== `route-proof:${fingerprint(proofBody)}`) {
        throw new CoordinationStoreError('invalid_artifact', 'External route proof content address is invalid');
    }
    const inputBody = withoutIdentity(input as unknown as Record<string, unknown>, 'schema', 'input_id');
    if (input.input_id !== `run-input:${fingerprint(inputBody)}`) {
        throw new CoordinationStoreError('invalid_artifact', 'External run input content address is invalid');
    }
}

function json(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { throw new CoordinationStoreError('invalid_state', 'Stored JSON is malformed'); }
}

function iso(value: string | Date | null): string | null {
    if (value === null) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(parsed.getTime())) throw new CoordinationStoreError('invalid_state', 'Stored instant is invalid');
    return parsed.toISOString();
}

function integer(value: unknown, label: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) throw new CoordinationStoreError('invalid_state', `${label} is invalid`);
    return parsed;
}

function sessionFrom(row: SessionRow): DurableSession {
    const scope = EffectiveScopeSchema.parse(json(row.scope_json));
    if (row.fingerprint !== fingerprint({ session_id: row.session_id, scope })) {
        throw new CoordinationStoreError('invalid_state', 'Stored session identity is corrupt');
    }
    return {
        schema: 'agent-session/v1',
        session_id: row.session_id,
        scope,
        created_at: iso(row.created_at)!,
    };
}

function taskFrom(row: TaskRow): DurableTask {
    const envelope = AgentTaskEnvelopeSchema.parse(json(row.envelope_json));
    if (row.fingerprint !== fingerprint(envelope)) {
        throw new CoordinationStoreError('invalid_state', 'Stored task identity is corrupt');
    }
    return {
        envelope,
        state: row.state,
        attempts: integer(row.attempt_count, 'attempt count'),
        lease_owner: row.lease_owner,
        lease_token: row.lease_token,
        lease_expires_at: iso(row.lease_expires_at),
        output_artifact_id: row.output_artifact_id,
        evaluation_id: row.evaluation_id,
        error_code: row.error_code,
        created_at: iso(row.created_at)!,
        updated_at: iso(row.updated_at)!,
    };
}

function runInputFrom(row: RunInputRow): AgentRunInput {
    const input = AgentRunInputSchema.parse(json(row.input_json));
    assertContentAddressedRunInput(input);
    if (row.input_hash !== fingerprint(input)
        || row.artifact_hash !== fingerprint(input.artifact)
        || row.evaluation_hash !== fingerprint(input.evaluation)
        || row.route_proof_hash !== fingerprint(input.route_proof)
        || row.input_id !== input.input_id || row.run_id !== input.run_id
        || row.command_id !== input.command_id || row.artifact_id !== input.artifact.artifact_id
        || row.evaluation_id !== input.evaluation.evaluation_id || row.proof_id !== input.route_proof.proof_id) {
        throw new CoordinationStoreError('invalid_state', 'Stored external input bytes are corrupt');
    }
    return input;
}

function runFrom(
    row: RunRow,
    taskIds: string[] = [],
    artifactIds: string[] = [],
    plan: AgentRunPlan | null = null,
    planHash: string | null = null,
): AgentRun {
    return AgentRunSchema.parse({
        schema: 'agent-run/v1', run_id: row.run_id, session_id: row.session_id,
        scope_id: row.scope_id, organization_id: integer(row.organization_id, 'organization id'),
        case_id: integer(row.case_id, 'case id'), case_version: integer(row.case_version, 'case version'),
        command_id: row.command_id, plan, plan_hash: planHash,
        status: row.status, task_ids: taskIds, artifact_ids: artifactIds,
        budget: json(row.budget_json), consumed: json(row.consumed_json), policy_version: row.policy_version,
        created_at: iso(row.created_at), updated_at: iso(row.updated_at), terminal_at: iso(row.terminal_at),
    });
}

function assertLease(row: TaskRow, claim: DurableTaskClaim, now: Date): void {
    if (row.run_id !== claim.run_id || row.task_id !== claim.task_id
        || row.lease_owner !== claim.worker_id || row.lease_token !== claim.lease_token
        || integer(row.attempt_count, 'attempt count') !== claim.attempt) {
        throw new CoordinationStoreError('invalid_claim', 'Lease is stale or belongs to another worker');
    }
    if (!row.lease_expires_at || Date.parse(String(row.lease_expires_at)) <= now.getTime()) {
        throw new CoordinationStoreError('lease_expired', 'Lease expired before commit');
    }
}

const SESSION_COLUMNS = 'session_id, scope_json, fingerprint, created_at';
const RUN_COLUMNS = `run_id, session_id, organization_id, scope_id, case_id, case_version,
    command_id, policy_version, status, budget_json, consumed_json, fingerprint,
    created_at, updated_at, terminal_at`;
const TASK_COLUMNS = `task_id, run_id, envelope_json, fingerprint, state, attempt_count,
    lease_owner, lease_token, lease_expires_at, output_artifact_id, evaluation_id,
    error_code, created_at, updated_at`;
const RUN_INPUT_COLUMNS = `input_id, run_id, command_id, organization_id, scope_id, case_id,
    case_version, policy_version, artifact_id, evaluation_id, proof_id, input_hash,
    artifact_hash, evaluation_hash, route_proof_hash, input_json, created_at`;

export class PostgresRunStore implements RunStore {
    constructor(
        private readonly database: TransactionalSql,
        private readonly clock: CoordinationClock = systemClock,
        private readonly ids: IdSource = randomIds,
    ) {}

    async openSession(input: OpenDurableSession): Promise<DurableSession> {
        const scope = EffectiveScopeSchema.parse(input.scope);
        assertScopeActive(scope, this.clock.now());
        const hash = fingerprint({ session_id: input.session_id, scope });
        return this.database.withTransaction(async (client) => {
            await this.lockKey(client, `session:${scope.organization_id}:${scope.scope_id}:${input.idempotency_key}`);
            const prior = await client.query<SessionRow>(
                `SELECT ${SESSION_COLUMNS} FROM hm_agent_sessions
                  WHERE organization_id=$1 AND scope_id=$2 AND idempotency_key=$3`,
                [scope.organization_id, scope.scope_id, input.idempotency_key],
            );
            if (prior.rows[0]) return this.same(prior.rows[0], hash, sessionFrom, 'session');
            const now = this.clock.now().toISOString();
            const inserted = await client.query<SessionRow>(
                `INSERT INTO hm_agent_sessions (
                    session_id, organization_id, scope_id, case_id, policy_version,
                    idempotency_key, fingerprint, scope_json, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
                RETURNING ${SESSION_×_5öÚ$z{-®éÜj×¢'6VEF6·3°¢6öç7BF6´–G2Ò÷&FW&VEF6·2æÖ‚‡F6²’ÓâF6²æVçfVÆ÷RçF6µö–B“°¢&WGW&â°¢6W76–öã¢6W76–öäg&öÒ‡6W76–öå&÷w2ç&÷w5³Ò’À¢'Vã¢'Väg&öÒ€¢'Vå&÷rÀ¢F6´–G2À¢'6VD'F–f7G2æÖ‚†—FVÒ’Óâ—FVÒæ'F–f7Eö–B’À¢7F÷&VEÆãòçÆâóòçVÆÂÀ¢7F÷&VEÆãòæ†6‚óòçVÆÂÀ¢’À¢F6·3¢÷&FW&VEF6·2ÂW‡FW&æÅö–çWG3¢÷&FW&VD–çWG2Â'F–f7G3¢'6VD'F–f7G2À¢òò&÷WFRÖ&÷VæBWfÇVF–öâ”G2–æ6ÇVFR&ööbf–VÆG2F†B&Ræ÷B'@¢òòöbF†RW'6—7FVB&V6V—BâW†—7F–ær&÷w2&RF†W&Vf÷&R'6VBæ@¢òò&WGW&æVB†W&S²F†Rw&—FW"öf–æÆ—¦W"Væf÷&6W2F†RgVÆÂ&ööb&Vf÷&P¢òòæWrFV6Æ&VB×Æâ6ö×ÆWF–öâ—266WFVBà¢WfÇVF–öç3¢WfÇVF–öç2ç&÷w2æÖ‚‡&÷r’ÓâWfÇVF–öå&V6V—E66†VÖç'6R†§6öâ‡&÷rç&V6V—Eö§6öâ’’’À¢6–væÇ3¢6–væÇ2ç&÷w2æÖ‚‡&÷r’Óâ6æ6VÆÆF–öå6–væÅ66†VÖç'6R†§6öâ‡&÷rç6–væÅö§6öâ’’26æ6VÆÆF–öå6–væÂ’À¢WfVçG3¢WfVçG2ç&÷w2æÖ‚‡&÷r’Óâ‡°¢WfVçEö–C¢&÷ræWfVçEö–BÂ6WVVæ6S¢–çFVvW"‡&÷rç6WVVæ6RÂvWfVçB6WVVæ6Rr’ÂWfVçE÷G—S¢&÷ræWfVçE÷G—RÀ¢'Våö–C¢&÷rç'Våö–BÂF6µö–C¢&÷rçF6µö–BÂö67W'&VEöC¢—6ò‡&÷ræö67W'&VEöB’À¢FWF–Ç3¢§6öâ‡&÷ræFWF–Ç5ö§6öâ’2&V6÷&CÇ7G&–ærÂVæ¶æ÷vãâÀ¢Ò’’À¢Ó°¢Ğ ¢&—fFR7–æ2ÆåF&ÆTW†—7G2†6Æ–VçC¢7Ä6Æ–VçB“¢&öÖ—6SÆ&ööÆVãâ°¢6öç7B&W7VÇBÒv—B6Æ–VçBçVW'“Ç²æÖS¢7G&–ærÂçVÆÂÓâ€¢4TÄT5BFõ÷&Vv6Æ72‚v†ÕövVçE÷'Vå÷Æç2r“£§FW‡B2æÖVÀ¢“°¢&WGW&â&W7VÇBç&÷w5³ÓòææÖRÓÒçVÆÂbb&W7VÇBç&÷w5³ÓòææÖRÓÒVæFVf–æVC°¢Ğ ¢&—fFR7–æ2'Vä–çWEF&ÆTW†—7G2†6Æ–VçC¢7Ä6Æ–VçB“¢&öÖ—6SÆ&ööÆVãâ°¢6öç7B&W7VÇBÒv—B6Æ–VçBçVW'“Ç²æÖS¢7G&–ærÂçVÆÂÓâ€¢4TÄT5BFõ÷&Vv6Æ72‚v†ÕövVçE÷'Våö–çWG2r“£§FW‡B2æÖVÀ¢“°¢&WGW&â&W7VÇBç&÷w5³ÓòææÖRÓÒçVÆÂbb&W7VÇBç&÷w5³ÓòææÖRÓÒVæFVf–æVC°¢Ğ ¢&—fFR7–æ2ÆöEÆâ€¢6Æ–VçC¢7Ä6Æ–VçBÀ¢'Vä–C¢7G&–ærÀ¢“¢&öÖ—6SÇ²Æã¢vVçE'VåÆã²†6ƒ¢7G&–ærÒÂçVÆÃâ°¢–b‚v—BF†—2çÆåF&ÆTW†—7G2†6Æ–VçB’’&WGW&âçVÆÃ°¢6öç7B6VÆV7FVBÒv—B6Æ–VçBçVW'“ÅÆå&÷sâ€¢4TÄT5B'Våö–BÂÆåö–BÂÆåö†6‚ÂÆåö§6öâÂ7&VFVEö@¢e$ôÒ†ÕövVçE÷'Vå÷Æç2t„U$R'Våö–CÒCÀ¢·'Vä–EÒÀ¢“°¢6öç7B&÷rÒ6VÆV7FVBç&÷w5³Ó°¢–b‚&÷r’&WGW&âçVÆÃ°¢6öç7BÆâÒvVçE'VåÆå66†VÖç'6R†§6öâ‡&÷rçÆåö§6öâ’“°¢6öç7B6ö×WFVBÒf–ævW'&–çB‡Æâ“°¢–b†6ö×WFVBÓÒ&÷rçÆåö†6‚ÇÂÆâçÆåö–BÓÒ&÷rçÆåö–B’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–çfÆ–E÷7FFRrÂu7F÷&VB'VâÆâ–FVçF—G’—26÷''WBr“°¢Ğ¢&WGW&â²ÆâÂ†6ƒ¢6ö×WFVBÓ°¢Ğ ¢&—fFR7–æ276W'DFV6Æ&VEÆåF6²€¢6Æ–VçC¢7Ä6Æ–VçBÀ¢'Vã¢'Vå&÷rÀ¢F6³¢vVçEF6´VçfVÆ÷RÀ¢“¢&öÖ—6SÇfö–Câ°¢6öç7B7F÷&VEÆâÒv—BF†—2æÆöEÆâ†6Æ–VçBÂ'Vâç'Våö–B“°¢–b‚7F÷&VEÆâ’&WGW&ã°¢6öç7BFV6Æ&VBÒ7F÷&VEÆâçÆâçF6·2æf–æB‚†6æF–FFR’Óâ6æF–FFRçF6µö–BÓÓÒF6²çF6µö–B“°¢–b‚FV6Æ&VB’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–çfÆ–E÷7FFRrÂuF6²—2æ÷BFV6Æ&VB'’F†R–Ö×WF&ÆR'VâÆâr“°¢Ğ¢–b†FV6Æ&VBæ6&–Æ—G’ÓÒF6²æ6&–Æ—G’’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–FV×÷FVæ7•ö6öæfÆ–7BrÂuF6²6&–Æ—G’F–ffW'2g&öÒF†R–Ö×WF&ÆR'VâÆâr“°¢Ğ¢6öç7BW‡FW&æÄ'F–f7G2ÒFV6Æ&VBæW‡FW&æÅö–çWEö'F–f7Eö–G2óòµÓ°¢–b†W‡FW&æÄ'F–f7G2æÆVæwF‚’°¢–b‚v—BF†—2ç'Vä–çWEF&ÆTW†—7G2†6Æ–VçB’’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–çfÆ–E÷7FFRrÂtFV6Æ&VBW‡FW&æÂ–çWB7F÷&vR—2Væf–Æ&ÆRr“°¢Ğ¢6öç7B7F÷&VD–çWG2Òv—B6Æ–VçBçVW'“Å'Vä–çWE&÷sâ€¢4TÄT5BGµ%Tåô”åUEô4ôÅTÔå7Òe$ôÒ†ÕövVçE÷'Våö–çWG0¢t„U$R'Våö–CÒCäB'F–f7Eö–BÒå’‚C#£§FW‡EµÒ–À¢·'Vâç'Våö–BÂW‡FW&æÄ'F–f7G5ÒÀ¢“°¢6öç7B'”'F–f7BÒæWrÖ‡7F÷&VD–çWG2ç&÷w2æÖ‚‡&÷r’Óâ°¢6öç7B–çWBÒ'Vä–çWDg&öÒ‡&÷r“°¢&WGW&â¶–çWBæ'F–f7Bæ'F–f7Eö–BÂ–çWEÒ26öç7C°¢Ò’“°¢f÷"†6öç7B'F–f7D–BöbW‡FW&æÄ'F–f7G2’°¢–b‚'”'F–f7Bæ†2†'F–f7D–B’’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–çfÆ–E÷7FFRrÂÆâW‡FW&æÂ–çWBG¶'F–f7D–GÒ—2æ÷B&Vv—7FW&VF“°¢Ğ¢Ğ¢Ğ¢6öç7BFWVæFVæ6–W2ÒFV6Æ&VBæFWVæG5ööå÷F6µö–G2æÆVæwF€¢òv—B6Æ–VçBçVW'“Ç²F6µö–C¢7G&–æs²7FFS¢GW&&ÆUF6µ²w7FFRuÓ²÷WGWEö'F–f7Eö–C¢7G&–ærÂçVÆÂÓâ€¢4TÄT5BF6µö–BÂ7FFRÂ÷WGWEö'F–f7Eö–Be$ôÒ†ÕövVçE÷F6·0¢t„U$R'Våö–CÒCäBF6µö–BÒå’‚C#£§FW‡EµÒ–À¢·'Vâç'Våö–BÂFV6Æ&VBæFWVæG5ööå÷F6µö–G5ÒÀ¢¢¢²&÷w3¢µÒÂ&÷t6÷VçC¢Ó°¢6öç7B'”–BÒæWrÖ†FWVæFVæ6–W2ç&÷w2æÖ‚†FWVæFVæ7’’Óâ¶FWVæFVæ7’çF6µö–BÂFWVæFVæ7•Ò’“°¢6öç7BFWVæFVæ7”'F–f7G2ÒFV6Æ&VBæFWVæG5ööå÷F6µö–G2æÖ‚‡F6´–B’Óâ°¢6öç7BFWVæFVæ7’Ò'”–BævWB‡F6´–B“°¢–b‚FWVæFVæ7’ÇÂFWVæFVæ7’ç7FFRÓÒw7V66VVFVBrÇÂFWVæFVæ7’æ÷WGWEö'F–f7Eö–B’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"€¢v–çfÆ–E÷7FFRrÀ¢ÆâFWVæFVæ7’G·F6´–GÒ†2æ÷B&öGV6VBâ66WFVB'F–f7FÀ¢“°¢Ğ¢&WGW&âFWVæFVæ7’æ÷WGWEö'F–f7Eö–C°¢Ò“°¢6öç7BW‡V7FVD'F–f7G2Ò²ââæW‡FW&æÄ'F–f7G2ÂââæFWVæFVæ7”'F–f7G5Ó°¢–b‡7F&ÆR†W‡V7FVD'F–f7G2’ÓÒ7F&ÆR‡F6²æ–çWEö'F–f7Eö–G2’’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"€¢v–çfÆ–E÷7FFRrÀ¢uF6²–çWB'F–f7G2Fòæ÷BÖF6‚÷&FW&VBW‡FW&æÂ–çWG2æBFWVæFVæ6–W2rÀ¢“°¢Ğ¢Ğ ¢&—fFR7–æ2W‡—&UF6²€¢6Æ–VçC¢7Ä6Æ–VçBÀ¢7FÆS¢F6µ&÷rÀ¢6öFS¢wF6µöW‡—&VBrÂw66÷UöÖ—6ÖF6‚rÀ¢æ÷s¢FFRÀ¢“¢&öÖ—6SÇfö–Câ°¢6öç7BW‡—&VBÒv—B6Æ–VçBçVW'“ÅF6µ&÷sâ€¢UDDR†ÕövVçE÷F6·0¢4UB7FFSÒvW‡—&VBrÂÆV6Uö÷væW#ÔåTÄÂÂÆV6U÷Fö¶VãÔåTÄÂÂÆV6UöW‡—&W5öCÔåTÄÂÀ¢W'&÷%ö6öFSÒC"ÂWFFVEöCÒC0¢t„U$RF6µö–CÒCäB7FFR”â‚w&VG’rÂw&WG'•÷v—BrÂv6Æ–ÖVBrÂw'Vææ–ærr¢$UEU$ä”ärGµD4µô4ôÅTÔå7ÖÀ¢·7FÆRçF6µö–BÂ6öFRÂæ÷rçFô•4õ7G&–ær‚•ÒÀ¢“°¢–b‚W‡—&VBç&÷w5³Ò’&WGW&ã°¢6öç7B'VâÒv—BF†—2ç'Vå&÷r†6Æ–VçBÂ7FÆRç'Våö–BÂG'VR“°¢v—B6Æ–VçBçVW'’€¢UDDR†ÕövVçE÷'Vç24UB7FGW3Òvf–ÆVBrÂWFFVEöCÒC"ÂFW&Ö–æÅöCÒC ¢t„U$R'Våö–CÒCäB7FGW2äõB”â‚w7V66VVFVBrÂv6æ6VÆÆVBrÂvf–ÆVBr–À¢·7FÆRç'Våö–BÂæ÷rçFô•4õ7G&–ær‚•ÒÀ¢“°¢v—B6Æ–VçBçVW'’€¢UDDR†ÕövVçE÷F6·24UB7FFSÒv6æ6VÆÆVBrÂÆV6Uö÷væW#ÔåTÄÂÂÆV6U÷Fö¶VãÔåTÄÂÀ¢ÆV6UöW‡—&W5öCÔåTÄÂÂW'&÷%ö6öFSÒw'Våöf–ÆVBrÂWFFVEöCÒC ¢t„U$R'Våö–CÒCäBF6µö–CÃâC2äB7FFR”â‚w&VG’rÂw&WG'•÷v—BrÂv6Æ–ÖVBrÂw'Vææ–ærr–À¢·7FÆRç'Våö–BÂæ÷rçFô•4õ7G&–ær‚’Â7FÆRçF6µö–EÒÀ¢“°¢v—BF†—2æVæB†6Æ–VçBÂ'VâÂ7FÆRçF6µö–BÂwF6²æW‡—&VBrÂ²6öFRÒ“°¢Ğ ¢&—fFR7–æ2&V6÷fW$W‡—&VEF6·2†6Æ–VçC¢7Ä6Æ–VçBÂæ÷s¢FFR“¢&öÖ—6SÇfö–Câ°¢6öç7BVÆ–f–VD6öÇVÖç2ÒD4µô4ôÅTÔå2ç7Æ—B‚rÂr¢æÖ‚†6öÇVÖâ’ÓâBâG¶6öÇVÖâçG&–Ò‚—Ö’æ¦ö–â‚rÂr“°¢6öç7BW‡—&VBÒv—B6Æ–VçBçVW'“ÅF6µ&÷sâ€¢4TÄT5BG·VÆ–f–VD6öÇVÖç7Ğ¢e$ôÒ†ÕövVçE÷F6·2@¢¤ô”â†ÕövVçE÷'Vç2"ôâ"ç'Våö–C×Bç'Våö–@¢¤ô”â†ÕövVçE÷6W76–öç22ôâ2ç6W76–öåö–C×"ç6W76–öåö–@¢t„U$R"ç7FGW2”â‚wVæF–ærrÂw'Vææ–ærr¢äBBç7FFR”â‚w&VG’rÂw&WG'•÷v—BrÂv6Æ–ÖVBrÂw'Vææ–ærr¢äB‡BæW‡—&W5öBÃÒCõ"‡2ç66÷Uö§6öâÓãâvW‡—&W5öBr“£§F–ÖW7F×G¢ÃÒC¢õ$DU"%’Bæ7&VFVEöBÂBçF6µö–@¢dõ"UDDRôbB4´•Äô4´T@¢Ä”Ô•BcFÀ¢¶æ÷rçFô•4õ7G&–ær‚•ÒÀ¢“°¢f÷"†6öç7B7FÆRöbW‡—&VBç&÷w2’°¢6öç7B66÷U&÷w2Òv—B6Æ–VçBçVW'“Ç²W‡—&W5öC¢7G&–ærÓâ€¢4TÄT5B66÷Uö§6öâÓãâvW‡—&W5öBr2W‡—&W5öBe$ôÒ†ÕövVçE÷6W76–öç0¢t„U$R6W76–öåö–CÒ…4TÄT5B6W76–öåö–Be$ôÒ†ÕövVçE÷'Vç2t„U$R'Våö–CÒC–À¢·7FÆRç'Våö–EÒÀ¢“°¢6öç7B66÷TW‡—&VBÒ66÷U&÷w2ç&÷w5³Ğ¢òFFRç'6R‡66÷U&÷w2ç&÷w5³ÒæW‡—&W5öB’ÃÒæ÷rævWEF–ÖR‚’¢fÇ6S°¢v—BF†—2æW‡—&UF6²†6Æ–VçBÂ7FÆRÂ66÷TW‡—&VBòw66÷UöÖ—6ÖF6‚r¢wF6µöW‡—&VBrÂæ÷r“°¢Ğ¢Ğ ¢&—fFR7–æ2&V6÷fW$W††W7FVDÆV6W2†6Æ–VçC¢7Ä6Æ–VçBÂæ÷s¢FFR“¢&öÖ—6SÇfö–Câ°¢6öç7BVÆ–f–VD6öÇVÖç2ÒD4µô4ôÅTÔå2ç7Æ—B‚rÂr¢æÖ‚†6öÇVÖâ’ÓâBâG¶6öÇVÖâçG&–Ò‚—Ö’æ¦ö–â‚rÂr“°¢6öç7BW††W7FVBÒv—B6Æ–VçBçVW'“ÅF6µ&÷sâ€¢4TÄT5BG·VÆ–f–VD6öÇVÖç7Ğ¢e$ôÒ†ÕövVçE÷F6·2@¢¤ô”â†ÕövVçE÷'Vç2"ôâ"ç'Våö–C×Bç'Våö–@¢t„U$R"ç7FGW2”â‚wVæF–ærrÂw'Vææ–ærr¢äBBç7FFR”â‚v6Æ–ÖVBrÂw'Vææ–ærr¢äBBæÆV6UöW‡—&W5öBÃÒC¢äBBæGFV×Eö6÷VçBãÒÄT5B‡BæÖ…öGFV×G2Â‡"æ'VFvWEö§6öâÓãâvGFV×G2r“£¦–çFVvW"¢õ$DU"%’Bæ7&VFVEöBÂBçF6µö–@¢dõ"UDDRôbB4´•Äô4´T@¢Ä”Ô•BcFÀ¢¶æ÷rçFô•4õ7G&–ær‚•ÒÀ¢“°¢f÷"†6öç7B7FÆRöbW††W7FVBç&÷w2’°¢6öç7Bf–ÆVBÒv—B6Æ–VçBçVW'“ÅF6µ&÷sâ€¢UDDR†ÕövVçE÷F6·0¢4UB7FFSÒvf–ÆVBrÂÆV6Uö÷væW#ÔåTÄÂÂÆV6U÷Fö¶VãÔåTÄÂÂÆV6UöW‡—&W5öCÔåTÄÂÀ¢W'&÷%ö6öFSÒvÆV6UöW‡—&VBrÂWFFVEöCÒC ¢t„U$RF6µö–CÒCäB7FFR”â‚v6Æ–ÖVBrÂw'Vææ–ærr¢$UEU$ä”ärGµD4µô4ôÅTÔå7ÖÀ¢·7FÆRçF6µö–BÂæ÷rçFô•4õ7G&–ær‚•ÒÀ¢“°¢–b‚f–ÆVBç&÷w5³Ò’6öçF–çVS°¢6öç7B'VâÒv—BF†—2ç'Vå&÷r†6Æ–VçBÂ7FÆRç'Våö–BÂG'VR“°¢v—B6Æ–VçBçVW'’€¢UDDR†ÕövVçE÷'Vç24UB7FGW3Òvf–ÆVBrÂWFFVEöCÒC"ÂFW&Ö–æÅöCÒC"t„U$R'Våö–CÒCÀ¢·7FÆRç'Våö–BÂæ÷rçFô•4õ7G&–ær‚•ÒÀ¢“°¢v—B6Æ–VçBçVW'’€¢UDDR†ÕövVçE÷F6·24UB7FFSÒv6æ6VÆÆVBrÂÆV6Uö÷væW#ÔåTÄÂÂÆV6U÷Fö¶VãÔåTÄÂÀ¢ÆV6UöW‡—&W5öCÔåTÄÂÂW'&÷%ö6öFSÒw'Våöf–ÆVBrÂWFFVEöCÒC ¢t„U$R'Våö–CÒCäBF6µö–CÃâC2äB7FFR”â‚w&VG’rÂw&WG'•÷v—BrÂv6Æ–ÖVBrÂw'Vææ–ærr–À¢·7FÆRç'Våö–BÂæ÷rçFô•4õ7G&–ær‚’Â7FÆRçF6µö–EÒÀ¢“°¢v—BF†—2æVæB†6Æ–VçBÂ'VâÂ7FÆRçF6µö–BÂvÆV6RæW‡—&VBrÂ°¢GFV×C¢–çFVvW"‡7FÆRæGFV×Eö6÷VçBÂvGFV×B6÷VçBr’ÂW††W7FVC¢G'VRÀ¢Ò“°¢v—BF†—2æVæB†6Æ–VçBÂ'VâÂ7FÆRçF6µö–BÂwF6²æf–ÆVBrÂ²6öFS¢vÆV6UöW‡—&VBrÒ“°¢Ğ¢Ğ ¢&—fFR7–æ276W'E7F÷&VD6ö×ÆWF–öâ€¢6Æ–VçC¢7Ä6Æ–VçBÀ¢6Æ–Ó¢GW&&ÆUF6´6Æ–ÒÀ¢'F–f7C¢'F–f7DVçfVÆ÷RÀ¢WfÇVF–öã¢WfÇVF–öå&V6V—BÀ¢“¢&öÖ—6SÇfö–Câ°¢6öç7B7F÷&VD'F–f7BÒv—B6Æ–VçBçVW'“Ç°¢'Våö–C¢7G&–æs²F6µö–C¢7G&–æs²–ÆöEö†6ƒ¢7G&–æs²VçfVÆ÷Uö§6öã¢Væ¶æ÷vã°¢Óâ€¢4TÄT5B'Våö–BÂF6µö–BÂ–ÆöEö†6‚ÂVçfVÆ÷Uö§6öà¢e$ôÒ†ÕövVçEö'F–f7G2t„U$R'F–f7Eö–CÒCÂ¶'F–f7Bæ'F–f7Eö–EÒÀ¢“°¢6öç7B'F–f7E&÷rÒ7F÷&VD'F–f7Bç&÷w5³Ó°¢–b‚'F–f7E&÷rÇÂ'F–f7E&÷rç'Våö–BÓÒ6Æ–Òç'Våö–BÇÂ'F–f7E&÷rçF6µö–BÓÒ6Æ–ÒçF6µö–@¢ÇÂ'F–f7E&÷rç–ÆöEö†6‚ÓÒ'F–f7Bç–ÆöEö†6€¢ÇÂf–ævW'&–çB†§6öâ†'F–f7E&÷ræVçfVÆ÷Uö§6öâ’’ÓÒf–ævW'&–çB†'F–f7B’’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–FV×÷FVæ7•ö6öæfÆ–7BrÂt'F–f7B–FVçF—G’—2–Ö×WF&ÆRr“°¢Ğ¢6öç7B7F÷&VDWfÇVF–öâÒv—B6Æ–VçBçVW'“Ç°¢'F–f7Eö–C¢7G&–æs²'Våö–C¢7G&–æs²F6µö–C¢7G&–æs²&V6V—Eö§6öã¢Væ¶æ÷vã°¢Óâ€¢4TÄT5B'F–f7Eö–BÂ'Våö–BÂF6µö–BÂ&V6V—Eö§6öà¢e$ôÒ†ÕövVçEöWfÇVF–öç2t„U$RWfÇVF–öåö–CÒCÂ¶WfÇVF–öâæWfÇVF–öåö–EÒÀ¢“°¢6öç7BWfÇVF–öå&÷rÒ7F÷&VDWfÇVF–öâç&÷w5³Ó°¢–b‚WfÇVF–öå&÷rÇÂWfÇVF–öå&÷ræ'F–f7Eö–BÓÒ'F–f7Bæ'F–f7Eö–@¢ÇÂWfÇVF–öå&÷rç'Våö–BÓÒ6Æ–Òç'Våö–BÇÂWfÇVF–öå&÷rçF6µö–BÓÒ6Æ–ÒçF6µö–@¢ÇÂf–ævW'&–çB†§6öâ†WfÇVF–öå&÷rç&V6V—Eö§6öâ’’ÓÒf–ævW'&–çB†WfÇVF–öâ’’°¢F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–FV×÷FVæ7•ö6öæfÆ–7BrÂtWfÇVF–öâ&V6V—B–FVçF—G’—2–Ö×WF&ÆRr“°¢Ğ¢Ğ ¢&—fFR7–æ2Æö6´¶W’†6Æ–VçC¢7Ä6Æ–VçBÂfÇVS¢7G&–ær“¢&öÖ—6SÇfö–Câ°¢v—B6Æ–VçBçVW'’†4TÄT5BuöGf—6÷'•÷†7EöÆö6²††6‡FW‡FW‡FVæFVB‚CÂ’–Â·fÇVUÒ“°¢Ğ ¢&—fFR6ÖSÅ&÷rW‡FVæG2²f–ævW'&–çC¢7G&–ærÒÂfÇVSâ€¢&÷s¢&÷rÀ¢W‡V7FVC¢7G&–ærÀ¢6öçfW'C¢‡fÇVS¢&÷r’ÓâfÇVRÀ¢¶–æC¢7G&–ærÀ¢“¢fÇVR°¢–b‡&÷ræf–ævW'&–çBÓÒW‡V7FVB’F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–FV×÷FVæ7•ö6öæfÆ–7BrÂG¶¶–æGÒ–FV×÷FVæ7’¶W’v2&WW6VF“°¢&WGW&â6öçfW'B‡&÷r“°¢Ğ ¢&—fFR7–æ2Æö6µF6²†6Æ–VçC¢7Ä6Æ–VçBÂF6´–C¢7G&–ær“¢&öÖ—6SÅF6µ&÷sâ°¢6öç7B6VÆV7FVBÒv—B6Æ–VçBçVW'“ÅF6µ&÷sâ†4TÄT5BGµD4µô4ôÅTÔå7Òe$ôÒ†ÕövVçE÷F6·2t„U$RF6µö–CÒCdõ"UDDVÂ·F6´–EÒ“°¢–b‚6VÆV7FVBç&÷w5³Ò’F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–çfÆ–Eö6Æ–ÒrÂuF6²FöW2æ÷BW†—7Br“°¢&WGW&â6VÆV7FVBç&÷w5³Ó°¢Ğ ¢&—fFR7–æ2'Vå&÷r†6Æ–VçC¢7Ä6Æ–VçBÂ'Vä–C¢7G&–ærÂÆö6²ÒfÇ6R“¢&öÖ—6SÅ'Vå&÷sâ°¢6öç7B6VÆV7FVBÒv—B6Æ–VçBçVW'“Å'Vå&÷sâ€¢4TÄT5BGµ%Tåô4ôÅTÔå7Òe$ôÒ†ÕövVçE÷'Vç2t„U$R'Våö–CÒCG¶Æö6²òrdõ"UDDRr¢rwÖÂ·'Vä–EÒÀ¢“°¢–b‚6VÆV7FVBç&÷w5³Ò’F‡&÷ræWr6ö÷&F–æF–öå7F÷&TW'&÷"‚v–çfÆ–E÷7FFRrÂu'VâFöW2æ÷BW†—7Br“°¢&WGW&â6VÆV7FVBç&÷w5³Ó°¢Ğ ¢&—fFR7–æ2VæB€¢6Æ–VçC¢7Ä6Æ–VçBÀ¢'Vã¢–6³Å'Vå&÷rÂw'Våö–BrÂv÷&væ—¦F–öåö–BrÂw66÷Uö–BrÂv66Uö–BsâÀ¢F6´–C¢7G&–ærÂçVÆÂÀ¢G—S¢7G&–ærÀ¢FWF–Ç3¢&V6÷&CÇ7G&–ærÂVæ¶æ÷vãâÀ¢“¢&öÖ—6SÇfö–Câ°¢6öç7BWfVçD–BÒF†—2æ–G2ææW‡B‚vWfVçBr“°¢v—B6Æ–VçBçVW'’€¢”å4U%B”åDò†Õ÷'VåöWfVçG2€¢WfVçEö–BÂ÷&væ—¦F–öåö–BÂ66÷Uö–BÂ66Uö–BÂ'Våö–BÂF6µö–BÀ¢WfVçE÷G—RÂFWF–Ç5ö§6öâÂö67W'&VEö@¢’dÅTU2‚CÂC"ÂC2ÂCBÂCRÂCbÂCrÂCƒ£¦§6öæ"ÂC’–À¢¶WfVçD–BÂ'Vâæ÷&væ—¦F–öåö–BÂ'Vâç66÷Uö–BÂ'Vâæ66Uö–BÂ'Vâç'Våö–BÂF6´–BÀ¢G—RÂ¥4ôâç7G&–æv–g’†FWF–Ç2’ÂF†—2æ6Æö6²ææ÷r‚’çFô•4õ7G&–ær‚•ÒÀ¢“°¢Ğ§Ğ