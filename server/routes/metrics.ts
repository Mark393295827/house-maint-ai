import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { metricsStore, resetMetrics } from '../middleware/metricsCollector.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import db from '../config/database.js';
import { calculateInferenceEconomics } from '../middleware/inferenceValue.js';

const router = Router();
const USD_TO_CNY_RATE = Number(process.env.USD_TO_CNY_RATE || 7.2);
const RANGE_DAYS = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
} as const;

type MetricsRange = keyof typeof RANGE_DAYS;

interface AiUsageAggregateRow {
    model_name: string;
    endpoint: string | null;
    calls: number | string;
    input_tokens: number | string | null;
    output_tokens: number | string | null;
    total_tokens: number | string | null;
    cost_usd: number | string | null;
    avg_duration_ms: number | string | null;
}

interface AiUsageDailyRow {
    date: string;
    input_tokens: number | string | null;
    output_tokens: number | string | null;
    total_tokens: number | string | null;
    cost_usd: number | string | null;
}

interface EconomicsBucket {
    key: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    loggedTotalTokens: number;
    costUsd: number;
    estimatedBusinessValueCny: number;
    weightedDurationMs: number;
}

const metricNumber = (value: number | string | null | undefined): number => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const roundMetric = (value: number, digits = 2): number => Number(value.toFixed(digits));

const sqlTimestamp = (date: Date): string => date.toISOString().replace('T', ' ').slice(0, 19);

const classifyRoi = (roi: number | null, calls: number, costCny: number) => {
    if (calls === 0) return 'no_data';
    if (costCny === 0) return 'excellent';
    if (roi !== null && roi >= 100) return 'excellent';
    if (roi !== null && roi >= 10) return 'good';
    if (roi !== null && roi >= 1) return 'marginal';
    return 'negative';
};

const serializeBucket = (bucket: EconomicsBucket) => {
    const componentTotal = bucket.inputTokens + bucket.outputTokens;
    const totalTokens = Math.max(bucket.loggedTotalTokens, componentTotal);

    return {
        key: bucket.key,
        calls: bucket.calls,
        input_tokens: bucket.inputTokens,
        output_tokens: bucket.outputTokens,
        total_tokens: totalTokens,
        output_share_pct: totalTokens > 0
            ? roundMetric((bucket.outputTokens / totalTokens) * 100, 2)
            : 0,
        total_to_output_ratio: bucket.outputTokens > 0
            ? roundMetric(totalTokens / bucket.outputTokens, 2)
            : null,
        cost_usd: roundMetric(bucket.costUsd, 6),
        cost_cny: roundMetric(bucket.costUsd * USD_TO_CNY_RATE, 4),
        estimated_business_value_cny: roundMetric(bucket.estimatedBusinessValueCny, 2),
        avg_duration_ms: bucket.calls > 0
            ? roundMetric(bucket.weightedDurationMs / bucket.calls, 1)
            : 0,
    };
};

router.use(authenticate);

/**
 * GET /api/metrics
 * Returns current system metrics
 */
router.get('/', authorize('admin'), (_req: Request, res: Response) => {
    const uptime = Date.now() - metricsStore.startTime.getTime();
    const avgResponseTime = metricsStore.responseTime.count > 0
        ? metricsStore.responseTime.total / metricsStore.responseTime.count
        : 0;

    res.json(ApiResponse.success({
        system: {
            uptime_ms: uptime,
            uptime_human: formatUptime(uptime),
        },
        requests: {
            total: metricsStore.requests.total,
            success: metricsStore.requests.success,
            error: metricsStore.requests.error,
            success_rate: metricsStore.requests.total > 0
                ? (metricsStore.requests.success / metricsStore.requests.total * 100).toFixed(2) + '%'
                : 'N/A',
        },
        response_time: {
            avg_ms: avgResponseTime.toFixed(2),
            min_ms: metricsStore.responseTime.min === Infinity ? 0 : metricsStore.responseTime.min,
            max_ms: metricsStore.responseTime.max,
        },
        sda_cycles: {
            total: metricsStore.sda.cycles,
            simulate_passes: metricsStore.sda.simulatePasses,
            deploys: metricsStore.sda.deploys,
            augments: metricsStore.sda.augments,
        },
        agents: {
            total_invocations: metricsStore.agents.invocations,
            by_agent: metricsStore.agents.byAgent,
        },
    }));
});

