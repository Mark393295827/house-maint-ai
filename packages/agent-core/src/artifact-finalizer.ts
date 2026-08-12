import {
    AgentTaskEnvelopeSchema,
    ArtifactEnvelopeSchema,
    EffectiveScopeSchema,
    EvaluationReceiptSchema,
    type AgentTaskEnvelope,
    type ArtifactEnvelope,
    type EffectiveScope,
    type EvaluationReceipt,
} from '../../contracts/src/index.js';
import { RuntimeFault } from './errors.js';
import type {
    ArtifactCandidate,
    ArtifactEvaluator,
    Clock,
    EvaluationResult,
} from './types.js';
import { canonicalJson, sha256 } from './utils.js';

const REQUIRED_CHECKS = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

export interface ArtifactRouteProof {
    readonly producer_route_id: string;
    readonly evaluator_route_id: string;
}

/** A read-only view over the capability registry.  Route identities are
 * resolved by the registry, never accepted from an untrusted caller. */
export interface ArtifactRouteRegistry {
    getBinding(capability: string): { readonly capability: string; readonly route_id: string } | undefined;
}

export interface FinalizedArtifact extends ArtifactRouteProof {
    readonly artifact: ArtifactEnvelope;
    readonly evaluation: EvaluationReceipt;
}

export interface ArtifactFinalizationInput {
    readonly task: AgentTaskEnvelope;
    readonly scope: EffectiveScope;
    readonly input_artifacts: readonly ArtifactEnvelope[];
    readonly candidate: ArtifactCandidate;
    readonly producer_route_id: string;
    readonly evaluator: ArtifactEvaluator;
    readonly signal: AbortSignal;
    /** Optional immutable registry used to prove both route identities. */
    readonly route_registry?: ArtifactRouteRegistry;
    /** Explicit producer capability is useful to reject capability aliases. */
    readonly producer_capability?: string;
}

export interface StoredArtifactProofInput extends ArtifactRouteProof {
    readonly artifact: ArtifactEnvelope;
    readonly evaluation: EvaluationReceipt;
    readonly route_registry?: ArtifactRouteRegistry;
    readonly producer_capability?: string;
}

function validateRoutes(producerRouteId: string, evaluatorRouteId: string): void {
    if (!/^[A-Za-z][A-Za-z0-9._:-]{2,127}$/.test(producerRouteId)
        || !/^[A-Za-z][A-Za-z0-9._:-]{2,127}$/.test(evaluatorRouteId)) {
        throw new RuntimeFault('evaluation_rejected', 'Artifact route identity is invalid');
    }
    if (producerRouteId === evaluatorRouteId) {
        throw new RuntimeFault('evaluation_rejected', 'A producer cannot evaluate its own artifact', true);
    }
}

function assertRegistryRoutes(
    registry: ArtifactRouteRegistry | undefined,
    producerCapability: string,
    producerRouteId: string,
    evaluator: Pick<ArtifactEvaluator, 'capability' | 'route_id'>,
): void {
    // Route strings are not sufficient evidence of independence: an aliased
    // producer capability must never be allowed to self-approve under a new
    // route identity.
    if (producerCapability === evaluator.capability) {
        throw new RuntimeFault('evaluation_rejected', 'A producer capability cannot evaluate its own artifact', true);
    }
    if (!registry) return;
    const producer = registry.getBinding(producerCapability);
    const evaluatorBinding = registry.getBinding(evaluator.capability);
    if (!producer || !evaluatorBinding
        || producer.capability !== producerCapability
        || evaluatorBinding.capability !== evaluator.capability
        || producer.route_id !== producerRouteId
        || evaluatorBinding.route_id !== evaluator.route_id) {
        throw new RuntimeFault('evaluation_rejected', 'Artifact route identities are not registry-bound', true);
    }
}

function normalizeEvaluation(result: EvaluationResult, requireBilingual: boolean): EvaluationResult['checks'] {
    const required = requireBilingual ? [...REQUIRED_CHECKS, 'bilingual' as const] : [...REQUIRED_CHECKS];
    const names = new Set<string>();
    for (const check of result.checks) {
        if (names.has(check.name)) {
            throw new RuntimeFault('evaluation_rejected', 'Evaluation checks must be unique', true);
        }
        names.add(check.name);
    }
    const checks = required.map((name) => result.checks.find((check) => check.name === name)
        ?? { name, status: 'fail' as const, evidence_codes: ['required_check_missing'] });
    checks.push(...result.checks.filter((check) => !required.includes(check.name as typeof required[number])));
    return checks;
}

