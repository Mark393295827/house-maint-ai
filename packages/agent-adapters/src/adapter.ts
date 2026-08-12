import {
    AgentTaskEnvelopeSchema,
    ArtifactEnvelopeSchema,
    EffectiveScopeSchema,
    SafeArtifactPayloadSchema,
    type ArtifactEnvelope,
    type EffectiveScope,
} from '../../contracts/src/index.js';
import {
    RuntimeFault,
    type CapabilityHandler,
    type CapabilityRequest,
    type CapabilityResult,
    type RuntimeUsage,
} from '../../agent-core/src/index.js';
import { CAPABILITY_PAYLOAD_SCHEMAS } from './schemas.js';
import {
    CAPABILITY_DESCRIPTORS,
    CAPABILITY_IDS,
    type CapabilityDescriptor,
    type StructuredOutputRequest,
    type StructuredOutputRoute,
} from './types.js';

const USAGE_KEYS = ['wall_ms', 'tokens', 'cost_micros', 'tool_calls'] as const;

function deepFreeze<T>(value: T): T {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    return Object.freeze(value);
}

function assertScopeBinding(
    request: CapabilityRequest,
    descriptor: CapabilityDescriptor,
): { scope: EffectiveScope; inputs: ArtifactEnvelope[] } {
    let task;
    let scope;
    try {
        task = AgentTaskEnvelopeSchema.parse(request.task);
        scope = EffectiveScopeSchema.parse(request.scope);
    } catch {
        throw new RuntimeFault('scope_mismatch', 'Capability request has an invalid task or scope envelope');
    }
    if (task.capability !== descriptor.capability
        || task.scope_id !== scope.scope_id
        || task.organization_id !== scope.organization_id
        || task.case_ref.id !== scope.case_id
        || task.policy_version !== scope.policy_version
        || !scope.capabilities.includes(descriptor.capability)) {
        throw new RuntimeFault('scope_mismatch', 'Capability request does not match its resolved scope');
    }
    if (!scope.data_classes.includes(descriptor.data_class)) {
        throw new RuntimeFault('scope_mismatch', 'Capability output data class is not granted by the resolved scope');
    }
    if (Object.keys(request.tools).length !== 0) {
        throw new RuntimeFault('scope_mismatch', 'Structured capability adapters do not accept direct tools');
    }

    let inputs: ArtifactEnvelope[];
    try {
        inputs = request.input_artifacts.map((artifact) => ArtifactEnvelopeSchema.parse(artifact));
    } catch {
        throw new RuntimeFault('invalid_artifact', 'Capability input contains an invalid artifact');
    }
    if (inputs.length !== task.input_artifact_ids.length
        || inputs.some((artifact, index) => artifact.artifact_id !== task.input_artifact_ids[index])) {
        throw new RuntimeFault('invalid_artifact', 'Capability inputs do not match the task artifact references');
    }
    for (const artifact of inputs) {
        if (artifact.scope_id !== scope.scope_id
            || artifact.organization_id !== scope.organization_id
            || artifact.case_id !== task.case_ref.id
            || artifact.case_version !== task.case_ref.version
            || artifact.evaluation_state !== 'accepted') {
            throw new RuntimeFault('scope_mismatch', 'Capability input is unaccepted or outside the task scope');
        }
    }
    return { scope, inputs };
}

function validateUsage(value: unknown, request: CapabilityRequest): RuntimeUsage {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new RuntimeFault('budget_exceeded', 'Capability usage is malformed');
    }
    const usage = value as Record<string, unknown>;
    if (Object.keys(usage).length !== USAGE_KEYS.length
        || Object.keys(usage).some((key) => !USAGE_KEYS.includes(key as typeof USAGE_KEYS[number]))) {
        throw new RuntimeFault('budget_exceeded', 'Capability usage has unsupported dimensions');
    }
    for (const key of USAGE_KEYS) {
        const amount = usage[key];
        if (!Number.isInteger(amount) || (amount as number) < 0) {
            throw new RuntimeFault('budget_exceeded', 'Capability usage must be finite non-negative integers');
        }
        if ((amount as number) > request.task.budget[key]) {
            throw new RuntimeFault('budget_exceeded', `Capability exceeded its ${key} budget`);
        }
    }
    if (usage.tool_calls !== 0) {
        throw new RuntimeFault('budget_exceeded', 'Structured capability adapters cannot report direct tool usage');
    }
    return deepFreeze({
        wall_ms: usage.wall_ms as number,
        tokens: usage.tokens as number,
        cost_micros: usage.cost_micros as number,
        tool_calls: usage.tool_calls as number,
    });
}

export abstract class StrictCapabilityAdapter implements CapabilityHandler {
    readonly route_id: string;

