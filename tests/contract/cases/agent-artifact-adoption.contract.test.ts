import { describe, expect, it } from 'vitest';
import { CaseCommandEnvelopeSchema } from '@house-maint/contracts';

const SHA_A = 'a'.repeat(64);

function adoptionCommand(overrides: Record<string, unknown> = {}) {
    const artifact = {
        schema: 'agent-artifact/v1',
        artifact_id: 'artifact:repair-plan:1',
        schema_name: 'maintenance.repair-plan/v1',
        scope_id: 'case:7',
        organization_id: 1,
        case_id: 7,
        case_version: 1,
        producer_run_id: 'run:diagnose:1',
        producer_task_id: 'task:repair-plan:1',
        input_hashes: [SHA_A],
        payload_hash: SHA_A,
        payload: { summary: 'Replace the failed coupling.' },
        policy_version: 'policy:test:v1',
        data_class: 'personal',
        retention_days: 30,
        evaluation_state: 'accepted',
        supersedes_artifact_id: null,
        created_at: '2026-08-02T06:00:00.000Z',
    };
    const evaluation = {
        schema: 'evaluation-receipt/v1',
        evaluation_id: 'evaluation:repair-plan:1',
        artifact_id: artifact.artifact_id,
        evaluator_capability: 'maintenance.critic.independent.v1',
        independent_route: true,
        checks: [{ name: 'schema', status: 'pass', evidence_codes: ['schema-valid'] }],
        decision: 'accept',
        evaluated_at: '2026-08-02T06:01:00.000Z',
    };
    return {
        schema: 'case-command/v1',
        command_id: 'command:adopt-repair-plan-1',
        organization_id: 1,
        case_id: 7,
        expected_version: 1,
        idempotency_key: 'adopt-repair-plan-1',
        correlation_id: 'corr:adopt-repair-plan-1',
        body: {
            type: 'update_case',
            payload: {
                agent_artifact_adoption: {
                    artifact,
                    evaluation,
                    producer_route_id: 'route:repair-plan-producer',
                    evaluator_route_id: 'route:independent-critic',
                    ...overrides,
                },
            },
        },
        requested_at: '2026-08-02T06:02:00.000Z',
    };
}

describe('agent artifact adoption command contract', () => {
    it('accepts a fully bound, independently evaluated artifact adoption command', () => {
        expect(CaseCommandEnvelopeSchema.safeParse(adoptionCommand()).success).toBe(true);
    });

    it('rejects unevaluated, mismatched, self-approved, and internally failing evidence', () => {
        const pending = adoptionCommand();
        pending.body.payload.agent_artifact_adoption.artifact.evaluation_state = 'pending';
        expect(CaseCommandEnvelopeSchema.safeParse(pending).success).toBe(false);

        const wrongReceipt = adoptionCommand();
        wrongReceipt.body.payload.agent_artifact_adoption.evaluation.artifact_id = 'artifact:other';
        expect(CaseCommandEnvelopeSchema.safeParse(wrongReceipt).success).toBe(false);

        const selfApproved = adoptionCommand({
            evaluator_route_id: 'route:repair-plan-producer',
        });
        expect(CaseCommandEnvelopeSchema.safeParse(selfApproved).success).toBe(false);

        const failedCheck = adoptionCommand();
        failedCheck.body.payload.agent_artifact_adoption.evaluation.checks[0]!.status = 'fail';
        expect(CaseCommandEnvelopeSchema.safeParse(failedCheck).success).toBe(false);
    });

    it('binds the artifact organization, case, and source case version to the envelope', () => {
        const crossOrganization = adoptionCommand();
        crossOrganization.body.payload.agent_artifact_adoption.artifact.organization_id = 2;
        expect(CaseCommandEnvelopeSchema.safeParse(crossOrganization).success).toBe(false);

        const crossCase = adoptionCommand();
        crossCase.body.payload.agent_artifact_adoption.artifact.case_id = 8;
        expect(CaseCommandEnvelopeSchema.safeParse(crossCase).success).toBe(false);

        const staleArtifact = adoptionCommand();
        staleArtifact.body.payload.agent_artifact_adoption.artifact.case_version = 0;
        expect(CaseCommandEnvelopeSchema.safeParse(staleArtifact).success).toBe(false);
    });
});