function proofIdentity(
    receipt: Omit<EvaluationReceipt, 'schema' | 'evaluation_id'>,
    routes: ArtifactRouteProof,
): Record<string, unknown> {
    return {
        artifact_id: receipt.artifact_id,
        evaluator_capability: receipt.evaluator_capability,
        checks: receipt.checks,
        decision: receipt.decision,
        evaluated_at: receipt.evaluated_at,
        producer_route_id: routes.producer_route_id,
        evaluator_route_id: routes.evaluator_route_id,
    };
}

export class ArtifactFinalizer {
    constructor(private readonly clock: Clock) {}

    async finalize(input: ArtifactFinalizationInput): Promise<FinalizedArtifact> {
        const task = AgentTaskEnvelopeSchema.parse(input.task);
        const scope = EffectiveScopeSchema.parse(input.scope);
        validateRoutes(input.producer_route_id, input.evaluator.route_id);
        assertRegistryRoutes(
            input.route_registry,
            input.producer_capability ?? task.capability,
            input.producer_route_id,
            input.evaluator,
        );
        if (input.signal.aborted) throw new RuntimeFault('cancelled', 'Artifact finalization was cancelled');
        if (task.scope_id !== scope.scope_id || task.organization_id !== scope.organization_id
            || task.case_ref.id !== scope.case_id || task.policy_version !== scope.policy_version
            || !scope.capabilities.includes(task.capability)) {
            throw new RuntimeFault('scope_mismatch', 'Task and finalization scope do not match');
        }
        const inputArtifacts = input.input_artifacts.map((artifact) => ArtifactEnvelopeSchema.parse(artifact));
        if (inputArtifacts.length !== task.input_artifact_ids.length
            || inputArtifacts.some((artifact, index) => artifact.artifact_id !== task.input_artifact_ids[index])) {
            throw new RuntimeFault('invalid_artifact', 'Artifact lineage is not in declared task order');
        }
        for (const artifact of inputArtifacts) {
            if (artifact.evaluation_state !== 'accepted' || artifact.scope_id !== task.scope_id
                || artifact.organization_id !== task.organization_id || artifact.case_id !== task.case_ref.id
                || artifact.case_version !== task.case_ref.version || artifact.policy_version !== task.policy_version) {
                throw new RuntimeFault('scope_mismatch', 'Input artifact is unaccepted or outside the task scope');
            }
        }
        if (!scope.data_classes.includes(input.candidate.data_class)
            || input.candidate.retention_days > scope.retention_days) {
            throw new RuntimeFault('scope_mismatch', 'Artifact data handling exceeds the resolved scope');
        }
        const inputHashes = inputArtifacts.map((artifact) => artifact.payload_hash);
        if (input.candidate.input_hashes
            && canonicalJson(input.candidate.input_hashes) !== canonicalJson(inputHashes)) {
            throw new RuntimeFault('invalid_artifact', 'Capability candidate lied about its input lineage', true);
        }
        const payloadHash = sha256(input.candidate.payload);
        const identity = {
            schema_name: input.candidate.schema_name,
            scope_id: task.scope_id,
            organization_id: task.organization_id,
            case_id: task.case_ref.id,
            case_version: task.case_ref.version,
            producer_run_id: task.run_id,
            producer_task_id: task.task_id,
            input_hashes: inputHashes,
            payload_hash: payloadHash,
            policy_version: task.policy_version,
            data_class: input.candidate.data_class,
            retention_days: input.candidate.retention_days,
            supersedes_artifact_id: input.candidate.supersedes_artifact_id ?? null,
        };
        const createdAt = this.clock.now().toISOString();
        const pending = ArtifactEnvelopeSchema.parse({
            schema: 'agent-artifact/v1', artifact_id: `artifact:${sha256(identity)}`,
            ...identity, payload: input.candidate.payload, evaluation_state: 'pending', created_at: createdAt,
        });
        let result: EvaluationResult;
        try {
            result = await input.evaluator.evaluate(pending, { task, scope, signal: input.signal });
        } catch {
            throw new RuntimeFault('evaluation_rejected', 'Independent evaluator failed', true);
        }
        if (input.signal.aborted) throw new RuntimeFault('cancelled', 'Artifact evaluation was cancelled');
        const checks = normalizeEvaluation(result, task.capability === 'maintenance.next-action.bilingual.v1');
        const accepted = result.decision === 'accept'
            && checks.every((check) => check.status === 'pass' || check.status === 'not_applicable')
            && REQUIRED_CHECKS.every((name) => checks.some((check) => check.name === name && check.status === 'pass'))
            && (task.capability !== 'maintenance.next-action.bilingual.v1'
                || checks.some((check) => check.name === 'bilingual' && check.status === 'pass'));
        const evaluatedAt = this.clock.now().toISOString();
        const receiptBody = {
            artifact_id: pending.artifact_id,
            evaluator_capability: input.evaluator.capability,
            independent_route: true as const,
            checks,
            decision: accepted ? 'accept' as const : result.decision === 'reject' ? 'reject' as const : 'rework' as const,
            evaluated_at: evaluatedAt,
        };
        const routes = {
            producer_route_id: input.producer_route_id,
            evaluator_route_id: input.evaluator.route_id,
        };
        const evaluation = EvaluationReceiptSchema.parse({
            schema: 'evaluation-receipt/v1',
            evaluation_id: `evaluation:${sha256(proofIdentity(receiptBody, routes))}`,
            ...receiptBody,
        });
        if (!accepted) throw new RuntimeFault('evaluation_rejected', 'Artifact did not pass independent evaluation', true);
        const artifact = ArtifactEnvelopeSchema.parse({ ...pending, evaluation_state: 'accepted' });
        return { artifact, evaluation, ...routes };
    }

