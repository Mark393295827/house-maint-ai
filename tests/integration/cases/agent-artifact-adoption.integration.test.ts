import { describe, expect, it } from 'vitest';
import {
    CaseCommandEnvelopeSchema,
    EffectiveScopeSchema,
    type EffectiveScope,
} from '@house-maint/contracts';
import { CaseCommandService, replayCaseEvents } from '@house-maint/domain';
import { InMemoryCaseCommandRepository } from '../../../packages/persistence/src/cases/index.js';
import { FIXED_NOW, caseScope, openCaseCommand } from '../../contract/cases/fixtures.js';

const SHA_A = 'a'.repeat(64);

function systemCaseScope(caseId: number, input: {
    organizationId?: number;
    actions?: EffectiveScope['actions'];
    policyVersion?: string;
} = {}): EffectiveScope {
    const organizationId = input.organizationId ?? 1;
    return EffectiveScopeSchema.parse({
        schema: 'effective-scope/v1',
        scope_id: `case:${caseId}`,
        scope_kind: 'case',
        organization_id: organizationId,
        case_id: caseId,
        principal: {
            principal_id: `system:artifact-finalizer:${organizationId}`,
            actor_kind: 'system',
            organization_id: organizationId,
            role: 'system',
            authenticated_at: '2026-08-02T05:50:00.000Z',
        },
        actions: input.actions ?? ['read', 'verify'],
        data_classes: ['personal'],
        capabilities: ['maintenance.critic.independent.v1'],
        tool_grants: ['grant:case-artifact-adoption'],
        purposes: ['maintenance-case'],
        region: 'cn-east',
        retention_days: 30,
        policy_version: input.policyVersion ?? 'policy:test:v1',
        resolved_at: '2026-08-02T05:55:00.000Z',
        expires_at: '2026-08-02T07:00:00.000Z',
    });
}

function adoptionCommand(caseId: number, input: {
    key?: string;
    expectedVersion?: number;
    artifactCaseVersion?: number;
    artifactOrganizationId?: number;
    artifactCaseId?: number;
    artifactScopeId?: string;
    artifactPolicyVersion?: string;
    evaluationState?: 'pending' | 'accepted' | 'rejected' | 'superseded';
    evaluationDecision?: 'accept' | 'reject' | 'rework';
    independentRoute?: boolean;
    producerRouteId?: string;
    evaluatorRouteId?: string;
} = {}) {
    const key = input.key ?? 'adopt-repair-plan-1';
    const expectedVersion = input.expectedVersion ?? 1;
    const artifactId = 'artifact:repair-plan:1';
    return {
        schema: 'case-command/v1',
        command_id: `command:${key}`,
        organization_id: 1,
        case_id: caseId,
        expected_version: expectedVersion,
        idempotency_key: key,
        correlation_id: `corr:${key}`,
        body: {
            type: 'update_case',
            payload: {
                agent_artifact_adoption: {
                    artifact: {
                        schema: 'agent-artifact/v1',
                        artifact_id: artifactId,
                        schema_name: 'maintenance.repair-plan/v1',
                        scope_id: input.artifactScopeId ?? `case:${caseId}`,
                        organization_id: input.artifactOrganizationId ?? 1,
                        case_id: input.artifactCaseId ?? caseId,
                        case_version: input.artifactCaseVersion ?? expectedVersion,
                        producer_run_id: 'run:diagnose:1',
                        producer_task_id: 'task:repair-plan:1',
                        input_hashes: [SHA_A],
                        payload_hash: SHA_A,
                        payload: { summary: 'Replace the failed coupling.' },
                        policy_version: input.artifactPolicyVersion ?? 'policy:test:v1',
                        data_class: 'personal',
                        retention_days: 30,
                        evaluation_state: input.evaluationState ?? 'accepted',
                        supersedes_artifact_id: null,
                        created_at: '2026-08-02T06:00:00.000Z',
                    },
                    evaluation: {
                        schema: 'evaluation-receipt/v1',
                        evaluation_id: 'evaluation:repair-plan:1',
                        artifact_id: artifactId,
                        evaluator_capability: 'maintenance.critic.independent.v1',
                        independent_route: input.independentRoute ?? true,
                        checks: [{ name: 'schema', status: 'pass', evidence_codes: ['schema-valid'] }],
                        decision: input.evaluationDecision ?? 'accept',
                        evaluated_at: '2026-08-02T06:01:00.000Z',
                    },
                    producer_route_id: input.producerRouteId ?? 'route:repair-plan-producer',
                    evaluator_route_id: input.evaluatorRouteId ?? 'route:independent-critic',
                },
            },
        },
        requested_at: '2026-08-02T06:02:00.000Z',
    };
}

