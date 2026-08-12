import { AgentRunPlanSchema, type AgentRunPlan } from '../../contracts/src/index.js';
import { sha256 } from '../../agent-core/src/index.js';
import { CAPABILITY_IDS, type CapabilityId } from './types.js';

export type CompositionActivation =
    | 'always'
    | 'when_input_incomplete'
    | 'when_diagnosis_uncertain'
    | 'when_parts_required'
    | 'when_cost_requested'
    | 'when_responsibility_requested'
    | 'when_dispatch_preparation_requested';

export interface CapabilityCompositionStep {
    readonly step_id: string;
    readonly capability: CapabilityId;
    readonly depends_on: readonly string[];
    readonly activation: CompositionActivation;
}

export interface CapabilityCompositionDescriptor {
    readonly schema: 'capability-composition/v1';
    readonly composition_id: 'maintenance.diagnose-and-plan.v1';
    readonly max_tasks: 10;
    readonly max_parallelism: 3;
    readonly max_attempts_per_task: 2;
    readonly budget: {
        readonly wall_ms: number;
        readonly tokens: number;
        readonly cost_micros: number;
        readonly tool_calls: 0;
    };
    readonly steps: readonly CapabilityCompositionStep[];
    readonly outputs: {
        readonly client_artifact_step: 'bilingual-next-action';
        readonly critic_artifact_step: 'independent-critic';
    };
    readonly authority: {
        readonly domain_writes: false;
        readonly deliveries: false;
        readonly external_effects: false;
    };
}

function deepFreeze<T>(value: T): T {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    return Object.freeze(value);
}

export const DIAGNOSE_AND_PLAN_COMPOSITION: CapabilityCompositionDescriptor = deepFreeze({
    schema: 'capability-composition/v1',
    composition_id: 'maintenance.diagnose-and-plan.v1',
    max_tasks: 10,
    max_parallelism: 3,
    max_attempts_per_task: 2,
    budget: {
        wall_ms: 60_000,
        tokens: 24_000,
        cost_micros: 900_000,
        tool_calls: 0,
    },
    steps: [
        {
            step_id: 'clarification', capability: CAPABILITY_IDS.clarification,
            depends_on: [], activation: 'when_input_incomplete',
        },
        {
            step_id: 'diagnosis', capability: CAPABILITY_IDS.diagnosis,
            depends_on: [], activation: 'always',
        },
        {
            step_id: 'hypothesis', capability: CAPABILITY_IDS.hypothesis,
            depends_on: ['diagnosis'], activation: 'when_diagnosis_uncertain',
        },
        {
            step_id: 'repair-plan', capability: CAPABILITY_IDS.repairPlan,
            depends_on: ['diagnosis', 'hypothesis'], activation: 'always',
        },
        {
            step_id: 'materials-bom', capability: CAPABILITY_IDS.materialsBom,
            depends_on: ['repair-plan'], activation: 'when_parts_required',
        },
        {
            step_id: 'estimate', capability: CAPABILITY_IDS.estimate,
            depends_on: ['repair-plan', 'materials-bom'], activation: 'when_cost_requested',
        },
        {
            step_id: 'fault-attribution', capability: CAPABILITY_IDS.faultAttribution,
            depends_on: ['diagnosis'], activation: 'when_responsibility_requested',
        },
        {
            step_id: 'worker-match-criteria', capability: CAPABILITY_IDS.workerMatchCriteria,
            depends_on: ['repair-plan'], activation: 'when_dispatch_preparation_requested',
        },
        {
            step_id: 'independent-critic', capability: CAPABILITY_IDS.independentCritic,
            depends_on: ['repair-plan'], activation: 'always',
        },
        {
            step_id: 'bilingual-next-action', capability: CAPABILITY_IDS.bilingualNextAction,
            depends_on: [
                'clarification', 'repair-plan', 'estimate', 'fault-attribution',
                'worker-match-criteria', 'independent-critic',
            ],
            activation: 'always',
        },
    ],
    outputs: {
        client_artifact_step: 'bilingual-next-action',
        critic_artifact_step: 'independent-critic',
    },
    authority: {
        domain_writes: false,
        deliveries: false,
        external_effects: false,
    },
});

const PILOT_STEPS = Object.freeze([
    { step_id: 'diagnosis', capability: CAPABILITY_IDS.diagnosis, dependencies: [] },
    { step_id: 'repair-plan', capability: CAPABILITY_IDS.repairPlan, dependencies: ['diagnosis'] },
    { step_id: 'independent-critic', capability: CAPABILITY_IDS.independentCritic, dependencies: ['repair-plan'] },
    {
        step_id: 'bilingual-next-action', capability: CAPABILITY_IDS.bilingualNextAction,
        dependencies: ['repair-plan', 'independent-critic'],
    },
] as const);

/**
 * The pilot deliberately activates only the smallest user-visible path from
 * the broader ten-capability descriptor. Task identities are derived from the
 * canonical run identity so restart and replay produce the same plan bytes.
 */
export function createDiagnoseAndPlanRunPlan(
    runId: string,
    externalInputArtifactIds: readonly string[] = [],
): AgentRunPlan {
    const taskIdByStep = new Map(PILOT_STEPS.map((step) => [
        step.step_id,
        `task:${sha256({ composition_id: DIAGNOSE_AND_PLAN_COMPOSITION.composition_id, run_id: runId, step_id: step.step_id }).slice(0, 48)}`,
    ]));
    return AgentRunPlanSchema.parse({
        schema: 'agent-run-plan/v1',
        plan_id: `plan:${sha256({ composition_id: DIAGNOSE_AND_PLAN_COMPOSITION.composition_id, run_id: runId }).slice(0, 48)}`,
        tasks: PILOT_STEPS.map((step) => ({
            task_id: taskIdByStep.get(step.step_id),
            capability: step.capability,
            ...(step.step_id === 'diagnosis' && externalInputArtifactIds.length > 0
                ? { external_input_artifact_ids: [...externalInputArtifactIds] }
                : {}),
            depends_on_task_ids: step.dependencies.map((dependency) => taskIdByStep.get(dependency)),
        })),
    });
}
