import { z } from 'zod';
import { ArtifactEnvelopeSchema } from './artifact.js';
import { EvaluationReceiptSchema } from './effects.js';
import {
    CapabilityIdSchema,
    DataClassSchema,
    IdempotencyKeySchema,
    InstantSchema,
    NonNegativeVersionSchema,
    OpaqueIdSchema,
    PolicyVersionSchema,
    PositiveIdSchema,
    Sha256Schema,
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

const RunCaseRefSchema = z.object({
    id: PositiveIdSchema,
    version: NonNegativeVersionSchema,
}).strict();

const RouteBindingSchema = z.object({
    capability: CapabilityIdSchema,
    route_id: OpaqueIdSchema,
}).strict();

export const AgentRunRouteProofSchema = z.object({
    schema: z.literal('agent-run-route-proof/v1'),
    proof_id: OpaqueIdSchema,
    run_id: OpaqueIdSchema,
    command_id: OpaqueIdSchema,
    scope_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_ref: RunCaseRefSchema,
    policy_version: PolicyVersionSchema,
    artifact_id: OpaqueIdSchema,
    evaluation_id: OpaqueIdSchema,
    data_class: DataClassSchema,
    retention_days: z.number().int().nonnegative().max(3650),
    producer: RouteBindingSchema,
    evaluator: RouteBindingSchema,
    bound_at: InstantSchema,
}).strict().superRefine((proof, context) => {
    if (proof.producer.route_id === proof.evaluator.route_id) {
        context.addIssue({
            code: 'custom', path: ['evaluator', 'route_id'],
            message: 'Producer and evaluator routes must be distinct',
        });
    }
    if (proof.producer.capability === proof.evaluator.capability) {
        context.addIssue({
            code: 'custom', path: ['evaluator', 'capability'],
            message: 'Producer and evaluator capabilities must be distinct',
        });
    }
});

export const AgentRunInputSchema = z.object({
    schema: z.literal('agent-run-input/v1'),
    input_id: OpaqueIdSchema,
    run_id: OpaqueIdSchema,
    command_id: OpaqueIdSchema,
    scope_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_ref: RunCaseRefSchema,
    policy_version: PolicyVersionSchema,
    artifact: ArtifactEnvelopeSchema,
    evaluation: EvaluationReceiptSchema,
    route_proof: AgentRunRouteProofSchema,
}).strict().superRefine((input, context) => {
    const proof = input.route_proof;
    const artifact = input.artifact;
    const mismatches: Array<[string, boolean]> = [
        ['run_id', proof.run_id !== input.run_id],
        ['command_id', proof.command_id !== input.command_id],
        ['scope_id', proof.scope_id !== input.scope_id || artifact.scope_id !== input.scope_id],
        ['organization_id', proof.organization_id !== input.organization_id || artifact.organization_id !== input.organization_id],
        ['case_ref', proof.case_ref.id !== input.case_ref.id || proof.case_ref.version !== input.case_ref.version
            || artifact.case_id !== input.case_ref.id || artifact.case_version !== input.case_ref.version],
        ['policy_version', proof.policy_version !== input.policy_version || artifact.policy_version !== input.policy_version],
        ['artifact_id', proof.artifact_id !== artifact.artifact_id || input.evaluation.artifact_id !== artifact.artifact_id],
        ['evaluation_id', proof.evaluation_id !== input.evaluation.evaluation_id],
        ['data_class', proof.data_class !== artifact.data_class],
        ['retention_days', proof.retention_days !== artifact.retention_days],
        ['evaluator_capability', proof.evaluator.capability !== input.evaluation.evaluator_capability],
    ];
    for (const [field, mismatch] of mismatches) {
        if (mismatch) context.addIssue({ code: 'custom', path: ['route_proof', field], message: `${field} binding differs` });
    }
});

export const AgentRunPlanTaskSchema = z.object({
    task_id: OpaqueIdSchema,
    capability: CapabilityIdSchema,
    external_input_artifact_ids: z.array(OpaqueIdSchema).max(32).optional(),
    depends_on_task_ids: z.array(OpaqueIdSchema).max(32),
}).strict();

export const AgentRunPlanSchema = z.object({
    schema: z.literal('agent-run-plan/v1'),
    plan_id: OpaqueIdSchema,
    tasks: z.array(AgentRunPlanTaskSchema).min(1).max(64),
}).strict().superRefine((plan, context) => {
    const priorTaskIds = new Set<string>();
    for (let index = 0; index < plan.tasks.length; index += 1) {
        const task = plan.tasks[index]!;
        if (priorTaskIds.has(task.task_id)) {
            context.addIssue({
                code: 'custom',
                path: ['tasks', index, 'task_id'],
                message: 'Plan task ids must be unique',
            });
        }
        const dependencies = new Set<string>();
        const externalInputs = new Set<string>();
        for (let inputIndex = 0; inputIndex < (task.external_input_artifact_ids?.length ?? 0); inputIndex += 1) {
            const artifactId = task.external_input_artifact_ids![inputIndex]!;
            if (externalInputs.has(artifactId)) {
                context.addIssue({
                    code: 'custom', path: ['tasks', index, 'external_input_artifact_ids', inputIndex],
                    message: 'Plan task external inputs must be unique',
                });
            }
            externalInputs.add(artifactId);
        }
        for (let dependencyIndex = 0; dependencyIndex < task.depends_on_task_ids.length; dependencyIndex += 1) {
            const dependency = task.depends_on_task_ids[dependencyIndex]!;
            if (dependencies.has(dependency)) {
                context.addIssue({
                    code: 'custom',
                    path: ['tasks', index, 'depends_on_task_ids', dependencyIndex],
                    message: 'Plan task dependencies must be unique',
                });
            }
            if (!priorTaskIds.has(dependency)) {
                context.addIssue({
                    code: 'custom',
                    path: ['tasks', index, 'depends_on_task_ids', dependencyIndex],
                    message: 'Plan dependencies must reference an earlier declared task',
                });
            }
            dependencies.add(dependency);
        }
        priorTaskIds.add(task.task_id);
    }
});

export const AgentRunSchema = z.object({
    schema: z.literal('agent-run/v1'),
    run_id: OpaqueIdSchema,
    session_id: OpaqueIdSchema,
    scope_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: NonNegativeVersionSchema,
    command_id: OpaqueIdSchema,
    plan: AgentRunPlanSchema.nullable().default(null),
    plan_hash: Sha256Schema.nullable().default(null),
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
}).strict().superRefine((run, context) => {
    if ((run.plan === null) !== (run.plan_hash === null)) {
        context.addIssue({
            code: 'custom',
            path: ['plan_hash'],
            message: 'Run plan and plan hash must be present or absent together',
        });
    }
});

export type ExecutionBudget = z.infer<typeof ExecutionBudgetSchema>;
export type AgentTaskEnvelope = z.infer<typeof AgentTaskEnvelopeSchema>;
export type AgentRunRouteProof = z.infer<typeof AgentRunRouteProofSchema>;
export type AgentRunInput = z.infer<typeof AgentRunInputSchema>;
export type AgentRunPlan = z.infer<typeof AgentRunPlanSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