/**
 * GET /api/metrics/ai-economics
 * Returns measured token usage and VC-facing inference economics.
 */
router.get(
    '/ai-economics',
    authorize('admin', 'manager'),
    async (req: Request, res: Response) => {
    try {
        const requestedRange = String(req.query.range || '30d') as MetricsRange;
        const range: MetricsRange = requestedRange in RANGE_DAYS ? requestedRange : '30d';
        const since = new Date();
        since.setUTCHours(0, 0, 0, 0);
        since.setUTCDate(since.getUTCDate() - RANGE_DAYS[range] + 1);
        const sinceValue = sqlTimestamp(since);

        const { rows: aggregateRows } = await db.query<AiUsageAggregateRow>(`
            SELECT
                model_name,
                COALESCE(endpoint, 'background') AS endpoint,
                COUNT(*) AS calls,
                COALESCE(SUM(input_tokens), 0) AS input_tokens,
                COALESCE(SUM(output_tokens), 0) AS output_tokens,
                COALESCE(SUM(
                    CASE
                        WHEN COALESCE(total_tokens, 0) > COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                            THEN COALESCE(total_tokens, 0)
                        ELSE COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                    END
                ), 0) AS total_tokens,
                COALESCE(SUM(cost_usd), 0) AS cost_usd,
                COALESCE(AVG(duration_ms), 0) AS avg_duration_ms
            FROM ai_usage_logs
            WHERE created_at >= $1
            GROUP BY model_name, endpoint
        `, [sinceValue]);

        const { rows: dailyRows } = await db.query<AiUsageDailyRow>(`
            SELECT
                SUBSTR(CAST(created_at AS TEXT), 1, 10) AS date,
                COALESCE(SUM(input_tokens), 0) AS input_tokens,
                COALESCE(SUM(output_tokens), 0) AS output_tokens,
                COALESCE(SUM(
                    CASE
                        WHEN COALESCE(total_tokens, 0) > COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                            THEN COALESCE(total_tokens, 0)
                        ELSE COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                    END
                ), 0) AS total_tokens,
                COALESCE(SUM(cost_usd), 0) AS cost_usd
            FROM ai_usage_logs
            WHERE created_at >= $1
            GROUP BY SUBSTR(CAST(created_at AS TEXT), 1, 10)
            ORDER BY date ASC
        `, [sinceValue]);

        const totalBucket: EconomicsBucket = {
            key: 'all',
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            loggedTotalTokens: 0,
            costUsd: 0,
            estimatedBusinessValueCny: 0,
            weightedDurationMs: 0,
        };
        const modelBuckets = new Map<string, EconomicsBucket>();
        const endpointBuckets = new Map<string, EconomicsBucket>();

        const addToBucket = (
            buckets: Map<string, EconomicsBucket>,
            key: string,
            values: Omit<EconomicsBucket, 'key'>,
        ) => {
            const bucket = buckets.get(key) || {
                key,
                calls: 0,
                inputTokens: 0,
                outputTokens: 0,
                loggedTotalTokens: 0,
                costUsd: 0,
                estimatedBusinessValueCny: 0,
                weightedDurationMs: 0,
            };

            bucket.calls += values.calls;
            bucket.inputTokens += values.inputTokens;
            bucket.outputTokens += values.outputTokens;
            bucket.loggedTotalTokens += values.loggedTotalTokens;
            bucket.costUsd += values.costUsd;
            bucket.estimatedBusinessValueCny += values.estimatedBusinessValueCny;
            bucket.weightedDurationMs += values.weightedDurationMs;
            buckets.set(key, bucket);
        };

        aggregateRows.forEach((row) => {
            const modelName = row.model_name || 'unknown';
            const endpoint = row.endpoint || 'background';
            const calls = metricNumber(row.calls);
            const inputTokens = metricNumber(row.input_tokens);
            const outputTokens = metricNumber(row.output_tokens);
            const loggedTotalTokens = metricNumber(row.total_tokens);
            const costUsd = metricNumber(row.cost_usd);
            const avgDurationMs = metricNumber(row.avg_duration_ms);
            const perCallEconomics = calculateInferenceEconomics(endpoint, modelName, 0, 0);
            const values = {
                calls,
                inputTokens,
                outputTokens,
                loggedTotalTokens,
                costUsd,
                estimatedBusinessValueCny: perCallEconomics.businessValueCny * calls,
                weightedDurationMs: avgDurationMs * calls,
            };

            totalBucket.calls += values.calls;
            totalBucket.inputTokens += values.inputTokens;
            totalBucket.outputTokens += values.outputTokens;
            totalBucket.loggedTotalTokens += values.loggedTotalTokens;
            totalBucket.costUsd += values.costUsd;
            totalBucket.estimatedBusinessValueCny += values.estimatedBusinessValueCny;
            totalBucket.weightedDurationMs += values.weightedDurationMs;
            addToBucket(modelBuckets, modelName, values);
            addToBucket(endpointBuckets, endpoint, values);
        });

        const totals = serializeBucket(totalBucket);
        const returnOnInference = totals.cost_cny > 0
            ? roundMetric(totals.estimated_business_value_cny / totals.cost_cny, 2)
            : null;
        const inferenceToValuePct = totals.estimated_business_value_cny > 0
            ? roundMetric((totals.cost_cny / totals.estimated_business_value_cny) * 100, 4)
            : null;

        res.json(ApiResponse.success({
            period: {
                range,
                since: since.toISOString(),
                generated_at: new Date().toISOString(),
            },
            totals: {
                ...totals,
                return_on_inference: returnOnInference,
                inference_to_value_pct: inferenceToValuePct,
                tier: classifyRoi(returnOnInference, totals.calls, totals.cost_cny),
                zero_cost_usage: totals.calls > 0 && totals.cost_cny === 0,
            },
            by_model: Array.from(modelBuckets.values())
                .map(serializeBucket)
                .sort((a, b) => b.total_tokens - a.total_tokens),
            by_endpoint: Array.from(endpointBuckets.values())
                .map(serializeBucket)
                .sort((a, b) => b.calls - a.calls)
                .slice(0, 8),
            daily: dailyRows.map((row) => {
                const inputTokens = metricNumber(row.input_tokens);
                const outputTokens = metricNumber(row.output_tokens);
                const totalTokens = Math.max(metricNumber(row.total_tokens), inputTokens + outputTokens);

                return {
                    date: row.date,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    total_tokens: totalTokens,
                    cost_usd: roundMetric(metricNumber(row.cost_usd), 6),
                };
            }),
        }));
    } catch (error) {
        console.error('Failed to aggregate AI economics metrics:', error);
        res.status(500).json(ApiResponse.fail('Failed to aggregate AI economics metrics'));
    }
    },
);

