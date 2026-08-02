import db from '../config/database.js';
import { metricsStore } from '../middleware/metricsCollector.js';

export type AnalyticsMeasurement = 'measured' | 'estimated' | 'unavailable';
export type AnalyticsRange = '7d' | '30d' | '90d';
export type OperatingStageId =
    | 'intake'
    | 'diagnosis'
    | 'deflection'
    | 'dispatch'
    | 'verification'
    | 'reporting';

export type MetricUnit =
    | 'count'
    | 'percent'
    | 'score_10'
    | 'milliseconds'
    | 'hours'
    | 'cny'
    | 'cny_per_minute'
    | 'requests_per_minute'
    | 'ratio';

export interface MetricPoint {
    value: number | null;
    unit: MetricUnit;
    measurement: AnalyticsMeasurement;
    sample_size: number;
    source: string;
    reason: string | null;
}

export interface DataAccessIssue {
    source: string;
    message: string;
}

export interface AgentOperationMetric {
    id: string;
    display_code: string;
    workflow_stage: OperatingStageId | 'cross_stage';
    status: 'online' | 'idle' | 'offline';
    models: string[];
    calls: MetricPoint;
    input_tokens: MetricPoint;
    output_tokens: MetricPoint;
    total_tokens: MetricPoint;
    cost_cny: MetricPoint;
    average_latency_ms: MetricPoint;
    p95_latency_ms: MetricPoint;
    success_rate_pct: MetricPoint;
    last_active_at: string | null;
}

export interface SystemLoadMetric {
    observation_started_at: string;
    throughput_per_minute: MetricPoint;
    success_rate_pct: MetricPoint;
    average_latency_ms: MetricPoint;
    p95_latency_ms: MetricPoint;
    active_agents: MetricPoint;
    utilization_pct: MetricPoint;
    samples: Array<{
        timestamp: string;
        throughput_per_minute: number;
        success_rate_pct: number | null;
        average_latency_ms: number | null;
    }>;
}

export interface CurrentMetricsSnapshot {
    requests: {
        total: number;
        success: number;
        error: number;
    };
    responseTime: {
        total: number;
        count: number;
        min: number;
        max: number;
    };
    agents: {
        invocations: number;
        byAgent: Record<string, number>;
    };
    startTime: Date;
}

export interface AnalyticsTimeWindow {
    since: Date;
    until: Date;
    generatedAt: Date;
}

export interface QueryResult<T> {
    rows: T[];
    rowCount: number | null;
}

