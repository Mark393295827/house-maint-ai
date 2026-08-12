import type {
    ArtifactEnvelope,
    DataClass,
    ExecutionBudget,
} from '../../contracts/src/index.js';
import type {
    RuntimeUsage,
} from '../../agent-core/src/index.js';

export const CAPABILITY_IDS = Object.freeze({
    diagnosis: 'maintenance.diagnosis.structured.v1',
    clarification: 'maintenance.clarification.structured.v1',
    hypothesis: 'maintenance.hypothesis.structured.v1',
    repairPlan: 'maintenance.repair-plan.structured.v1',
    materialsBom: 'maintenance.materials-bom.structured.v1',
    estimate: 'maintenance.estimate.nonbinding.v1',
    faultAttribution: 'maintenance.fault-attribution.advisory.v1',
    workerMatchCriteria: 'maintenance.worker-match-criteria.structured.v1',
    bilingualNextAction: 'maintenance.next-action.bilingual.v1',
    independentCritic: 'maintenance.critic.independent.v1',
} as const);

export type CapabilityId = typeof CAPABILITY_IDS[keyof typeof CAPABILITY_IDS];

export const ARTIFACT_SCHEMA_NAMES = Object.freeze({
    diagnosis: 'maintenance-diagnosis/v1',
    clarification: 'maintenance-clarification/v1',
    hypothesis: 'maintenance-hypothesis/v1',
    repairPlan: 'maintenance-repair-plan/v1',
    materialsBom: 'maintenance-materials-bom/v1',
    estimate: 'maintenance-estimate/v1',
    faultAttribution: 'maintenance-fault-attribution/v1',
    workerMatchCriteria: 'maintenance-worker-match-criteria/v1',
    bilingualNextAction: 'maintenance-bilingual-next-action/v1',
    independentCritic: 'maintenance-independent-critic/v1',
} as const);

export type ArtifactSchemaName = typeof ARTIFACT_SCHEMA_NAMES[keyof typeof ARTIFACT_SCHEMA_NAMES];

export interface CapabilityDescriptor {
    readonly capability: CapabilityId;
    readonly artifact_schema: ArtifactSchemaName;
    readonly data_class: DataClass;
    readonly retention_days: number;
}

export const CAPABILITY_DESCRIPTORS: Readonly<Record<CapabilityId, CapabilityDescriptor>> = Object.freeze({
    [CAPABILITY_IDS.diagnosis]: {
        capability: CAPABILITY_IDS.diagnosis,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.diagnosis,
        data_class: 'personal',
        retention_days: 30,
    },
    [CAPABILITY_IDS.clarification]: {
        capability: CAPABILITY_IDS.clarification,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.clarification,
        data_class: 'personal',
        retention_days: 7,
    },
    [CAPABILITY_IDS.hypothesis]: {
        capability: CAPABILITY_IDS.hypothesis,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.hypothesis,
        data_class: 'personal',
        retention_days: 30,
    },
    [CAPABILITY_IDS.repairPlan]: {
        capability: CAPABILITY_IDS.repairPlan,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.repairPlan,
        data_class: 'personal',
        retention_days: 30,
    },
    [CAPABILITY_IDS.materialsBom]: {
        capability: CAPABILITY_IDS.materialsBom,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.materialsBom,
        data_class: 'personal',
        retention_days: 30,
    },
    [CAPABILITY_IDS.estimate]: {
        capability: CAPABILITY_IDS.estimate,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.estimate,
        data_class: 'financial',
        retention_days: 30,
    },
    [CAPABILITY_IDS.faultAttribution]: {
        capability: CAPABILITY_IDS.faultAttribution,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.faultAttribution,
        data_class: 'legal_advisory',
        retention_days: 30,
    },
    [CAPABILITY_IDS.workerMatchCriteria]: {
        capability: CAPABILITY_IDS.workerMatchCriteria,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.workerMatchCriteria,
        data_class: 'personal',
        retention_days: 14,
    },
    [CAPABILITY_IDS.bilingualNextAction]: {
        capability: CAPABILITY_IDS.bilingualNextAction,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.bilingualNextAction,
        data_class: 'personal',
        retention_days: 14,
    },
    [CAPABILITY_IDS.independentCritic]: {
        capability: CAPABILITY_IDS.independentCritic,
        artifact_schema: ARTIFACT_SCHEMA_NAMES.independentCritic,
        data_class: 'internal',
        retention_days: 30,
    },
});

export interface StructuredOutputInputArtifact {
    readonly artifact_id: string;
    readonly schema_name: string;
    readonly payload_hash: string;
    readonly payload: Readonly<Record<string, unknown>>;
}

export interface StructuredOutputRequest {
    readonly schema: 'structured-output-request/v1';
    readonly capability: CapabilityId;
    readonly artifact_schema: ArtifactSchemaName;
    readonly lineage: {
        readonly run_id: string;
        readonly task_id: string;
    };
    readonly scope: {
        readonly scope_id: string;
        readonly organization_id: number;
        readonly case_id: number;
        readonly case_version: number;
        readonly policy_version: string;
        readonly region: string;
        readonly data_class: DataClass;
        readonly retention_days: number;
    };
    readonly inputs: readonly StructuredOutputInputArtifact[];
    readonly limits: Readonly<Pick<ExecutionBudget, 'wall_ms' | 'tokens' | 'cost_micros' | 'tool_calls'>>;
    readonly signal: AbortSignal;
}

export interface StructuredOutputResult {
    readonly payload: unknown;
    readonly usage: RuntimeUsage;
}

/**
 * Deployment code injects this narrow route. The adapter layer neither knows
 * nor selects any external client. Route identity is runtime-only and is never
 * copied into an artifact payload.
 */
export interface StructuredOutputRoute {
    readonly route_id: string;
    invoke(request: StructuredOutputRequest): Promise<StructuredOutputResult>;
}

export type CapabilityRouteBindings = Readonly<Record<CapabilityId, StructuredOutputRoute>>;

export interface StrictPayloadSchema<T extends Record<string, unknown>> {
    parse(value: unknown): T;
}

export type BilingualText = {
    readonly zh_cn: string;
    readonly en_us: string;
};

export type CriticCheckName = 'schema' | 'safety' | 'privacy' | 'grounding' | 'scope' | 'cost' | 'bilingual';
export type CriticCheck = {
    readonly name: CriticCheckName;
    readonly status: 'pass' | 'fail' | 'not_applicable';
    readonly evidence_codes: readonly string[];
};

export interface CriticPayload extends Record<string, unknown> {
    readonly subject_schema_name: string;
    readonly subject_payload_hash: string;
    readonly route_independent: true;
    readonly checks: readonly CriticCheck[];
    readonly decision: 'accept' | 'reject' | 'rework';
    readonly rework_fields: readonly string[];
    readonly client_visibility: 'internal_only';
}

export type ArtifactDataClass = ArtifactEnvelope['data_class'];
