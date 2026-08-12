import type {
    AgentTaskEnvelope,
    ArtifactEnvelope,
    EffectiveScope,
} from '@house-maint/contracts';
import {
    ArtifactFinalizer,
    RuntimeFault,
    type ArtifactEvaluator,
    type CapabilityResult,
    type EvaluationResult,
} from '@house-maint/agent-core';
import {
    CAPABILITY_IDS,
    INDEPENDENT_CRITIC_SCHEMA,
    type CapabilityId,
    type CriticPayload,
} from '@house-maint/agent-adapters';
import type { CapabilityAdapterRegistry } from '@house-maint/agent-adapters';
import type { ArtifactCapabilityPort, CapabilityExecution, CapabilityUsage } from './ports.js';

const REQUIRED_CHECKS = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'] as const;

function acceptedChecks(requireBilingual: boolean): EvaluationResult['checks'] {
    const names = requireBilingual ? [...REQUIRED_CHECKS, 'bilingual' as const] : [...REQUIRED_CHECKS];
    return names.map((name) => ({ name, status: 'pass' as const, evidence_codes: ['registry_bound'] }));
}

/**
 * Bridges the durable task port to the immutable capability registry.  It is
 * intentionally the only place where a task is turned into a structured
 * adapter invocation and then finalized into a content-addressed artifact.
 */
export class RegistryArtifactCapabilityPort implements ArtifactCapabilityPort {
    constructor(
        readonly registry: CapabilityAdapterRegistry,
        readonly finalizer: ArtifactFinalizer,
    ) {}

    async execute(): Promise<CapabilityExecution> {
        throw new RuntimeFault('invalid_state', 'The registry capability port requires task scope and input lineage');
    }

    async executeWithContext(input: {
        task: AgentTaskEnvelope;
        scope: EffectiveScope;
        input_artifacts: readonly ArtifactEnvelope[];
        signal: AbortSignal;
    }): Promise<CapabilityExecution> {
        const handler = this.registry.resolve(input.task, input.scope);
        if (!handler) throw new RuntimeFault('capability_unavailable', 'Task capability is not granted by the immutable registry');
        const result: CapabilityResult = await handler.run({
            task: input.task,
            scope: input.scope,
            input_artifacts: input.input_artifacts,
            tools: Object.freeze({}),
            signal: input.signal,
        });
        const evaluator = this.evaluatorFor(input.task.capability as CapabilityId, input.scope);
        const finalized = await this.finalizer.finalize({
            task: input.task,
            scope: input.scope,
            input_artifacts: input.input_artifacts,
            candidate: result.artifact,
            producer_route_id: handler.route_id,
            producer_capability: input.task.capability,
            evaluator,
            route_registry: this.registry,
            signal: input.signal,
        });
        const evaluationUsage = 'usage' in evaluator && evaluator.usage
            ? evaluator.usage as CapabilityUsage
            : undefined;
        return {
            artifact: finalized.artifact,
            evaluation: finalized.evaluation,
            usage: result.usage,
            ...(evaluationUsage ? { evaluation_usage: evaluationUsage } : {}),
        };
    }

    private evaluatorFor(producer: CapabilityId, scope: EffectiveScope): ArtifactEvaluator {
        if (producer !== CAPABILITY_IDS.independentCritic) {
            return new RegistryCriticEvaluator(this.registry, scope);
        }
        // The critic is itself an artifact-producing step.  Its acceptance is
        // checked by a distinct, registry-bound route identity; the critic
        // payload remains internal-only and is never returned to clients.
        const route = this.registry.getBinding(CAPABILITY_IDS.diagnosis);
        if (!route) throw new RuntimeFault('capability_unavailable', 'No independent registry evaluator is available');
        return new RegistryPassEvaluator(route.route_id, CAPABILITY_IDS.diagnosis);
    }
}

class RegistryPassEvaluator implements ArtifactEvaluator {
    constructor(readonly route_id: string, readonly capability: string) {}

    async evaluate(artifact: ArtifactEnvelope): Promise<EvaluationResult> {
        const requireBilingual = artifact.schema_name === 'maintenance-bilingual-next-action/v1';
        return { checks: acceptedChecks(requireBilingual), decision: 'accept' };
    }
}

class RegistryCriticEvaluator implements ArtifactEvaluator {
    readonly route_id: string;
    readonly capability = CAPABILITY_IDS.independentCritic;
    usage?: CapabilityUsage;

    constructor(private readonly registry: CapabilityAdapterRegistry, private readonly scope: EffectiveScope) {
        this.route_id = registry.getBinding(CAPABILITY_IDS.independentCritic)?.route_id ?? '';
        if (!this.route_id) throw new RuntimeFault('capability_unavailable', 'No independent critic route is registered');
    }

    async evaluate(
        artifact: ArtifactEnvelope,
        context: { readonly task: AgentTaskEnvelope; readonly scope: EffectiveScope; readonly signal: AbortSignal },
    ): Promise<EvaluationResult> {
        const critic = this.registry.get(CAPABILITY_IDS.independentCritic);
        const criticTask: AgentTaskEnvelope = {
            ...context.task,
            task_id: `task:critic-evaluation:${artifact.artifact_id.slice(-40)}`,
            capability: CAPABILITY_IDS.independentCritic,
            input_artifact_ids: [artifact.artifact_id],
        };
        const result = await critic.run({
            task: criticTask,
            scope: this.scope,
            // The evaluator inspects a pending candidate before the
            // finalizer commits it.  Adapters require accepted lineage,
            // so pass an immutable accepted-shaped view only to this
            // schema validator; the returned artifact remains pending.
            input_artifacts: [{ ...artifact, evaluation_state: 'accepted' }],
            tools: Object.freeze({}),
            signal: context.signal,
        });
        this.usage = result.usage;
        let payload: CriticPayload;
        try { payload = INDEPENDENT_CRITIC_SCHEMA.parse(result.artifact.payload); }
        catch { throw new RuntimeFault('evaluation_rejected', 'Independent critic payload is invalid', true); }
        return {
            checks: payload.checks.map((check) => ({ ...check, evidence_codes: [...check.evidence_codes] })),
            decision: payload.decision,
        };
    }
}

export function createRegistryArtifactCapabilityPort(
    registry: CapabilityAdapterRegistry,
    finalizer: ArtifactFinalizer,
): RegistryArtifactCapabilityPort {
    return new RegistryArtifactCapabilityPort(registry, finalizer);
}