    protected constructor(
        readonly descriptor: CapabilityDescriptor,
        protected readonly route: StructuredOutputRoute,
    ) {
        this.route_id = route.route_id;
    }

    async run(request: CapabilityRequest): Promise<CapabilityResult> {
        if (request.signal.aborted) throw new RuntimeFault('cancelled', 'Capability request was cancelled');
        const { scope, inputs } = assertScopeBinding(request, this.descriptor);
        const retentionDays = Math.min(this.descriptor.retention_days, scope.retention_days);
        const invocation = this.makeInvocation(request, scope, inputs, retentionDays);

        let generated;
        try {
            generated = await this.route.invoke(invocation);
        } catch (error) {
            if (error instanceof RuntimeFault) throw error;
            if (request.signal.aborted) throw new RuntimeFault('cancelled', 'Capability request was cancelled');
            throw new RuntimeFault('temporarily_unavailable', 'Structured capability route failed', true);
        }
        if (request.signal.aborted) throw new RuntimeFault('cancelled', 'Capability request was cancelled');
        if (!generated || typeof generated !== 'object') {
            throw new RuntimeFault('invalid_artifact', 'Capability route returned no structured result', true);
        }

        let payload: Record<string, unknown>;
        try {
            payload = CAPABILITY_PAYLOAD_SCHEMAS[this.descriptor.capability].parse(generated.payload);
            payload = SafeArtifactPayloadSchema.parse(payload);
            this.validateGeneratedPayload(payload, inputs);
        } catch (error) {
            if (error instanceof RuntimeFault) throw error;
            throw new RuntimeFault('invalid_artifact', 'Capability route returned an invalid safe payload', true);
        }

        const usage = validateUsage(generated.usage, request);
        return deepFreeze({
            artifact: {
                schema_name: this.descriptor.artifact_schema,
                payload: deepFreeze(payload),
                data_class: this.descriptor.data_class,
                retention_days: retentionDays,
                supersedes_artifact_id: null,
            },
            usage,
        });
    }

    protected validateGeneratedPayload(payload: Record<string, unknown>, inputs: readonly ArtifactEnvelope[]): void {
        void payload;
        void inputs;
    }

    private makeInvocation(
        request: CapabilityRequest,
        scope: EffectiveScope,
        inputs: readonly ArtifactEnvelope[],
        retentionDays: number,
    ): StructuredOutputRequest {
        const invocation: StructuredOutputRequest = {
            schema: 'structured-output-request/v1',
            capability: this.descriptor.capability,
            artifact_schema: this.descriptor.artifact_schema,
            lineage: { run_id: request.task.run_id, task_id: request.task.task_id },
            scope: {
                scope_id: scope.scope_id,
                organization_id: scope.organization_id,
                case_id: request.task.case_ref.id,
                case_version: request.task.case_ref.version,
                policy_version: scope.policy_version,
                region: scope.region,
                data_class: this.descriptor.data_class,
                retention_days: retentionDays,
            },
            inputs: inputs.map((artifact) => deepFreeze({
                artifact_id: artifact.artifact_id,
                schema_name: artifact.schema_name,
                payload_hash: artifact.payload_hash,
                payload: deepFreeze(structuredClone(artifact.payload)),
            })),
            limits: {
                wall_ms: request.task.budget.wall_ms,
                tokens: request.task.budget.tokens,
                cost_micros: request.task.budget.cost_micros,
                tool_calls: 0,
            },
            signal: request.signal,
        };
        return Object.freeze(invocation);
    }
}

export class DiagnosisAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.diagnosis], route); }
}

export class ClarificationAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.clarification], route); }
}

export class HypothesisAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.hypothesis], route); }
}

export class RepairPlanAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.repairPlan], route); }
}

export class MaterialsBomAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.materialsBom], route); }
}

export class EstimateAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.estimate], route); }
}

export class FaultAttributionAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.faultAttribution], route); }
}

export class WorkerMatchCriteriaAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.workerMatchCriteria], route); }
}

export class BilingualNextActionAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.bilingualNextAction], route); }
}

export class IndependentCriticAdapter extends StrictCapabilityAdapter implements CapabilityHandler {
    constructor(route: StructuredOutputRoute) { super(CAPABILITY_DESCRIPTORS[CAPABILITY_IDS.independentCritic], route); }

    protected override validateGeneratedPayload(payload: Record<string, unknown>, inputs: readonly ArtifactEnvelope[]): void {
        if (inputs.length !== 1) {
            throw new RuntimeFault('invalid_artifact', 'Independent critic requires exactly one accepted subject artifact');
        }
        if (payload.subject_schema_name !== inputs[0].schema_name
            || payload.subject_payload_hash !== inputs[0].payload_hash) {
            throw new RuntimeFault('invalid_artifact', 'Independent critic output is not bound to its subject artifact');
        }
    }
}
