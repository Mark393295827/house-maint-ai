import { z } from 'zod';
import {
    CapabilityIdSchema,
    IdempotencyKeySchema,
    InstantSchema,
    NonNegativeVersionSchema,
    OpaqueIdSchema,
    PolicyVersionSchema,
    PositiveIdSchema,
} from './primitives.js';

export const ExecutionBudgetSchema = z.object({
    attempts: z.number().int().min(1).max(2),
    wall_ms: z.number().int().min(100).max(300_000),
    tokens: z.number().int().min(1).max(200_000),
    cost_micros: z.number().int().nonnegative().max(100_000_000),
    tool_calls: z.number().int().nonnegative().max(32).default(0),
}).strict();

export const CancellationSignalSchema = z.object({
    schema: z.literal('cancellation-signal/v1'),
    signal_id: OpaqueIdSchema,
    run_id: OpaqueIdSchema,
    requested_by_principal_id: OpaqueIdSchema,
    reason_code: z.enum(['user_requested', 'case_superseded', 'budget_exceeded', 'policy_revoked', 'operator_kill_switch', 'shutdown']),
    requested_at: InstantSchema,
}).strict();

export const AgentTaskEnvelopeSchema = z.object({
    schema: z.literal('agent-task/v1'),
    run_id: OpaqueIdSchema,
    task_id: OpaqueIdSchema,
    scope_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_ref: z.object({
        id: PositiveIdSchema,
        version: NonNegativeVersionSchema,
    }).strict(),
    capability: CapabilityIdSchema,
    input_artifact_ids: z.array(OpaqueIdSchema).max(32),
    budget: ExecutionBudgetSchema,
    policy_version: PolicyVersionSchema,
    idempotency_key: IdempotencyKeySchema,
    not_before: InstantSchema.optional(),
    expires_at: InstantSchema,
}).strict();

export const AgentTaskStateSchema = z.enum([
    'pending', 'ready', 'claimed', 'running', 'verifying', 'succeeded',
    'retry_wait', 'cancelled', 'failed', 'expired',
]);

export const AgentRunSchema = z.object({
    schema: z.literal('agent-run/v1'),
    run_id: OpaqueIdSchema,
    session_id: OpaqueIdSchema,
    scope_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: NonNegativeVersionSchema,
    command_id: OpaqueIdSchema,
    status: z.enum(['pending', 'running', 'waiting_approval', 'succeeded', 'cancelled', 'failed']),
    task_ids: z.array(OpaqueIdSchema).max(64),
    artifact_ids: z.array(OpaqueIdSchema).max(128),
    budget: ExecutionBudgetSchema,
    consumed: z.object({
        attempts: z.number().int().nonnegative(),
        wall_ms: z.number().int().nonnegative(),
        tokens: z.number().int().nonnegative(),
        cost_micros: z.number().int().nonnegative(),
        tool_calls: z.number().int().nonnegative(),
    }).strict(),
    policy_version: PolicyVersionSchema,
    created_at: InstantSchema,
    updated_at: InstantSchema,
    terminal_at: InstantSchema.nullable(),
}).strict();

export type ExecutionBudget = z.infer<typeof ExecutionBudgetSchema>;
export type AgentTaskEnvelope = z.infer<typeof AgentTaskEnvelopeSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
