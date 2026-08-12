import { z } from 'zod';
import { ArtifactEnvelopeSchema } from './artifact.js';
import { EvaluationReceiptSchema } from './effects.js';
import {
    CapabilityIdSchema,
    CorrelationIdSchema,
    IdempotencyKeySchema,
    InstantSchema,
    NonNegativeVersionSchema,
    OpaqueIdSchema,
    PositiveIdSchema,
    SafeArtifactPayloadSchema,
} from './primitives.js';

export const CaseStatusSchema = z.enum(['open', 'resolved', 'closed', 'cancelled']);
export const CaseStageSchema = z.enum(['intake', 'diagnosis', 'resolution', 'dispatch', 'repair', 'verification', 'closed']);
export const CasePrioritySchema = z.enum(['low', 'normal', 'urgent', 'emergency']);
export const EvidenceReferenceSchema = z.object({
    artifact_id: OpaqueIdSchema,
    media_kind: z.enum(['image', 'voice', 'video', 'text']),
    consent_receipt_id: OpaqueIdSchema.optional(),
}).strict();

const OpenCasePayloadSchema = z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(10).max(20_000),
    category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting', 'other']).optional(),
    priority: CasePrioritySchema.default('normal'),
    property_id: PositiveIdSchema.nullable().optional(),
    unit_id: PositiveIdSchema.nullable().optional(),
    evidence: z.array(EvidenceReferenceSchema).max(20).default([]),
}).strict().superRefine((value, context) => {
    if (value.unit_id && !value.property_id) {
        context.addIssue({ code: 'custom', path: ['unit_id'], message: 'unit_id requires property_id' });
    }
});

const DiagnoseAndPlanPayloadSchema = z.object({
    confirmed_input_artifact_ids: z.array(OpaqueIdSchema).min(1).max(20),
    locale: z.enum(['zh-CN', 'en-US', 'bilingual']).default('bilingual'),
    requested_capability: z.literal('maintenance.diagnose-and-plan.v1'),
}).strict();

const UpdateCaseFieldsPayloadSchema = z.object({
    title: z.string().trim().min(2).max(200).optional(),
    priority: CasePrioritySchema.optional(),
    property_id: PositiveIdSchema.nullable().optional(),
    unit_id: PositiveIdSchema.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one update field is required');

export const AgentArtifactAdoptionSchema = z.object({
    artifact: ArtifactEnvelopeSchema,
    evaluation: EvaluationReceiptSchema,
    producer_route_id: OpaqueIdSchema,
    evaluator_route_id: OpaqueIdSchema,
}).strict().superRefine((value, context) => {
    if (value.artifact.evaluation_state !== 'accepted') {
        context.addIssue({
            code: 'custom',
            path: ['artifact', 'evaluation_state'],
            message: 'Only an accepted artifact can be adopted by a case',
        });
    }
    if (value.evaluation.artifact_id !== value.artifact.artifact_id) {
        context.addIssue({
            code: 'custom',
            path: ['evaluation', 'artifact_id'],
            message: 'Evaluation receipt must bind the adopted artifact',
        });
    }
    if (value.evaluation.decision !== 'accept' || !value.evaluation.independent_route
        || value.evaluation.checks.some((check) => check.status === 'fail')) {
        context.addIssue({
            code: 'custom',
            path: ['evaluation'],
            message: 'Artifact adoption requires an independently accepted evaluation with no failed check',
        });
    }
    if (value.producer_route_id === value.evaluator_route_id) {
        context.addIssue({
            code: 'custom',
            path: ['evaluator_route_id'],
            message: 'The evaluator route must be distinct from the producer route',
        });
    }
    if (Date.parse(value.evaluation.evaluated_at) < Date.parse(value.artifact.created_at)) {
        context.addIssue({
            code: 'custom',
            path: ['evaluation', 'evaluated_at'],
            message: 'Evaluation cannot predate the artifact',
        });
    }
});

const AgentArtifactAdoptionPayloadSchema = z.object({
    agent_artifact_adoption: AgentArtifactAdoptionSchema,
}).strict();

const UpdateCasePayloadSchema = z.union([
    UpdateCaseFieldsPayloadSchema,
    AgentArtifactAdoptionPayloadSchema,
]);

const CaseActionPayloadSchema = z.object({
    reason_code: z.string().min(2).max(80),
    evidence_artifact_ids: z.array(OpaqueIdSchema).max(20).default([]),
}).strict();

export const CaseCommandBodySchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('open_case'), payload: OpenCasePayloadSchema }).strict(),
    z.object({ type: z.literal('diagnose_and_plan'), payload: DiagnoseAndPlanPayloadSchema }).strict(),
    z.object({ type: z.literal('update_case'), payload: UpdateCasePayloadSchema }).strict(),
    z.object({ type: z.literal('resolve_case'), payload: CaseActionPayloadSchema }).strict(),
    z.object({ type: z.literal('close_case'), payload: CaseActionPayloadSchema }).strict(),
    z.object({ type: z.literal('cancel_case'), payload: CaseActionPayloadSchema }).strict(),
    z.object({ type: z.literal('reopen_case'), payload: CaseActionPayloadSchema }).strict(),
]);

