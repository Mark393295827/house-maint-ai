import type {
    AgentTaskEnvelope,
    EffectiveScope,
    ExecutionBudget,
} from '../../../contracts/src/index.js';
import {
    RuntimeFault,
    type ArtifactEvaluator,
    type CapabilityHandler,
    type CapabilityRequest,
    type CapabilityResult,
    type CapabilityRouter,
    type Clock,
    type EvaluationResult,
} from '../../../agent-core/src/index.js';

export class ManualClock implements Clock {
    private instant: Date;
    constructor(value = '2026-08-02T06:00:00.000Z') { this.instant = new Date(value); }
    now(): Date { return new Date(this.instant); }
    advance(milliseconds: number): void { this.instant = new Date(this.instant.getTime() + milliseconds); }
}

export type FakeHarnessStep = CapabilityResult | RuntimeFault
    | ((request: CapabilityRequest) => CapabilityResult | Promise<CapabilityResult>);

export class FakeHarness implements CapabilityHandler {
    readonly invocations: Array<{ task_id: string; scope_id: string; input_artifact_ids: readonly string[]; tool_count: number }> = [];
    private readonly steps: FakeHarnessStep[];

    constructor(public readonly route_id: string, ...steps: FakeHarnessStep[]) {
        this.steps = [...steps];
    }

    enqueue(step: FakeHarnessStep): void { this.steps.push(step); }

    async run(request: CapabilityRequest): Promise<CapabilityResult> {
        this.invocations.push({
            task_id: request.task.task_id, scope_id: request.scope.scope_id,
            input_artifact_ids: request.input_artifacts.map((item) => item.artifact_id),
            tool_count: Object.keys(request.tools).length,
        });
        if (request.signal.aborted) throw new RuntimeFault('cancelled', 'Fake harness observed cancellation');
        const step = this.steps.shift();
        if (!step) throw new RuntimeFault('temporarily_unavailable', 'No fake outcome configured', true);
        if (step instanceof RuntimeFault) throw step;
        return typeof step === 'function' ? step(request) : step;
    }
}

export class StaticCapabilityRouter implements CapabilityRouter {
    private readonly routes = new Map<string, CapabilityHandler>();
    register(capability: string, handler: CapabilityHandler): this { this.routes.set(capability, handler); return this; }
    resolve(task: AgentTaskEnvelope): CapabilityHandler | undefined { return this.routes.get(task.capability); }
}

const acceptedChecks: EvaluationResult['checks'] = [
    { name: 'schema', status: 'pass', evidence_codes: ['schema_valid'] },
    { name: 'safety', status: 'pass', evidence_codes: ['safe_fixture'] },
    { name: 'privacy', status: 'pass', evidence_codes: ['scope_redacted'] },
    { name: 'grounding', status: 'pass', evidence_codes: ['inputs_bound'] },
    { name: 'scope', status: 'pass', evidence_codes: ['scope_match'] },
    { name: 'cost', status: 'pass', evidence_codes: ['within_budget'] },
];

export class FakeEvaluator implements ArtifactEvaluator {
    readonly invocations: string[] = [];
    private readonly results: EvaluationResult[];
    constructor(
        public readonly route_id = 'route:independent-critic',
        public readonly capability = 'artifact.critic.v1',
        ...results: EvaluationResult[]
    ) { this.results = [...results]; }

    async evaluate(artifact: { artifact_id: string }): Promise<EvaluationResult> {
        this.invocations.push(artifact.artifact_id);
        return this.results.shift() ?? { checks: acceptedChecks, decision: 'accept' };
    }
}

export class ClockAdvancingEvaluator extends FakeEvaluator {
    constructor(
        private readonly clock: ManualClock,
        private readonly elapsedMs: number,
        routeId = 'route:independent-critic',
        capability = 'artifact.critic.v1',
        ...results: EvaluationResult[]
    ) {
        super(routeId, capability, ...results);
    }

    override async evaluate(artifact: { artifact_id: string }): Promise<EvaluationResult> {
        this.clock.advance(this.elapsedMs);
        return super.evaluate(artifact);
    }
}

type PendingEvaluation = {
    readonly resolve: (result: EvaluationResult) => void;
    readonly reject: (reason: unknown) => void;
};

export class AbortIgnoringEvaluator implements ArtifactEvaluator {
    readonly invocations: string[] = [];
    readonly observedSignals: AbortSignal[] = [];
    private readonly pending: PendingEvaluation[] = [];

    constructor(
        public readonly route_id = 'route:abort-ignoring-critic',
        public readonly capability = 'artifact.critic.v1',
    ) {}

    evaluate(
        artifact: { artifact_id: string },
        context: { readonly signal: AbortSignal },
    ): Promise<EvaluationResult> {
        this.invocations.push(artifact.artifact_id);
        this.observedSignals.push(context.signal);
        return new Promise<EvaluationResult>((resolve, reject) => {
            this.pending.push({ resolve, reject });
        });
    }

    get pendingCount(): number { return this.pending.length; }

    acceptNext(result: EvaluationResult = { checks: acceptedChecks, decision: 'accept' }): void {
        const pending = this.pending.shift();
        if (!pending) throw new Error('No pending abort-ignoring evaluation');
        pending.resolve(result);
    }

    rejectNext(reason: unknown): void {
        const pending = this.pending.shift();
        if (!pending) throw new Error('No pending abort-ignoring evaluation');
        pending.reject(reason);
    }
}

export const runtimeBudget = (overrides: Partial<ExecutionBudget> = {}): ExecutionBudget => ({
    attempts: 2, wall_ms: 5_000, tokens: 2_000, cost_micros: 100_000, tool_calls: 0, ...overrides,
});

export function runtimeScope(overrides: Partial<EffectiveScope> = {}): EffectiveScope {
    return {
        schema: 'effective-scope/v1', scope_id: 'scope:case:101', scope_kind: 'case', organization_id: 7,
        case_id: 101,
        principal: {
            principal_id: 'principal:resident:9', actor_kind: 'member', organization_id: 7,
            membership_id: 12, user_id: 9, role: 'resident', authenticated_at: '2026-08-02T05:59:00.000Z',
        },
        actions: ['read', 'contribute'], data_classes: ['personal'], capabilities: ['diagnosis.structured.v1'],
        tool_grants: [], purposes: ['maintenance_diagnosis'], region: 'cn-east', retention_days: 30,
        policy_version: 'policy:v1', resolved_at: '2026-08-02T05:59:00.000Z', expires_at: '2026-08-03T06:00:00.000Z',
        ...overrides,
    };
}

export function runtimeTask(overrides: Partial<AgentTaskEnvelope> = {}): AgentTaskEnvelope {
    return {
        schema: 'agent-task/v1', run_id: 'run:101', task_id: 'task:diagnosis:101', scope_id: 'scope:case:101',
        organization_id: 7, case_ref: { id: 101, version: 3 }, capability: 'diagnosis.structured.v1',
        input_artifact_ids: [], budget: runtimeBudget(), policy_version: 'policy:v1',
        idempotency_key: 'diagnosis:101:v3', expires_at: '2026-08-03T06:00:00.000Z', ...overrides,
    };
}

export const successfulCapabilityResult = (payload: Record<string, unknown> = { diagnosis: 'fixture leak' }): CapabilityResult => ({
    artifact: {
        schema_name: 'diagnosis-result/v1', payload, data_class: 'personal', retention_days: 14,
    },
    usage: { wall_ms: 25, tokens: 120, cost_micros: 3_000, tool_calls: 0 },
});