/**
 * GET /api/metrics/health
 * Returns Node.js process health stats
 */
router.get('/health', authorize('admin'), (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    res.json(ApiResponse.success({
        memory: {
            rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
            heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
            heap_total_mb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
            external_mb: +(mem.external / 1024 / 1024).toFixed(2),
        },
        cpu: {
            user_ms: +(cpu.user / 1000).toFixed(2),
            system_ms: +(cpu.system / 1000).toFixed(2),
        },
        node_version: process.version,
        platform: process.platform,
        pid: process.pid,
    }));
});

/**
 * POST /api/metrics/record
 * Record a metric event (for SDA/agent external reporting)
 */
router.post('/record', authorize('admin'), (req: Request, res: Response) => {
    const { type, data } = req.body;

    switch (type) {
        case 'sda':
            metricsStore.sda.cycles++;
            if (data.phase === 'simulate' && data.pass) metricsStore.sda.simulatePasses++;
            if (data.phase === 'deploy') metricsStore.sda.deploys++;
            if (data.phase === 'augment') metricsStore.sda.augments++;
            break;

        case 'agent':
            metricsStore.agents.invocations++;
            metricsStore.agents.byAgent[data.agent] = (metricsStore.agents.byAgent[data.agent] || 0) + 1;
            break;

        default:
            return res.status(400).json(ApiResponse.fail('Unknown metric type. Use "sda" or "agent".'));
    }

    res.json(ApiResponse.success(null));
});

/**
 * POST /api/metrics/reset
 * Reset all metrics
 */
router.post('/reset', authorize('admin'), (_req: Request, res: Response) => {
    resetMetrics();
    res.json(ApiResponse.success(null, 'Metrics reset'));
});

function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export default router;
