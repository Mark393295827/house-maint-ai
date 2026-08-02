import { z } from 'zod';
import {
    CapabilityIdSchema,
    CorrelationIdSchema,
    InstantSchema,
    OpaqueIdSchema,
    PositiveIdSchema,
    SafeArtifactPayloadSchema,
    Sha256Schema,
} from './primitives.js';

export const EvaluationReceiptSchema = z.object({
    schema: z.literal('evaluation-receipt/v1'),
    evaluation_id: OpaqueIdSchema,
    artifact_id: OpaqueIdSchema,
    evaluator_capability: CapabilityIdSchema,
    independent_route: z.boolean(),
    checks: z.array(z.object({
        name: z.enum(['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost', 'bilingual']),
        status: z.enum(['pass', 'fail', 'not_applicable']),
        evidence_codes: z.array(z.string().min(1).max(80)).max(20),
    }).strict()).min(1).max(16),
    decision: z.enum(['accept', 'reject', 'rework']),
    evaluated_at: InstantSchema,
}).strict();

export const ApprovalRequestSchema = z.object({
    schema: z.literal('approval-request/v1'),
    approval_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: z.number().int().nonnegative(),
    action: z.enum(['dispatch', 'quote', 'spend', 'external_message', 'policy_change', 'closure']),
    proposal_artifact_id: OpaqueIdSchema,
    proposal_hash: Sha256Schema,
    requested_by_run_id: OpaqueIdSchema,
    expires_at: InstantSchema,
}).strict();

export const ApprovalReceiptSchema = z.object({
    schema: z.literal('approval-receipt/v1'),
    approval_id: OpaqueIdSchema,
    request_hash: Sha256Schema,
    decision: z.enum(['approved', 'rejected', 'revoked']),
    decided_by_principal_id: OpaqueIdSchema,
    reason_code: z.string().min(2).max(80),
    decided_at: InstantSchema,
}).strict();

export const DeliveryEnvelopeSchema = z.object({
    schema: z.literal('delivery/v1'),
    delivery_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: z.number().int().nonnegative(),
    destination_binding_id: OpaqueIdSchema,
    channel: z.enum(['web', 'worker_portal', 'wechat', 'email', 'sms', 'internal_ops']),
    payload_artifact_id: OpaqueIdSchema,
    required_approval_id: OpaqueIdSchema.nullable(),
    correlation_id: CorrelationIdSchema,
    expires_at: InstantSchema,
}).strict();

export const DeliveryReceiptSchema = z.object({
    schema: z.literal('delivery-receipt/v1'),
    delivery_id: OpaqueIdSchema,
    attempt: z.number().int().positive().max(8),
    status: z.enum(['delivered', 'retryable_failure', 'permanent_failure', 'cancelled', 'expired']),
    external_reference_hash: Sha256Schema.nullable(),
    reason_code: z.string().min(1).max(80),
    recorded_at: InstantSchema,
}).strict();

export const CaseProgressSchema = z.object({
    schema: z.literal('case-progress/v1'),
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: z.number().int().nonnegative(),
    stage: z.enum(['intake', 'diagnosis', 'resolution', 'dispatch', 'repair', 'verification', 'closed']),
    run: z.object({
        run_id: OpaqueIdSchema,
        status: z.enum(['queued', 'working', 'needs_input', 'needs_approval', 'completed', 'cancelled', 'failed']),
        progress_percent: z.number().int().min(0).max(100),
    }).strict().nullable(),
    next_action: z.object({
        kind: z.enum(['wait', 'answer_question', 'retake_media', 'review_plan', 'approve', 'contact_emergency', 'none']),
        display: z.object({ zh_cn: z.string().max(2000), en_us: z.string().max(2000) }).strict(),
        artifact_id: OpaqueIdSchema.nullable(),
    }).strict(),
    updated_at: InstantSchema,
}).strict();

export const ErrorEnvelopeSchema = z.object({
    schema: z.literal('error/v1'),
    error: z.object({
        code: z.enum([
            'invalid_input', 'unauthenticated', 'forbidden', 'not_found', 'version_conflict',
            'idempotency_conflict', 'scope_expired', 'policy_denied', 'budget_exceeded',
            'cancelled', 'temporarily_unavailable', 'internal_error',
        ]),
        message: z.string().min(1).max(500),
        retryable: z.boolean(),
        correlation_id: CorrelationIdSchema,
        details: SafeArtifactPayloadSchema.optional(),
    }).strict(),
}).strict();

export const FeatureCompatibilitySchema = z.object({
    schema: z.literal('feature-compatibility/v1'),
    feature: z.enum([
        'case_api', 'report_facade', 'diagnose_and_plan', 'durable_worker',
        'case_progress', 'surface_plugins', 'legacy_agent_routes', 'polling_claws',
    ]),
    mode: z.enum(['off', 'shadow', 'cohort', 'on', 'read_only', 'retired']),
    rollback_mode: z.enum(['disable_new_execution', 'compatibility_read', 'restore_legacy']),
    contract_hash: Sha256Schema,
    changed_at: InstantSchema,
}).strict();

export const ActionProposalSchema = z.object({
    schema: z.literal('action-proposal/v1'),
    proposal_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: z.number().int().nonnegative(),
    action: z.enum(['dispatch', 'quote', 'spend', 'external_message', 'closure']),
    payload: SafeArtifactPayloadSchema,
    created_at: InstantSchema,
}).strict();

export type EvaluationReceipt = z.infer<typeof EvaluationReceiptSchema>;
export type ApprovalReceipt = z.infer<typeof ApprovalReceiptSchema>;
export type CaseProgress = z.infer<typeof CaseProgressSchema>;
