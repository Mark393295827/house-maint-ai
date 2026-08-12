import { describe, expect, it } from 'vitest';
import type { AgentTaskEnvelope, EffectiveScope } from '../../../packages/contracts/src/index.js';
import {
    BILINGUAL_NEXT_ACTION_SCHEMA,
    CAPABILITY_IDS,
    CAPABILITY_PAYLOAD_SCHEMAS,
    createCapabilityAdapterRegistry,
    type CapabilityId,
    type StructuredOutputRequest,
    type StructuredOutputRoute,
} from '../../../packages/agent-adapters/src/index.js';

const bilingualPayload = {
    kind: 'review_plan', title: { zh_cn: '下一步', en_us: 'Next step' },
    instruction: { zh_cn: '请关闭相关供水，并确认维修方案。', en_us: 'Shut off the affected water supply and review the repair plan.' },
    safety_notice: { zh_cn: '如水接近电源，请远离并联系紧急服务。', en_us: 'If water nears electricity, keep away and contact emergency help.' },
    evidence_request: null, requires_human_action: true,
};

class OneShotRoute implements StructuredOutputRoute {
    constructor(readonly route_id: string, private readonly payload: unknown) {}
    async invoke(request: StructuredOutputRequest) {
        void request;
        return { payload: this.payload, usage: { wall_ms: 8, tokens: 45, cost_micros: 800, tool_calls: 0 } };
    }
}

function allRoutes(nextActionPayload: unknown = bilingualPayload) {
    const routes = {} as Record<CapabilityId, StructuredOutputRoute>;
    for (const capability of Object.values(CAPABILITY_IDS)) {
        routes[capability] = new OneShotRoute(
            capability === CAPABILITY_IDS.independentCritic ? 'route:independent-review' : `route:${capability}`,
            capability === CAPABILITY_IDS.bilingualNextAction ? nextActionPayload : {},
        );
    }
    return routes;
}

const allCapabilities = Object.values(CAPABILITY_IDS);
const outputScope: EffectiveScope = {
    schema: 'effective-scope/v1', scope_id: 'scope:case:5', scope_kind: 'case', organization_id: 2, case_id: 5,
    principal: {
        principal_id: 'principal:resident:1', actor_kind: 'member', organization_id: 2,
        membership_id: 3, user_id: 1, role: 'resident', authenticated_at: '2026-08-02T05:59:00.000Z',
    },
    actions: ['read'], data_classes: ['personal', 'financial', 'legal_advisory', 'internal'], capabilities: allCapabilities,
    tool_grants: [], purposes: ['maintenance_resolution'], region: 'cn-east', retention_days: 14,
    policy_version: 'policy:v1', resolved_at: '2026-08-02T05:59:00.000Z', expires_at: '2026-08-03T06:00:00.000Z',
};

function outputTask(capability: CapabilityId): AgentTaskEnvelope {
    return {
        schema: 'agent-task/v1', run_id: 'run:5', task_id: `task:${capability}`, scope_id: outputScope.scope_id,
        organization_id: 2, case_ref: { id: 5, version: 1 }, capability, input_artifact_ids: [],
        budget: { attempts: 1, wall_ms: 1_000, tokens: 500, cost_micros: 5_000, tool_calls: 0 },
        policy_version: 'policy:v1', idempotency_key: `output:${capability}`, expires_at: '2026-08-03T06:00:00.000Z',
    };
}

describe('agent output evaluation', () => {
    it('emits concise paired Chinese and English next-action copy without internal route metadata', async () => {
        const registry = createCapabilityAdapterRegistry(allRoutes());
        const task = outputTask(CAPABILITY_IDS.bilingualNextAction);
        const result = await registry.get(CAPABILITY_IDS.bilingualNextAction).run({
            task, scope: outputScope, input_artifacts: [], tools: {}, signal: new AbortController().signal,
        });
        const payload = BILINGUAL_NEXT_ACTION_SCHEMA.parse(result.artifact.payload);

        for (const pair of [payload.title, payload.instruction, payload.safety_notice, payload.evidence_request]) {
            if (!pair) continue;
            expect(pair.zh_cn.trim().length).toBeGreaterThan(0);
            expect(pair.en_us.trim().length).toBeGreaterThan(0);
            expect(pair.zh_cn.length).toBeLessThanOrEqual(240);
            expect(pair.en_us.length).toBeLessThanOrEqual(360);
        }
        expect(JSON.stringify(payload)).not.toMatch(/route_id|route:|raw_prompt|hidden_reasoning|chain_of_thought/i);
    });

    it('rejects missing bilingual parity, overlong copy, and hidden-reasoning fields', () => {
        const schema = CAPABILITY_PAYLOAD_SCHEMAS[CAPABILITY_IDS.bilingualNextAction];
        for (const payload of [
            { ...bilingualPayload, instruction: { zh_cn: '仅中文' } },
            { ...bilingualPayload, instruction: { zh_cn: '中'.repeat(241), en_us: 'Safe next action.' } },
            { ...bilingualPayload, hidden_reasoning: 'private analysis' },
        ]) {
            expect(() => schema.parse(payload)).toThrow();
        }
    });

    it('keeps critic output internal, evidence-coded, and explicitly route-independent', () => {
        const schema = CAPABILITY_PAYLOAD_SCHEMAS[CAPABILITY_IDS.independentCritic];
        const payload = schema.parse({
            subject_schema_name: 'maintenance-repair-plan/v1', subject_payload_hash: 'b'.repeat(64),
            route_independent: true,
            checks: [
                { name: 'schema', status: 'pass', evidence_codes: ['schema_valid'] },
                { name: 'safety', status: 'fail', evidence_codes: ['safety_text_missing'] },
            ],
            decision: 'rework', rework_fields: ['safety_notes'], client_visibility: 'internal_only',
        });
        expect(payload).toMatchObject({ route_independent: true, decision: 'rework', client_visibility: 'internal_only' });
        expect(JSON.stringify(payload)).not.toMatch(/reasoning|prompt|route:/i);
    });
});
