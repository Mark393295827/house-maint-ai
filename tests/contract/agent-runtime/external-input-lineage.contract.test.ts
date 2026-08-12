import { describe, expect, it } from 'vitest';
import {
    AgentRunInputSchema,
    AgentRunPlanSchema,
    AgentRunRouteProofSchema,
    CONTRACT_SCHEMAS,
} from '../../../packages/contracts/src/index.js';

const hash = 'a'.repeat(64);
const now = '2026-08-02T06:00:00.000Z';

function routeProof() {
    return {
        schema: 'agent-run-route-proof/v1',
        proof_id: `route-proof:${hash}`,
        run_id: 'run:101',
        command_id: 'command:diagnose:101',
        scope_id: 'scope:case:101',
        organization_id: 7,
        case_ref: { id: 101, version: 3 },
        policy_version: 'policy:v1',
        artifact_id: 'artifact:external',
        evaluation_id: 'evaluation:external',
        data_class: 'personal',
        retention_days: 14,
        producer: { capability: 'intake.media.confirm.v1', route_id: 'route:intake:confirmed' },
        evaluator: { capability: 'intake.media.critic.v1', route_id: 'route:intake:critic' },
        bound_at: now,
    };
}

function runInput() {
    return {
        schema: 'agent-run-input/v1',
        input_id: `run-input:${hash}`,
        run_id: 'run:101',
        command_id: 'command:diagnose:101',
        scope_id: 'scope:case:101',
        organization_id: 7,
        case_ref: { id: 101, version: 3 },
        policy_version: 'policy:v1',
        artifact: {
            schema: 'agent-artifact/v1', artifact_id: 'artifact:external', schema_name: 'confirmed-intake/v1',
            scope_id: 'scope:case:101', organization_id: 7, case_id: 101, case_version: 3,
            producer_run_id: 'run:intake:101', producer_task_id: 'task:intake:101', input_hashes: [],
            payload_hash: hash, payload: { kind: 'photo', confirmed: true }, policy_version: 'policy:v1',
            data_class: 'personal', retention_days: 14, evaluation_state: 'accepted',
            supersedes_artifact_id: null, created_at: now,
        },
        evaluation: {
            schema: 'evaluation-receipt/v1', evaluation_id: 'evaluation:external', artifact_id: 'artifact:external',
            evaluator_capability: 'intake.media.critic.v1', independent_route: true,
            checks: ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost'].map((name) => ({
                name, status: 'pass', evidence_codes: ['synthetic_pass'],
            })),
            decision: 'accept', evaluated_at: now,
        },
        route_proof: routeProof(),
    };
}

describe('external agent-run input contracts', () => {
    it('keeps legacy plan bytes stable while allowing explicitly ordered external inputs', () => {
        const legacy = AgentRunPlanSchema.parse({
            schema: 'agent-run-plan/v1', plan_id: 'plan:legacy',
            tasks: [{ task_id: 'task:one', capability: 'diagnosis.structured.v1', depends_on_task_ids: [] }],
        });
        expect(Object.hasOwn(legacy.tasks[0]!, 'external_input_artifact_ids')).toBe(false);

        const declared = AgentRunPlanSchema.parse({
            schema: 'agent-run-plan/v1', plan_id: 'plan:external',
            tasks: [{
                task_id: 'task:one', capability: 'diagnosis.structured.v1',
                external_input_artifact_ids: ['artifact:photo', 'artifact:text'], depends_on_task_ids: [],
            }],
        });
        expect(declared.tasks[0]!.external_input_artifact_ids).toEqual(['artifact:photo', 'artifact:text']);
        expect(AgentRunPlanSchema.safeParse({
            ...declared,
            tasks: [{ ...declared.tasks[0], external_input_artifact_ids: ['artifact:photo', 'artifact:photo'] }],
        }).success).toBe(false);
    });

    it('publishes strict run-input and distinct route-proof schemas', () => {
        expect(AgentRunRouteProofSchema.safeParse(routeProof()).success).toBe(true);
        expect(AgentRunRouteProofSchema.safeParse({
            ...routeProof(), evaluator: routeProof().producer,
        }).success).toBe(false);
        expect(AgentRunInputSchema.safeParse(runInput()).success).toBe(true);
        expect(AgentRunInputSchema.safeParse({ ...runInput(), provider_api_key: 'forbidden' }).success).toBe(false);
        expect(CONTRACT_SCHEMAS['agent-run-input/v1']).toBe(AgentRunInputSchema);
    });
});