    proveStored(input: StoredArtifactProofInput): ArtifactRouteProof {
        const artifact = ArtifactEnvelopeSchema.parse(input.artifact);
        const evaluation = EvaluationReceiptSchema.parse(input.evaluation);
        validateRoutes(input.producer_route_id, input.evaluator_route_id);
        const producerCapability = input.producer_capability ?? artifact.schema_name;
        const evaluatorBinding = input.route_registry?.getBinding(evaluation.evaluator_capability);
        if (input.route_registry && (!evaluatorBinding || evaluatorBinding.route_id !== input.evaluator_route_id)) {
            throw new RuntimeFault('evaluation_rejected', 'Stored evaluator route is not registry-bound');
        }
        if (producerCapability === evaluation.evaluator_capability) {
            throw new RuntimeFault('evaluation_rejected', 'A producer capability cannot evaluate its own artifact', true);
        }
        if (input.route_registry) {
            const producerBinding = input.route_registry.getBinding(producerCapability);
            if (!producerBinding || producerBinding.route_id !== input.producer_route_id) {
                throw new RuntimeFault('evaluation_rejected', 'Stored producer route is not registry-bound');
            }
        }
        const expectedPayloadHash = sha256(artifact.payload);
        const expectedArtifactIdentity = {
            schema_name: artifact.schema_name,
            scope_id: artifact.scope_id,
            organization_id: artifact.organization_id,
            case_id: artifact.case_id,
            case_version: artifact.case_version,
            producer_run_id: artifact.producer_run_id,
            producer_task_id: artifact.producer_task_id,
            input_hashes: artifact.input_hashes,
            payload_hash: expectedPayloadHash,
            policy_version: artifact.policy_version,
            data_class: artifact.data_class,
            retention_days: artifact.retention_days,
            supersedes_artifact_id: artifact.supersedes_artifact_id,
        };
        if (artifact.payload_hash !== expectedPayloadHash
            || artifact.artifact_id !== `artifact:${sha256(expectedArtifactIdentity)}`) {
            throw new RuntimeFault('evaluation_rejected', 'Stored artifact content address is invalid');
        }
        const required = artifact.schema_name === 'maintenance-bilingual-next-action/v1'
            ? [...REQUIRED_CHECKS, 'bilingual' as const]
            : [...REQUIRED_CHECKS];
        const names = new Set(evaluation.checks.map((check) => check.name));
        if (artifact.evaluation_state !== 'accepted' || evaluation.artifact_id !== artifact.artifact_id
            || evaluation.decision !== 'accept' || !evaluation.independent_route
            || names.size !== evaluation.checks.length
            || evaluation.checks.some((check) => check.status === 'fail')
            || !required.every((name) => evaluation.checks.some((check) => check.name === name && check.status === 'pass'))) {
            throw new RuntimeFault('evaluation_rejected', 'Stored artifact is not independently accepted');
        }
        const body = {
            artifact_id: evaluation.artifact_id,
            evaluator_capability: evaluation.evaluator_capability,
            independent_route: evaluation.independent_route,
            checks: evaluation.checks,
            decision: evaluation.decision,
            evaluated_at: evaluation.evaluated_at,
        };
        const expected = `evaluation:${sha256(proofIdentity(body, input))}`;
        if (evaluation.evaluation_id !== expected) {
            throw new RuntimeFault('evaluation_rejected', 'Stored evaluation route proof is invalid');
        }
        return {
            producer_route_id: input.producer_route_id,
            evaluator_route_id: input.evaluator_route_id,
        };
    }
}
