import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    ArtifactEnvelopeSchema,
    SafeArtifactPayloadSchema,
    type AgentTaskEnvelope,
    type EffectiveScope,
} from '../../../packages/contracts/src/index.js';
import {
    AgentKernel,
    InMemoryAgentStore,
    RuntimeFault,
    type CapabilityRequest,
    type RuntimeUsage,
} from '../../../packages/agent-core/src/index.js';
import { FakeEvaluator, ManualClock } from '../../../packages/testkit/src/agent-runtime/index.js';
import {
    ARTIFACT_SCHEMA_NAMES,
    CAPABILITY_DESCRIPTORS,
    CAPABILITY_IDS,
    CAPABILITY_PAYLOAD_SCHEMAS,
    DIAGNOSE_AND_PLAN_COMPOSITION,
    createCapabilityAdapterRegistry,
    type CapabilityId,
    type StructuredOutputRequest,
    type StructuredOutputRoute,
} from '../../../packages/agent-adapters/src/index.js';

const CAPABILITIES = Object.values(CAPABILITY_IDS);

const validPayloads: Record<CapabilityId, Record<string, unknown>> = {
    [CAPABILITY_IDS.diagnosis]: {
        category: 'plumbing', severity: 'moderate', issue_summary: 'A supply joint may be leaking.',
        confidence: 0.82, observations: ['Moisture is visible below the joint.'],
        uncertainty: 'The joint must be inspected in person.', emergency: false,
        safety_warnings: ['Shut off the affected water supply if leakage increases.'],
    },
    [CAPABILITY_IDS.clarification]: {
        status: 'needs_input', canonical_intent: 'Confirm when the leak occurs.',
        question: { zh_cn: '漏水是否只在用水时出现？', en_us: 'Does the leak appear only while water is running?' },
        answer_kind: 'boolean', options: [], missing_evidence: ['timing'],
    },
    [CAPABILITY_IDS.hypothesis]: {
        hypotheses: [{
            id: 'h1', label: 'Degraded joint seal', probability: 0.7,
            evidence_for: ['Moisture is concentrated at the joint.'], evidence_against: [],
            evidence_needed: ['Dry the joint and observe it during water flow.'],
        }],
        unresolved_questions: ['Whether the pipe body is also corroded.'],
    },
    [CAPABILITY_IDS.repairPlan]: {
        summary: { zh_cn: '先隔离漏水点，再由水工检查并重新密封。', en_us: 'Isolate the leak, then have a plumber inspect and reseal the joint.' },
        steps: [{ order: 1, instruction: { zh_cn: '关闭相关供水。', en_us: 'Shut off the affected water supply.' }, safety_critical: true }],
        safety_notes: [{ zh_cn: '地面积水时避免接触附近电器。', en_us: 'Keep clear of nearby electrical items if water pools.' }],
        professional_required: true, duration_minutes: { min: 30, max: 90 },
    },
    [CAPABILITY_IDS.materialsBom]: {
        items: [{
            name: { zh_cn: '聚四氟乙烯密封带', en_us: 'PTFE thread-seal tape' }, specification: '12 mm',
            quantity: 1, unit: 'roll', required: true,
        }],
        tools: [{ zh_cn: '管钳', en_us: 'Pipe wrench' }], substitutions: [], note: null,
    },
    [CAPABILITY_IDS.estimate]: {
        currency: 'CNY', total: { min: 120, max: 360 }, labor: { min: 100, max: 300 },
        materials: { min: 20, max: 60 }, confidence: 0.64,
        basis_codes: ['local_minor_plumbing_range'], non_binding: true,
        assumptions: [{ zh_cn: '不含隐蔽管道更换。', en_us: 'Concealed pipe replacement is excluded.' }],
    },
    [CAPABILITY_IDS.faultAttribution]: {
        advisory_only: true, attribution: 'undetermined', confidence: 0.45,
        evidence_codes: ['insufficient_tenancy_context'],
        basis_summary: { zh_cn: '现有证据不足以判定责任。', en_us: 'Current evidence is insufficient to attribute responsibility.' },
        legal_decision: false, human_review_required: true,
    },
    [CAPABILITY_IDS.workerMatchCriteria]: {
        required_skills: [{ zh_cn: '水管维修', en_us: 'Plumbing repair' }], certifications: [],
        urgency: 'same_day', location_radius_km: 15, sla_minutes: 240,
        constraints: ['Bring leak-isolation tools.'], assignment_permitted: false,
    },
    [CAPABILITY_IDS.bilingualNextAction]: {
        kind: 'review_plan', title: { zh_cn: '下一步', en_us: 'Next step' },
        instruction: { zh_cn: '请关闭相关供水，并确认维修方案。', en_us: 'Shut off the affected water supply and review the repair plan.' },
        safety_notice: { zh_cn: '如水接近电源，请远离并联系紧急服务。', en_us: 'If water nears electricity, keep away and contact emergency help.' },
        evidence_request: null, requires_human_action: true,
    },
    [CAPABILITY_IDS.independentCritic]: {
        subject_schema_name: ARTIFACT_SCHEMA_NAMES.repairPlan,
        subject_payload_hash: 'a'.repeat(64), route_independent: true,
        checks: [
            { name: 'schema', status: 'pass', evidence_codes: ['schema_valid'] },
            { name: 'safety', status: 'pass', evidence_codes: ['safety_preserved'] },
            { name: 'privacy', status: 'pass', evidence_codes: ['no_private_leak'] },
            { name: 'grounding', status: 'pass', evidence_codes: ['inputs_bound'] },
            { name: 'scope', status: 'pass', evidence_codes: ['scope_bound'] },
            { name: 'cost', status: 'pass', evidence_codes: ['non_binding'] },
            { name: 'bilingual', status: 'pass', evidence_codes: ['paired_copy'] },
        ],
        decision: 'accept', rework_fields: [], client_visibility: 'internal_only',
    },
};