export interface AnalyticsDatabase {
    query<T = unknown>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

export interface AgentEndpointRegistration {
    id: string;
    display_code: string;
    workflow_stage: OperatingStageId | 'cross_stage';
    endpoints: readonly string[];
}

export const AGENT_ENDPOINT_REGISTRY: readonly AgentEndpointRegistration[] = [
    {
        id: 'intake-agent',
        display_code: 'INTAKE',
        workflow_stage: 'intake',
        endpoints: ['/api/ai/diagnose/inquiry'],
    },
    {
        id: 'diagnosis-agent',
        display_code: 'DIAGNOSIS',
        workflow_stage: 'diagnosis',
        endpoints: [
            '/api/ai/diagnose',
            '/api/ai/diagnose/chat',
            '/api/ai/diagnose/mece',
            '/api/ai/diagnose/hypothesis',
            '/api/ai/diagnose/checklist',
            '/api/ai/diagnose/five-why',
            '/api/ai/chat',
            'claw:diagnostics',
        ],
    },
    {
        id: 'deflection-agent',
        display_code: 'DEFLECTION',
        workflow_stage: 'deflection',
        endpoints: ['/api/ai/diagnose/solution'],
    },
    {
        id: 'problem-solving-agent',
        display_code: 'PROBLEM_SOLVING',
        workflow_stage: 'cross_stage',
        endpoints: ['/api/ai/problem-solving'],
    },
    {
        id: 'planning-agent',
        display_code: 'PLANNING',
        workflow_stage: 'dispatch',
        endpoints: ['/api/ai/plan', 'claw:planning'],
    },
    {
        id: 'materials-agent',
        display_code: 'MATERIALS',
        workflow_stage: 'dispatch',
        endpoints: ['/api/ai/material-bom'],
    },
    {
        id: 'quality-agent',
        display_code: 'QUALITY',
        workflow_stage: 'diagnosis',
        endpoints: ['/api/ai/fault-attribution'],
    },
    {
        id: 'verification-agent',
        display_code: 'VERIFICATION',
        workflow_stage: 'verification',
        endpoints: ['/api/ai/turnover-compare'],
    },
    {
        id: 'research-swarm',
        display_code: 'RESEARCH',
        workflow_stage: 'cross_stage',
        endpoints: ['/api/ai/research-market'],
    },
    {
        id: 'learning-agent',
        display_code: 'LEARNING',
        workflow_stage: 'cross_stage',
        endpoints: ['training:pattern_extraction'],
    },
    {
        id: 'unregistered-agent',
        display_code: 'UNREGISTERED',
        workflow_stage: 'cross_stage',
        endpoints: [],
    },
] as const;

interface AiUsageLedgerRow {
    endpoint: string | null;
    model_name: string | null;
    input_tokens: number | string | null;
    output_tokens: number | string | null;
    total_tokens: number | string | null;
    cost_usd: number | string | null;
    duration_ms: number | string | null;
    created_at: string | Date | null;
}

interface AgentBucket {
    registration: AgentEndpointRegistration;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    durations: number[];
    models: Set<string>;
    lastActiveAt: Date | null;
}

export interface AgentTelemetryOverview {
    agent_operations: AgentOperationMetric[];
    system_load: SystemLoadMetric;
    total_cost_cny: number | null;
    access_issues: DataAccessIssue[];
}

const ONLINE_WINDOW_MS = 15 * 60 * 1000;
const IDLE_WINDOW_MS = 24 * 60 * 60 * 1000;
const AI_USAGE_SOURCE = 'ai_usage_logs';
const CURRENT_PROCESS_SOURCE = 'metricsStore.current_process';
export const MAX_AI_USAGE_LEDGER_ROWS = 50_000;

const roundMetric = (value: number, digits = 2): number => Number(value.toFixed(digits));

const toNonNegativeNumber = (value: number | string | null | undefined): number => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const sqlTimestamp = (date: Date): string => (
    date.toISOString().replace('T', ' ').replace(/\.000Z$/, '').replace('Z', '')
);

const measuredMetric = (
    value: number,
    unit: MetricUnit,
    sampleSize: number,
    source: string,
): MetricPoint => ({
    value,
    unit,
    measurement: 'measured',
    sample_size: sampleSize,
    source,
    reason: null,
});

const unavailableMetric = (
    unit: MetricUnit,
    source: string,
    reason: string,
    sampleSize = 0,
): MetricPoint => ({
    value: null,
    unit,
    measurement: 'unavailable',
    sample_size: sampleSize,
    source,
    reason,
});

const normalizeEndpoint = (endpoint: string | null | undefined): string => {
    const raw = (endpoint || 'background').trim();
    if (!raw.startsWith('/')) {
        return raw;
    }

    const withoutQuery = raw.split('?')[0].replace(/\/+$/, '');
    return withoutQuery.replace(/^\/api\/v1\/ai(?=\/|$)/, '/api/ai');
};

export const resolveAgentEndpoint = (
    endpoint: string | null | undefined,
): AgentEndpointRegistration => {
    const normalized = normalizeEndpoint(endpoint);
    return AGENT_ENDPOINT_REGISTRY.find((entry) => entry.endpoints.includes(normalized))
        || AGENT_ENDPOINT_REGISTRY[AGENT_ENDPOINT_REGISTRY.length - 1];
};

const parseUtcTimestamp = (value: string | Date | null): Date | null => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const normalized = hasZone
        ? trimmed
        : `${trimmed.replace(' ', 'T')}Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const percentile95 = (durations: number[]): number => {
    const sorted = [...durations].sort((left, right) => left - right);
    const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    return sorted[index];
};

const deriveStatus = (
    lastActiveAt: Date | null,
    generatedAt: Date,
): AgentOperationMetric['status'] => {
    if (!lastActiveAt) {
        return 'offline';
    }

    const ageMs = Math.max(0, generatedAt.getTime() - lastActiveAt.getTime());
    if (ageMs <= ONLINE_WINDOW_MS) {
        return 'online';
    }
    if (ageMs <= IDLE_WINDOW_MS) {
        return 'idle';
    }
    return 'offline';
};

const emptyBucket = (registration: AgentEndpointRegistration): AgentBucket => ({
    registration,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    durations: [],
    models: new Set<string>(),
    lastActiveAt: null,
});

const serializeAvailableBucket = (
    bucket: AgentBucket,
    generatedAt: Date,
    usdToCnyRate: number,
): AgentOperationMetric => {
    const durationSampleSize = bucket.durations.length;
    const averageLatency = durationSampleSize > 0
        ? bucket.durations.reduce((sum, duration) => sum + duration, 0) / durationSampleSize
        : null;

    return {
        id: bucket.registration.id,
        display_code: bucket.registration.display_code,
        workflow_stage: bucket.registration.workflow_stage,
        status: deriveStatus(bucket.lastActiveAt, generatedAt),
        models: Array.from(bucket.models).sort(),
        calls: measuredMetric(bucket.calls, 'count', bucket.calls, AI_USAGE_SOURCE),
        input_tokens: measuredMetric(bucket.inputTokens, 'count', bucket.calls, AI_USAGE_SOURCE),
        output_tokens: measuredMetric(bucket.outputTokens, 'count', bucket.calls, AI_USAGE_SOURCE),
        total_tokens: measuredMetric(bucket.totalTokens, 'count', bucket.calls, AI_USAGE_SOURCE),
        cost_cny: measuredMetric(
            roundMetric(bucket.costUsd * usdToCnyRate, 4),
            'cny',
            bucket.calls,
            `${AI_USAGE_SOURCE}.cost_usd`,
        ),
        average_latency_ms: averageLatency === null
            ? unavailableMetric(
                'milliseconds',
                `${AI_USAGE_SOURCE}.duration_ms`,
                'No duration observations are available for this agent in the selected period.',
            )
            : measuredMetric(
                roundMetric(averageLatency, 2),
                'milliseconds',
                durationSampleSize,
                `${AI_USAGE_SOURCE}.duration_ms`,
            ),
        p95_latency_ms: durationSampleSize === 0
            ? unavailableMetric(
                'milliseconds',
                `${AI_USAGE_SOURCE}.duration_ms`,
                'No duration observations are available for this agent in the selected period.',
            )
            : measuredMetric(
                roundMetric(percentile95(bucket.durations), 2),
                'milliseconds',
                durationSampleSize,
                `${AI_USAGE_SOURCE}.duration_ms`,
            ),
        success_rate_pct: unavailableMetric(
            'percent',
            `${AI_USAGE_SOURCE}.outcome`,
            'The AI usage ledger does not persist request outcomes.',
        ),
        last_active_at: bucket.lastActiveAt?.toISOString() || null,
    };
};

const serializeUnavailableAgent = (
    registration: AgentEndpointRegistration,
    reason = 'The AI usage ledger could not be read.',
): AgentOperationMetric => {
    return {
        id: registration.id,
        display_code: registration.display_code,
        workflow_stage: registration.workflow_stage,
        status: 'offline',
        models: [],
        calls: unavailableMetric('count', AI_USAGE_SOURCE, reason),
        input_tokens: unavailableMetric('count', AI_USAGE_SOURCE, reason),
        output_tokens: unavailableMetric('count', AI_USAGE_SOURCE, reason),
        total_tokens: unavailableMetric('count', AI_USAGE_SOURCE, reason),
        cost_cny: unavailableMetric('cny', `${AI_USAGE_SOURCE}.cost_usd`, reason),
        average_latency_ms: unavailableMetric(
            'milliseconds',
            `${AI_USAGE_SOURCE}.duration_ms`,
            reason,
        ),
        p95_latency_ms: unavailableMetric(
            'milliseconds',
            `${AI_USAGE_SOURCE}.duration_ms`,
            reason,
        ),
        success_rate_pct: unavailableMetric(
            'percent',
            `${AI_USAGE_SOURCE}.outcome`,
            reason,
        ),
        last_active_at: null,
    };
};

const errorMessage = (error: unknown): string => (
    error instanceof Error ? error.message : 'Unknown data access failure'
);

export class AgentTelemetryService {
    constructor(
        private readonly database: AnalyticsDatabase = db,
        private readonly getCurrentMetrics: () => CurrentMetricsSnapshot = () => metricsStore,
        private readonly usdToCnyRate = Number(process.env.USD_TO_CNY_RATE || 7.2),
    ) {}

    async getTelemetry(window: AnalyticsTimeWindow): Promise<AgentTelemetryOverview> {
        let usageRows: AiUsageLedgerRow[];

        try {
            const result = await this.database.query<AiUsageLedgerRow>(`
                SELECT
                    endpoint,
                    model_name,
                    input_tokens,
                    output_tokens,
                    total_tokens,
                    cost_usd,
                    duration_ms,
                    CAST(created_at AS TEXT) AS created_at
                FROM ai_usage_logs
                WHERE created_at >= $1 AND created_at <= $2
                ORDER BY created_at ASC
                LIMIT ${MAX_AI_USAGE_LEDGER_ROWS + 1}
            `, [sqlTimestamp(window.since), sqlTimestamp(window.until)]);
            usageRows = result.rows;
        } catch (error) {
            return {
                agent_operations: AGENT_ENDPOINT_REGISTRY.map((registration) => (
                    serializeUnavailableAgent(registration)
                )),
                system_load: this.buildSystemLoad(window.generatedAt),
                total_cost_cny: null,
                access_issues: [{
                    source: AI_USAGE_SOURCE,
                    message: errorMessage(error),
                }],
            };
        }

        if (usageRows.length > MAX_AI_USAGE_LEDGER_ROWS) {
            const reason = `The AI usage ledger exceeds the bounded ${MAX_AI_USAGE_LEDGER_ROWS}-row read limit.`;
            return {
                agent_operations: AGENT_ENDPOINT_REGISTRY.map((registration) => (
                    serializeUnavailableAgent(registration, reason)
                )),
                system_load: this.buildSystemLoad(window.generatedAt),
                total_cost_cny: null,
                access_issues: [{
                    source: AI_USAGE_SOURCE,
                    message: reason,
                }],
            };
        }

        const buckets = new Map(
            AGENT_ENDPOINT_REGISTRY.map((registration) => [
                registration.id,
                emptyBucket(registration),
            ]),
        );
        let totalCostUsd = 0;

        for (const row of usageRows) {
            const registration = resolveAgentEndpoint(row.endpoint);
            const bucket = buckets.get(registration.id) || emptyBucket(registration);
            const inputTokens = toNonNegativeNumber(row.input_tokens);
            const outputTokens = toNonNegativeNumber(row.output_tokens);
            const totalTokens = Math.max(
                toNonNegativeNumber(row.total_tokens),
                inputTokens + outputTokens,
            );
            const costUsd = toNonNegativeNumber(row.cost_usd);
            const durationMs = row.duration_ms === null
                ? null
                : toNonNegativeNumber(row.duration_ms);
            const createdAt = parseUtcTimestamp(row.created_at);

            bucket.calls += 1;
            bucket.inputTokens += inputTokens;
            bucket.outputTokens += outputTokens;
            bucket.totalTokens += totalTokens;
            bucket.costUsd += costUsd;
            totalCostUsd += costUsd;
            if (durationMs !== null) {
                bucket.durations.push(durationMs);
            }
            if (row.model_name) {
                bucket.models.add(row.model_name);
            }
            if (createdAt && (!bucket.lastActiveAt || createdAt > bucket.lastActiveAt)) {
                bucket.lastActiveAt = createdAt;
            }
            buckets.set(registration.id, bucket);
        }

        return {
            agent_operations: AGENT_ENDPOINT_REGISTRY.map((registration) => (
                serializeAvailableBucket(
                    buckets.get(registration.id) || emptyBucket(registration),
                    window.generatedAt,
                    this.usdToCnyRate,
                )
            )),
            system_load: this.buildSystemLoad(window.generatedAt),
            total_cost_cny: roundMetric(totalCostUsd * this.usdToCnyRate, 4),
            access_issues: [],
        };
    }

    private buildSystemLoad(generatedAt: Date): SystemLoadMetric {
        const snapshot = this.getCurrentMetrics();
        const startedAt = snapshot.startTime instanceof Date
            && !Number.isNaN(snapshot.startTime.getTime())
            ? snapshot.startTime
            : generatedAt;
        const observationMinutes = Math.max(
            0,
            (generatedAt.getTime() - startedAt.getTime()) / 60_000,
        );

        return {
            observation_started_at: startedAt.toISOString(),
            throughput_per_minute: observationMinutes > 0
                ? measuredMetric(
                    roundMetric(snapshot.requests.total / observationMinutes, 2),
                    'requests_per_minute',
                    snapshot.requests.total,
                    CURRENT_PROCESS_SOURCE,
                )
                : unavailableMetric(
                    'requests_per_minute',
                    CURRENT_PROCESS_SOURCE,
                    'The current process observation window has no elapsed time.',
                ),
            success_rate_pct: snapshot.requests.total > 0
                ? measuredMetric(
                    roundMetric(
                        (snapshot.requests.success / snapshot.requests.total) * 100,
                        2,
                    ),
                    'percent',
                    snapshot.requests.total,
                    CURRENT_PROCESS_SOURCE,
                )
                : unavailableMetric(
                    'percent',
                    CURRENT_PROCESS_SOURCE,
                    'The current process has no completed request observations.',
                ),
            average_latency_ms: snapshot.responseTime.count > 0
                ? measuredMetric(
                    roundMetric(
                        snapshot.responseTime.total / snapshot.responseTime.count,
                        2,
                    ),
                    'milliseconds',
                    snapshot.responseTime.count,
                    CURRENT_PROCESS_SOURCE,
                )
                : unavailableMetric(
                    'milliseconds',
                    CURRENT_PROCESS_SOURCE,
                    'The current process has no response-latency observations.',
                ),
            p95_latency_ms: unavailableMetric(
                'milliseconds',
                'ops_metric_samples',
                'The current metrics store does not retain a latency distribution.',
            ),
            active_agents: unavailableMetric(
                'count',
                'agent_runs',
                'The current process does not track an in-flight agent-run gauge.',
            ),
            utilization_pct: unavailableMetric(
                'percent',
                'system_capacity',
                'No configured capacity baseline is available.',
            ),
            samples: [],
        };
    }
}

export const agentTelemetryService = new AgentTelemetryService();