export const CaseCommandEnvelopeSchema = z.object({
    schema: z.literal('case-command/v1'),
    command_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema.optional(),
    expected_version: NonNegativeVersionSchema,
    idempotency_key: IdempotencyKeySchema,
    correlation_id: CorrelationIdSchema,
    body: CaseCommandBodySchema,
    requested_at: InstantSchema,
}).strict().superRefine((value, context) => {
    if (value.body.type === 'open_case' && value.case_id) {
        context.addIssue({ code: 'custom', path: ['case_id'], message: 'open_case cannot name an existing case' });
    }
    if (value.body.type !== 'open_case' && !value.case_id) {
        context.addIssue({ code: 'custom', path: ['case_id'], message: 'Existing-case commands require case_id' });
    }
    if (value.body.type === 'update_case' && 'agent_artifact_adoption' in value.body.payload) {
        const adoption = value.body.payload.agent_artifact_adoption;
        if (adoption.artifact.organization_id !== value.organization_id) {
            context.addIssue({
                code: 'custom',
                path: ['body', 'payload', 'agent_artifact_adoption', 'artifact', 'organization_id'],
                message: 'Adopted artifact must belong to the command organization',
            });
        }
        if (adoption.artifact.case_id !== value.case_id) {
            context.addIssue({
                code: 'custom',
                path: ['body', 'payload', 'agent_artifact_adoption', 'artifact', 'case_id'],
                message: 'Adopted artifact must belong to the command case',
            });
        }
        if (adoption.artifact.case_version !== value.expected_version) {
            context.addIssue({
                code: 'custom',
                path: ['body', 'payload', 'agent_artifact_adoption', 'artifact', 'case_version'],
                message: 'Adopted artifact must bind the command source case version',
            });
        }
        if (Date.parse(adoption.evaluation.evaluated_at) > Date.parse(value.requested_at)) {
            context.addIssue({
                code: 'custom',
                path: ['requested_at'],
                message: 'Artifact adoption cannot be requested before its evaluation',
            });
        }
    }
});

export const CaseEventEnvelopeSchema = z.object({
    schema: z.literal('case-event/v1'),
    event_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    sequence: z.number().int().positive(),
    case_version: z.number().int().positive(),
    event_type: z.enum([
        'case_opened', 'legacy_imported', 'case_updated', 'case_stage_changed',
        'agent_run_requested', 'agent_artifact_accepted', 'approval_requested',
        'approval_decided', 'case_resolved', 'case_closed', 'case_cancelled', 'case_reopened',
    ]),
    actor_type: z.enum(['member', 'system', 'agent', 'integration']),
    actor_membership_id: PositiveIdSchema.nullable(),
    idempotency_key: IdempotencyKeySchema,
    correlation_id: CorrelationIdSchema,
    payload: SafeArtifactPayloadSchema,
    occurred_at: InstantSchema,
}).strict().superRefine((value, context) => {
    if (value.actor_type === 'member' && !value.actor_membership_id) {
        context.addIssue({ code: 'custom', path: ['actor_membership_id'], message: 'Member events require actor membership' });
    }
    if (value.actor_type !== 'member' && value.actor_membership_id) {
        context.addIssue({ code: 'custom', path: ['actor_membership_id'], message: 'Non-member events cannot claim membership' });
    }
});

export const CaseProjectionSchema = z.object({
    schema: z.literal('case-projection/v1'),
    id: PositiveIdSchema,
    organization_id: PositiveIdSchema,
    property_id: PositiveIdSchema.nullable(),
    unit_id: PositiveIdSchema.nullable(),
    title: z.string().min(1).max(500),
    status: CaseStatusSchema,
    stage: CaseStageSchema,
    priority: CasePrioritySchema,
    version: z.number().int().positive(),
    active_run_id: OpaqueIdSchema.nullable(),
    accepted_artifact_ids: z.array(OpaqueIdSchema),
    created_at: InstantSchema,
    updated_at: InstantSchema,
    closed_at: InstantSchema.nullable(),
}).strict();

export type CaseCommandEnvelope = z.infer<typeof CaseCommandEnvelopeSchema>;
export type CaseEventEnvelope = z.infer<typeof CaseEventEnvelopeSchema>;
export type CaseProjection = z.infer<typeof CaseProjectionSchema>;
export type CaseCapability = z.infer<typeof CapabilityIdSchema>;
export type AgentArtifactAdoption = z.infer<typeof AgentArtifactAdoptionSchema>;