class FakeStructuredRoute implements StructuredOutputRoute {
    readonly calls: StructuredOutputRequest[] = [];

    constructor(
        readonly route_id: string,
        private readonly payload: unknown,
        private readonly usage: RuntimeUsage = { wall_ms: 20, tokens: 100, cost_micros: 2_000, tool_calls: 0 },
    ) {}

    async invoke(request: StructuredOutputRequest) {
        this.calls.push(request);
        return { payload: this.payload, usage: this.usage };
    }
}

function routeBindings(overrides: Partial<Record<CapabilityId, StructuredOutputRoute>> = {}) {
    return Object.fromEntries(CAPABILITIES.map((capability) => [
        capability,
        overrides[capability] ?? new FakeStructuredRoute(
            capability === CAPABILITY_IDS.independentCritic ? 'route:critic-b' : `route:${capability.replace(/[^a-z0-9]+/g, '-')}`,
            validPayloads[capability],
        ),
    ])) as Record<CapabilityId, StructuredOutputRoute>;
}

function scope(overrides: Partial<EffectiveScope> = {}): EffectiveScope {
    return {
        schema: 'effective-scope/v1', scope_id: 'scope:case:101', scope_kind: 'case', organization_id: 7, case_id: 101,
        principal: {
            principal_id: 'principal:resident:9', actor_kind: 'member', organization_id: 7,
            membership_id: 12, user_id: 9, role: 'resident', authenticated_at: '2026-08-02T05:59:00.000Z',
        },
        actions: ['read', 'contribute'],
        data_classes: ['personal', 'financial', 'legal_advisory', 'internal'], capabilities: CAPABILITIES,
        tool_grants: [], purposes: ['maintenance_diagnosis', 'maintenance_resolution'], region: 'cn-east', retention_days: 30,
        policy_version: 'policy:v1', resolved_at: '2026-08-02T05:59:00.000Z', expires_at: '2026-08-03T06:00:00.000Z',
        ...overrides,
    };
}

function task(capability: CapabilityId, overrides: Partial<AgentTaskEnvelope> = {}): AgentTaskEnvelope {
    return {
        schema: 'agent-task/v1', run_id: 'run:101', task_id: `task:${capability}`, scope_id: 'scope:case:101',
        organization_id: 7, case_ref: { id: 101, version: 3 }, capability, input_artifact_ids: [],
        budget: { attempts: 2, wall_ms: 5_000, tokens: 2_000, cost_micros: 100_000, tool_calls: 0 },
        policy_version: 'policy:v1', idempotency_key: `key:${capability}`, expires_at: '2026-08-03T06:00:00.000Z',
        ...overrides,
    };
}

