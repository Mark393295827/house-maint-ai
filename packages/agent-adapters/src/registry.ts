import type {
    AgentTaskEnvelope,
    EffectiveScope,
} from '../../contracts/src/index.js';
import {
    RuntimeFault,
    type CapabilityHandler,
    type CapabilityRouter,
} from '../../agent-core/src/index.js';
import {
    BilingualNextActionAdapter,
    ClarificationAdapter,
    DiagnosisAdapter,
    EstimateAdapter,
    FaultAttributionAdapter,
    HypothesisAdapter,
    IndependentCriticAdapter,
    MaterialsBomAdapter,
    RepairPlanAdapter,
    WorkerMatchCriteriaAdapter,
} from './adapter.js';
import {
    CAPABILITY_DESCRIPTORS,
    CAPABILITY_IDS,
    type CapabilityDescriptor,
    type CapabilityId,
    type CapabilityRouteBindings,
    type StructuredOutputRoute,
} from './types.js';
import {
    DIAGNOSE_AND_PLAN_COMPOSITION,
    type CapabilityCompositionDescriptor,
} from './composition.js';

const ALL_CAPABILITIES = Object.freeze(Object.values(CAPABILITY_IDS));

function isCapabilityId(value: string): value is CapabilityId {
    return (ALL_CAPABILITIES as readonly string[]).includes(value);
}

function validateBindings(bindings: CapabilityRouteBindings): void {
    const keys = Object.keys(bindings);
    if (keys.length !== ALL_CAPABILITIES.length
        || keys.some((key) => !isCapabilityId(key))
        || ALL_CAPABILITIES.some((capability) => !bindings[capability])) {
        throw new RuntimeFault('capability_unavailable', 'Every declared capability requires exactly one route binding');
    }
    for (const capability of ALL_CAPABILITIES) {
        const routeId = bindings[capability].route_id;
        if (!/^[A-Za-z][A-Za-z0-9._:-]{2,127}$/.test(routeId)) {
            throw new RuntimeFault('capability_unavailable', `Capability ${capability} has an invalid opaque route identity`);
        }
    }
    const criticRouteId = bindings[CAPABILITY_IDS.independentCritic].route_id;
    const sharesProducerRoute = ALL_CAPABILITIES.some((capability) =>
        capability !== CAPABILITY_IDS.independentCritic && bindings[capability].route_id === criticRouteId);
    if (sharesProducerRoute) {
        throw new RuntimeFault('capability_unavailable', 'Independent critic route must differ from every producer route');
    }
}

export class CapabilityAdapterRegistry implements CapabilityRouter {
    private readonly handlers: ReadonlyMap<CapabilityId, CapabilityHandler>;
    private readonly compositions: ReadonlyMap<string, CapabilityCompositionDescriptor>;
    private readonly bindings: ReadonlyMap<CapabilityId, CapabilityRouteBindings[CapabilityId]>;

    constructor(bindings: CapabilityRouteBindings) {
        validateBindings(bindings);
        // Copy the binding table once.  Consumers can query it, but cannot
        // replace route identities after a run has been admitted.
        this.bindings = new Map(ALL_CAPABILITIES.map((capability) => [
            capability,
            Object.freeze({ capability, route_id: bindings[capability].route_id, invoke: bindings[capability].invoke.bind(bindings[capability]) }),
        ] as const));
        this.handlers = new Map<CapabilityId, CapabilityHandler>([
            [CAPABILITY_IDS.diagnosis, new DiagnosisAdapter(this.bindings.get(CAPABILITY_IDS.diagnosis)!)],
            [CAPABILITY_IDS.clarification, new ClarificationAdapter(this.bindings.get(CAPABILITY_IDS.clarification)!)],
            [CAPABILITY_IDS.hypothesis, new HypothesisAdapter(this.bindings.get(CAPABILITY_IDS.hypothesis)!)],
            [CAPABILITY_IDS.repairPlan, new RepairPlanAdapter(this.bindings.get(CAPABILITY_IDS.repairPlan)!)],
            [CAPABILITY_IDS.materialsBom, new MaterialsBomAdapter(this.bindings.get(CAPABILITY_IDS.materialsBom)!)],
            [CAPABILITY_IDS.estimate, new EstimateAdapter(this.bindings.get(CAPABILITY_IDS.estimate)!)],
            [CAPABILITY_IDS.faultAttribution, new FaultAttributionAdapter(this.bindings.get(CAPABILITY_IDS.faultAttribution)!)],
            [CAPABILITY_IDS.workerMatchCriteria, new WorkerMatchCriteriaAdapter(this.bindings.get(CAPABILITY_IDS.workerMatchCriteria)!)],
            [CAPABILITY_IDS.bilingualNextAction, new BilingualNextActionAdapter(this.bindings.get(CAPABILITY_IDS.bilingualNextAction)!)],
            [CAPABILITY_IDS.independentCritic, new IndependentCriticAdapter(this.bindings.get(CAPABILITY_IDS.independentCritic)!)],
        ]);
        this.compositions = new Map([[DIAGNOSE_AND_PLAN_COMPOSITION.composition_id, DIAGNOSE_AND_PLAN_COMPOSITION]]);
    }

    resolve(task: AgentTaskEnvelope, scope: EffectiveScope): CapabilityHandler | undefined {
        if (!isCapabilityId(task.capability)
            || task.scope_id !== scope.scope_id
            || task.organization_id !== scope.organization_id
            || task.case_ref.id !== scope.case_id
            || task.policy_version !== scope.policy_version
            || !scope.capabilities.includes(task.capability)) {
            return undefined;
        }
        const descriptor = CAPABILITY_DESCRIPTORS[task.capability];
        if (!scope.data_classes.includes(descriptor.data_class)) return undefined;
        return this.handlers.get(task.capability);
    }

    get(capability: CapabilityId): CapabilityHandler {
        const handler = this.handlers.get(capability);
        if (!handler) throw new RuntimeFault('capability_unavailable', `Capability ${capability} is not registered`);
        return handler;
    }

    list(): readonly CapabilityDescriptor[] {
        return ALL_CAPABILITIES.map((capability) => CAPABILITY_DESCRIPTORS[capability]);
    }

    resolveComposition(compositionId: string): CapabilityCompositionDescriptor | undefined {
        return this.compositions.get(compositionId);
    }

    getBinding(capability: string): { readonly capability: string; readonly route_id: string } | undefined {
        if (!isCapabilityId(capability)) return undefined;
        const binding = this.bindings.get(capability);
        return binding ? { capability, route_id: binding.route_id } : undefined;
    }

    /** Return the immutable route object used to construct the handler. */
    getRoute(capability: CapabilityId): StructuredOutputRoute {
        const binding = this.bindings.get(capability);
        if (!binding) throw new RuntimeFault('capability_unavailable', `Capability ${capability} is not registered`);
        return binding;
    }
}

export function createCapabilityAdapterRegistry(bindings: CapabilityRouteBindings): CapabilityAdapterRegistry {
    return new CapabilityAdapterRegistry(bindings);
}