async function setup() {
    const repository = new InMemoryCaseCommandRepository();
    const service = new CaseCommandService(repository, () => FIXED_NOW);
    const opened = await service.execute({ command: openCaseCommand(), scope: caseScope() });
    return { repository, service, caseId: opened.projection.id };
}

describe('canonical agent artifact adoption', () => {
    it('appends one canonical acceptance event and converges exact replay', async () => {
        const { repository, service, caseId } = await setup();
        const command = adoptionCommand(caseId);
        expect(CaseCommandEnvelopeSchema.safeParse(command).success).toBe(true);

        const first = await service.execute({ command, scope: systemCaseScope(caseId) });
        const replay = await service.execute({ command, scope: systemCaseScope(caseId) });

        expect(first).toMatchObject({
            replayed: false,
            event: { event_type: 'agent_artifact_accepted', actor_type: 'system' },
            projection: { version: 2, accepted_artifact_ids: ['artifact:repair-plan:1'] },
        });
        expect(replay).toEqual({ ...first, replayed: true });
        const timeline = await repository.timeline(1, caseId);
        expect(timeline).toHaveLength(2);
        expect(replayCaseEvents(timeline)).toEqual(first.projection);
        expect(repository.getWriteAudit()).toHaveLength(2);
    });

    it('fails closed for stale, cross-scope, policy-mismatched, and underprivileged commands', async () => {
        const { repository, service, caseId } = await setup();

        await expect(service.execute({
            command: adoptionCommand(caseId, { expectedVersion: 0, artifactCaseVersion: 0, key: 'stale-adopt' }),
            scope: systemCaseScope(caseId),
        })).rejects.toMatchObject({ code: 'version_conflict' });
        await expect(service.execute({
            command: adoptionCommand(caseId, { artifactScopeId: 'case:999', key: 'wrong-scope' }),
            scope: systemCaseScope(caseId),
        })).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.execute({
            command: adoptionCommand(caseId, { artifactPolicyVersion: 'policy:other:v1', key: 'wrong-policy' }),
            scope: systemCaseScope(caseId),
        })).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.execute({
            command: adoptionCommand(caseId, { key: 'missing-action' }),
            scope: systemCaseScope(caseId, { actions: ['read'] }),
        })).rejects.toMatchObject({ code: 'forbidden' });
        expect((await repository.load(1, caseId))?.version).toBe(1);
    });

    it('denies unevaluated and producer-self-approved artifacts before mutation', async () => {
        const { repository, service, caseId } = await setup();
        await expect(service.execute({
            command: adoptionCommand(caseId, { evaluationState: 'pending', key: 'pending-artifact' }),
            scope: systemCaseScope(caseId),
        })).rejects.toMatchObject({ code: 'invalid_input' });
        await expect(service.execute({
            command: adoptionCommand(caseId, {
                evaluatorRouteId: 'route:repair-plan-producer', key: 'self-approved',
            }),
            scope: systemCaseScope(caseId),
        })).rejects.toMatchObject({ code: 'invalid_input' });
        expect((await repository.load(1, caseId))?.version).toBe(1);
    });

    it('rejects conflicting idempotency intent and a direct adapter writer', async () => {
        const { repository, service, caseId } = await setup();
        const command = adoptionCommand(caseId, { key: 'immutable-adoption' });
        await service.execute({ command, scope: systemCaseScope(caseId) });
        await expect(service.execute({
            command: adoptionCommand(caseId, {
                key: 'immutable-adoption', evaluatorRouteId: 'route:critic-replacement',
            }),
            scope: systemCaseScope(caseId),
        })).rejects.toMatchObject({ code: 'idempotency_conflict' });

        await expect(repository.execute({
            writerAuthority: 'agent-adapter/v1' as never,
            organizationId: 1,
            requestedCaseId: caseId,
            expectedVersion: 2,
            idempotencyKey: 'direct-adapter-write',
            commandHash: SHA_A,
            occurredAt: FIXED_NOW,
        }, () => {
            throw new Error('Direct adapter decider must never execute');
        })).rejects.toMatchObject({ code: 'writer_conflict' });
        expect(repository.getWriteAudit()).toHaveLength(2);
    });
});