const criticSubject = ArtifactEnvelopeSchema.parse({
    schema: 'agent-artifact/v1', artifact_id: 'artifact:repair-plan:101',
    schema_name: ARTIFACT_SCHEMA_NAMES.repairPlan, scope_id: 'scope:case:101', organization_id: 7,
    case_id: 101, case_version: 3, producer_run_id: 'run:101', producer_task_id: 'task:repair-plan:101',
    input_hashes: [], payload_hash: 'a'.repeat(64), payload: validPayloads[CAPABILITY_IDS.repairPlan],
    policy_version: 'policy:v1', data_class: 'personal', retention_days: 30,
    evaluation_state: 'accepted', supersedes_artifact_id: null, created_at: '2026-08-02T06:00:00.000Z',
});

function request(capability: CapabilityId, overrides: Partial<CapabilityRequest> = {}): CapabilityRequest {
    const critic = capability === CAPABILITY_IDS.independentCritic;
    return {
        task: task(capability, critic ? { input_artifact_ids: [criticSubject.artifact_id] } : {}),
        scope: scope(), input_artifacts: critic ? [criticSubject] : [], tools: {}, signal: new AbortController().signal,
        ...overrides,
    };
}

describe('capability adapter contract', () => {
    it('runs through the agent kernel capability interface and persists only an evaluated envelope', async () => {
        const clock = new ManualClock();
        const kernel = new AgentKernel(new InMemoryAgentStore(clock), clock);
        const resolvedScope = scope();
        kernel.openSession({ session_id: 'session:adapter:101', scope: resolvedScope, idempotency_key: 'session:adapter:101' });
        kernel.createRun({
            run_id: 'run:101', session_id: 'session:adapter:101', command_id: 'command:diagnose:101',
            case_id: 101, case_version: 3,
            budget: { attempts: 2, wall_ms: 5_000, tokens: 2_000, cost_micros: 100_000, tool_calls: 0 },
            policy_version: 'policy:v1', idempotency_key: 'run:adapter:101',
        });
        kernel.enqueueTask(task(CAPABILITY_IDS.diagnosis));
        const claim = kernel.claimNext('worker:adapter-test', 1_000)!;
        const receipt = await kernel.executeClaim(
            claim,
            createCapabilityAdapterRegistry(routeBindings()),
            new FakeEvaluator('route:evaluator-independent'),
        );

        expect(receipt).toMatchObject({ state: 'succeeded', error_code: null });
        const artifact = kernel.store.getArtifact(receipt.artifact_id!);
        expect(() => ArtifactEnvelopeSchema.parse(artifact)).not.toThrow();
        expect(artifact).toMatchObject({
            schema: 'agent-artifact/v1', schema_name: ARTIFACT_SCHEMA_NAMES.diagnosis,
            evaluation_state: 'accepted', data_class: 'personal', retention_days: 30,
        });
        expect(JSON.stringify(artifact?.payload)).not.toMatch(/route:|route_id|hidden_reasoning|raw_prompt/i);
    });

    it('registers every bounded capability and returns only validated versioned candidates', async () => {
        const routes = routeBindings();
        const registry = createCapabilityAdapterRegistry(routes);

        for (const capability of CAPABILITIES) {
            const handler = registry.resolve(task(capability), scope());
            expect(handler, capability).toBeDefined();
            const result = await handler!.run(request(capability));
            const descriptor = CAPABILITY_DESCRIPTORS[capability];

            expect(result.artifact).toEqual({
                schema_name: descriptor.artifact_schema,
                payload: validPayloads[capability],
                data_class: descriptor.data_class,
                retention_days: Math.min(descriptor.retention_days, 30),
                supersedes_artifact_id: null,
            });
            expect(() => CAPABILITY_PAYLOAD_SCHEMAS[capability].parse(result.artifact.payload)).not.toThrow();
            expect(() => SafeArtifactPayloadSchema.parse(result.artifact.payload)).not.toThrow();
            expect(result.usage).toEqual({ wall_ms: 20, tokens: 100, cost_micros: 2_000, tool_calls: 0 });
            expect((routes[capability] as FakeStructuredRoute).calls[0]).toMatchObject({
                schema: 'structured-output-request/v1', capability, artifact_schema: descriptor.artifact_schema,
                scope: { scope_id: 'scope:case:101', organization_id: 7, case_id: 101, case_version: 3 },
                limits: { wall_ms: 5_000, tokens: 2_000, cost_micros: 100_000, tool_calls: 0 },
            });
        }
    });

    it('rejects malformed, unknown-field, and unsafe generated payloads before making a candidate', async () => {
        for (const payload of [
            { ...validPayloads[CAPABILITY_IDS.diagnosis], confidence: 4 },
            { ...validPayloads[CAPABILITY_IDS.diagnosis], unexpected: true },
            { ...validPayloads[CAPABILITY_IDS.diagnosis], observations: [{ hidden_reasoning: 'do not retain' }] },
        ]) {
            const registry = createCapabilityAdapterRegistry(routeBindings({
                [CAPABILITY_IDS.diagnosis]: new FakeStructuredRoute('route:diagnosis-a', payload),
            }));
            await expect(registry.resolve(task(CAPABILITY_IDS.diagnosis), scope())!.run(request(CAPABILITY_IDS.diagnosis)))
                .rejects.toMatchObject({ code: 'invalid_artifact' });
        }
    });

    it('rejects capability-specific boundary violations in nested strict payloads', () => {
        const invalid: Array<[CapabilityId, unknown]> = [
            [CAPABILITY_IDS.diagnosis, null],
            [CAPABILITY_IDS.diagnosis, new Date()],
            [CAPABILITY_IDS.diagnosis, { ...validPayloads[CAPABILITY_IDS.diagnosis], safety_warnings: undefined }],
            [CAPABILITY_IDS.diagnosis, { ...validPayloads[CAPABILITY_IDS.diagnosis], issue_summary: 42 }],
            [CAPABILITY_IDS.diagnosis, { ...validPayloads[CAPABILITY_IDS.diagnosis], emergency: 'false' }],
            [CAPABILITY_IDS.diagnosis, { ...validPayloads[CAPABILITY_IDS.diagnosis], observations: 'not-an-array' }],
            [CAPABILITY_IDS.clarification, { ...validPayloads[CAPABILITY_IDS.clarification], question: null }],
            [CAPABILITY_IDS.clarification, { ...validPayloads[CAPABILITY_IDS.clarification], status: 'complete' }],
            [CAPABILITY_IDS.hypothesis, {
                hypotheses: [
                    { id: 'h1', label: 'First', probability: 0.7, evidence_for: [], evidence_against: [], evidence_needed: [] },
                    { id: 'h2', label: 'Second', probability: 0.6, evidence_for: [], evidence_against: [], evidence_needed: [] },
                ], unresolved_questions: [],
            }],
            [CAPABILITY_IDS.hypothesis, {
                hypotheses: [
                    { id: 'h1', label: 'First', probability: 0.2, evidence_for: [], evidence_against: [], evidence_needed: [] },
                    { id: 'h2', label: 'Second', probability: 0.3, evidence_for: [], evidence_against: [], evidence_needed: [] },
                ], unresolved_questions: [],
            }],
            [CAPABILITY_IDS.repairPlan, {
                ...validPayloads[CAPABILITY_IDS.repairPlan],
                steps: [{ order: 2, instruction: { zh_cn: '关闭供水。', en_us: 'Shut off water.' }, safety_critical: true }],
            }],
            [CAPABILITY_IDS.repairPlan, { ...validPayloads[CAPABILITY_IDS.repairPlan], duration_minutes: { min: 1.5, max: 2 } }],
            [CAPABILITY_IDS.estimate, { ...validPayloads[CAPABILITY_IDS.estimate], currency: 'USD' }],
            [CAPABILITY_IDS.estimate, { ...validPayloads[CAPABILITY_IDS.estimate], total: { min: 10, max: 5 } }],
            [CAPABILITY_IDS.estimate, { ...validPayloads[CAPABILITY_IDS.estimate], non_binding: false }],
            [CAPABILITY_IDS.independentCritic, { ...validPayloads[CAPABILITY_IDS.independentCritic], subject_schema_name: 'unversioned' }],
            [CAPABILITY_IDS.independentCritic, { ...validPayloads[CAPABILITY_IDS.independentCritic], subject_payload_hash: 'bad' }],
            [CAPABILITY_IDS.independentCritic, {
                ...validPayloads[CAPABILITY_IDS.independentCritic],
                checks: [
                    { name: 'schema', status: 'pass', evidence_codes: ['first'] },
                    { name: 'schema', status: 'pass', evidence_codes: ['duplicate'] },
                ],
            }],
            [CAPABILITY_IDS.independentCritic, {
                ...validPayloads[CAPABILITY_IDS.independentCritic], decision: 'accept',
                checks: [{ name: 'safety', status: 'fail', evidence_codes: ['unsafe'] }],
            }],
        ];
        for (const [capability, payload] of invalid) {
            expect(() => CAPABILITY_PAYLOAD_SCHEMAS[capability].parse(payload), capability).toThrow();
        }
    });

    it('fails closed on malformed or over-budget usage', async () => {
        for (const usage of [
            { wall_ms: -1, tokens: 1, cost_micros: 0, tool_calls: 0 },
            { wall_ms: 1, tokens: 2_001, cost_micros: 0, tool_calls: 0 },
            { wall_ms: 1, tokens: 1, cost_micros: 0, tool_calls: 1 },
        ]) {
            const registry = createCapabilityAdapterRegistry(routeBindings({
                [CAPABILITY_IDS.diagnosis]: new FakeStructuredRoute(
                    'route:diagnosis-budget', validPayloads[CAPABILITY_IDS.diagnosis], usage,
                ),
            }));
            await expect(registry.resolve(task(CAPABILITY_IDS.diagnosis), scope())!.run(request(CAPABILITY_IDS.diagnosis)))
                .rejects.toEqual(expect.objectContaining({ code: 'budget_exceeded' }));
        }
    });

    it('binds routing, output data class, and retention to the resolved scope', async () => {
        const registry = createCapabilityAdapterRegistry(routeBindings());
        const diagnosisTask = task(CAPABILITY_IDS.diagnosis);
        expect(registry.resolve(diagnosisTask, scope({ capabilities: [CAPABILITY_IDS.clarification] }))).toBeUndefined();

        await expect(registry.get(CAPABILITY_IDS.faultAttribution).run(request(CAPABILITY_IDS.faultAttribution, {
            scope: scope({ data_classes: ['personal'] }),
        }))).rejects.toEqual(expect.objectContaining({ code: 'scope_mismatch' }));

        const shortScope = scope({ retention_days: 2 });
        const result = await registry.get(CAPABILITY_IDS.diagnosis).run(request(CAPABILITY_IDS.diagnosis, { scope: shortScope }));
        expect(result.artifact.retention_days).toBe(2);
    });

    it('requires the critic to have an independent route identity', () => {
        const duplicate = routeBindings({
            [CAPABILITY_IDS.diagnosis]: new FakeStructuredRoute('route:shared', validPayloads[CAPABILITY_IDS.diagnosis]),
            [CAPABILITY_IDS.independentCritic]: new FakeStructuredRoute('route:shared', validPayloads[CAPABILITY_IDS.independentCritic]),
        });
        expect(() => createCapabilityAdapterRegistry(duplicate)).toThrowError(/critic route/i);

        const registry = createCapabilityAdapterRegistry(routeBindings());
        expect(registry.get(CAPABILITY_IDS.independentCritic).route_id)
            .not.toBe(registry.get(CAPABILITY_IDS.diagnosis).route_id);
    });

    it('fails closed for route, cancellation, input, and registry boundary errors', async () => {
        const registry = createCapabilityAdapterRegistry(routeBindings());
        const diagnosis = registry.get(CAPABILITY_IDS.diagnosis);

        const aborted = new AbortController();
        aborted.abort();
        await expect(diagnosis.run(request(CAPABILITY_IDS.diagnosis, { signal: aborted.signal })))
            .rejects.toMatchObject({ code: 'cancelled' });
        await expect(diagnosis.run(request(CAPABILITY_IDS.diagnosis, {
            tools: { read: true } as never,
        }))).rejects.toMatchObject({ code: 'scope_mismatch' });
        await expect(diagnosis.run(request(CAPABILITY_IDS.diagnosis, {
            task: task(CAPABILITY_IDS.diagnosis, { input_artifact_ids: ['artifact:missing'] }),
        }))).rejects.toMatchObject({ code: 'invalid_artifact' });
        await expect(diagnosis.run(request(CAPABILITY_IDS.diagnosis, {
            task: task(CAPABILITY_IDS.diagnosis, { input_artifact_ids: [criticSubject.artifact_id] }),
            input_artifacts: [{ ...criticSubject, evaluation_state: 'pending' }],
        }))).rejects.toMatchObject({ code: 'scope_mismatch' });

        const unavailable = createCapabilityAdapterRegistry(routeBindings({
            [CAPABILITY_IDS.diagnosis]: {
                route_id: 'route:unavailable',
                async invoke() { throw new Error('synthetic failure'); },
            },
        }));
        await expect(unavailable.get(CAPABILITY_IDS.diagnosis).run(request(CAPABILITY_IDS.diagnosis)))
            .rejects.toMatchObject({ code: 'temporarily_unavailable', retryable: true });

        const malformedResult = createCapabilityAdapterRegistry(routeBindings({
            [CAPABILITY_IDS.diagnosis]: {
                route_id: 'route:no-result',
                async invoke() { return null as never; },
            },
        }));
        await expect(malformedResult.get(CAPABILITY_IDS.diagnosis).run(request(CAPABILITY_IDS.diagnosis)))
            .rejects.toMatchObject({ code: 'invalid_artifact' });

        const badUsage = createCapabilityAdapterRegistry(routeBindings({
            [CAPABILITY_IDS.diagnosis]: new FakeStructuredRoute(
                'route:usage-shape', validPayloads[CAPABILITY_IDS.diagnosis],
                { wall_ms: 1, tokens: 1, cost_micros: 0, tool_calls: 0, extra: 1 } as RuntimeUsage,
            ),
        }));
        await expect(badUsage.get(CAPABILITY_IDS.diagnosis).run(request(CAPABILITY_IDS.diagnosis)))
            .rejects.toMatchObject({ code: 'budget_exceeded' });

        const ungroundedCritic = createCapabilityAdapterRegistry(routeBindings({
            [CAPABILITY_IDS.independentCritic]: new FakeStructuredRoute('route:critic-ungrounded', {
                ...validPayloads[CAPABILITY_IDS.independentCritic], subject_payload_hash: 'b'.repeat(64),
            }),
        }));
        await expect(ungroundedCritic.get(CAPABILITY_IDS.independentCritic).run(request(CAPABILITY_IDS.independentCritic)))
            .rejects.toMatchObject({ code: 'invalid_artifact' });

        expect(() => createCapabilityAdapterRegistry({} as Record<CapabilityId, StructuredOutputRoute>))
            .toThrowError(/every declared capability/i);
        const invalidRoute = routeBindings();
        invalidRoute[CAPABILITY_IDS.diagnosis] = new FakeStructuredRoute('x', validPayloads[CAPABILITY_IDS.diagnosis]);
        expect(() => createCapabilityAdapterRegistry(invalidRoute)).toThrowError(/invalid opaque route/i);
        expect(registry.list()).toHaveLength(CAPABILITIES.length);
        expect(() => registry.get('maintenance.unknown.v1' as CapabilityId)).toThrowError(/not registered/i);
    });

    it('publishes a static, acyclic, bounded and effect-free diagnose-and-plan descriptor', () => {
        const descriptor = DIAGNOSE_AND_PLAN_COMPOSITION;
        expect(descriptor).toMatchObject({
            schema: 'capability-composition/v1', composition_id: 'maintenance.diagnose-and-plan.v1',
            max_tasks: 10, max_parallelism: 3, max_attempts_per_task: 2,
            authority: { domain_writes: false, deliveries: false, external_effects: false },
        });
        expect(new Set(descriptor.steps.map((step) => step.capability))).toEqual(new Set(CAPABILITIES));
        const seen = new Set<string>();
        for (const step of descriptor.steps) {
            expect(step.depends_on.every((dependency) => seen.has(dependency))).toBe(true);
            seen.add(step.step_id);
        }
        expect(descriptor.steps).toHaveLength(descriptor.max_tasks);
        expect(Object.isFrozen(descriptor)).toBe(true);
    });

    it('contains no domain, server, repository, effect client, SDK, secret, or environment imports', () => {
        const sourceRoot = join(process.cwd(), 'packages', 'agent-adapters', 'src');
        const sources = readdirSync(sourceRoot).filter((name) => name.endsWith('.ts'))
            .map((name) => readFileSync(join(sourceRoot, name), 'utf8'));
        const imports = sources.flatMap((source) => source.match(/^import[^;]+;/gm) ?? []).join('\n');
        expect(imports).not.toMatch(/server[\\/]|domain[\\/]|repository|payment|dispatch|notification|messag|socket|secret|config[\\/]|process|dotenv|sdk/i);
        expect(imports).toMatch(/agent-core[\\/]src/);
        expect(imports).toMatch(/contracts[\\/]src/);
        expect(sources.join('\n')).not.toMatch(/process\.env|Deno\.env|Bun\.env/);
    });

    it('uses typed runtime faults at the adapter boundary', () => {
        expect(new RuntimeFault('invalid_artifact', 'fixture')).toMatchObject({ code: 'invalid_artifact' });
        expect(() => ArtifactEnvelopeSchema.parse({ schema: 'not-an-artifact' })).toThrow();
    });
});
