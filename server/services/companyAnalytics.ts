import db from '../config/database.js';
import {
    AgentTelemetryService,
    agentTelemetryService,
    type AgentOperationMetric,
    type AgentTelemetryOverview,
    type AnalyticsDatabase,
    type AnalyticsRange,
    type AnalyticsTimeWindow,
    type DataAccessIssue,
    type MetricPoint,
    type MetricUnit,
    type OperatingStageId,
    type SystemLoadMetric,
} from './agentTelemetry.js';

export type {
    AnalyticsRange,
    DataAccessIssue,
    MetricPoint,
    OperatingStageId,
};

export interface CompanyAnalyticsOverview {
    meta: {
        range: AnalyticsRange;
        since: string;
        until: string;
        generated_at: string;
        formula_version: 'company-analytics-v1';
        freshness: 'live' | 'partial';
        access_issues: DataAccessIssue[];
    };
    pulse: {
        active_work_orders: MetricPoint;
        available_workers: MetricPoint;
        satisfaction: MetricPoint;
        sla_attainment_pct: MetricPoint;
        deflection_rate_pct: MetricPoint;
        first_time_fix_rate_pct: MetricPoint;
        diagnosis_accuracy_pct: MetricPoint;
        revenue_cny: MetricPoint;
        gross_margin_pct: MetricPoint;
    };
    operating_loop: Array<{
        stage: OperatingStageId;
        order: 1 | 2 | 3 | 4 | 5 | 6;
        current_volume: MetricPoint;
        conversion_to_next_pct: MetricPoint;
        median_cycle_hours: MetricPoint;
        exception_count: MetricPoint;
    }>;
    strategic_dimensions: Array<{
        id: 'tam' | 'ten_x' | 'team' | 'financials';
        score: MetricPoint;
        confidence: 'high' | 'medium' | 'low' | 'unavailable';
        formula_version: string;
        evidence_metric_ids: string[];
    }>;
    alerts: Array<{
        id: string;
        severity: 'critical' | 'warning' | 'info';
        owner: 'operations' | 'finance' | 'workforce' | 'quality';
        stage: OperatingStageId | null;
        metric_id: string;
        metric: MetricPoint;
        threshold: number;
        comparator: 'gt' | 'gte' | 'lt' | 'lte';
        recommendation_code: string;
        requires_human_approval: boolean;
        generated_at: string;
    }>;
    agent_operations: AgentOperationMetric[];
    system_load: SystemLoadMetric;
    efficiency: {
        ai_compute_share_pct: MetricPoint;
        coordination_share_pct: MetricPoint;
        idle_share_pct: MetricPoint;
        cost_optimization_pct: MetricPoint;
    };
    intelligence: {
        latest: null;
        measurement: 'unavailable';
        reason: string;
    };
}

interface ReportPeriodRow {
    period_reports: number | string | null;
    diy_reports: number | string | null;
    first_time_fix_samples: number | string | null;
    first_time_fix_successes: number | string | null;
    diagnosis_samples: number | string | null;
    diagnosis_successes: number | string | null;
    intake_volume: number | string | null;
    diagnosis_volume: number | string | null;
    deflection_volume: number | string | null;
    dispatch_volume: number | string | null;
    verification_volume: number | string | null;
    reporting_volume: number | string | null;
    intake_exceptions: number | string | null;
    diagnosis_exceptions: number | string | null;
    deflection_exceptions: number | string | null;
    dispatch_exceptions: number | string | null;
    verification_exceptions: number | string | null;
    reporting_exceptions: number | string | null;
}

interface CurrentReportRow {
    current_reports: number | string | null;
    active_work_orders: number | string | null;
    workflow_failures: number | string | null;
}

interface ReportReadModel {
    period: ReportPeriodRow;
    current: CurrentReportRow;
}

interface WorkerRow {
    total_workers: number | string | null;
    available_workers: number | string | null;
}

interface ReviewRow {
    review_count: number | string | null;
    average_rating: number | string | null;
}

interface RevenueRow {
    paid_order_count: number | string | null;
    paid_amount_minor: number | string | null;
}

interface SourceResult<T> {
    available: boolean;
    value: T;
}

interface AgentTelemetryReader {
    getTelemetry(window: AnalyticsTimeWindow): Promise<AgentTelemetryOverview>;
}

type StrategyAlert = CompanyAnalyticsOverview['alerts'][number];

const FORMULA_VERSION = 'company-analytics-v1' as const;
const RANGE_DAYS: Record<AnalyticsRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};
const STAGES: ReadonlyArray<{ stage: OperatingStageId; order: 1 | 2 | 3 | 4 | 5 | 6 }> = [
    { stage: 'intake', order: 1 },
    { stage: 'diagnosis', order: 2 },
    { stage: 'deflection', order: 3 },
    { stage: 'dispatch', order: 4 },
    { stage: 'verification', order: 5 },
    { stage: 'reporting', order: 6 },
];

const PLANNED_ACCESS_ISSUES: readonly DataAccessIssue[] = [
    {
        source: 'sla_policy_ledger',
        message: 'SLA attainment is unavailable because no durable deadline or policy ledger exists.',
    },
    {
        source: 'stage_transition_events',
        message: 'Stage conversion and cycle time are unavailable because transition history is not durable.',
    },
    {
        source: 'agent_run_outcomes',
        message: 'Agent success rates and active runs are unavailable because run outcomes are not durable.',
    },
    {
        source: 'ops_metric_samples',
        message: 'Historical load samples and system p95 latency are unavailable.',
    },
    {
        source: 'system_capacity',
        message: 'Utilization is unavailable because no configured capacity baseline exists.',
    },
    {
        source: 'research_runs',
        message: 'Market intelligence is unavailable because validated research history is not durable.',
    },
    {
        source: 'efficiency_telemetry',
        message: 'Efficiency shares are unavailable because timing categories and a baseline are not observable.',
    },
];

const emptyReportPeriod = (): ReportPeriodRow => ({
    period_reports: 0,
    diy_reports: 0,
    first_time_fix_samples: 0,
    first_time_fix_successes: 0,
    diagnosis_samples: 0,
    diagnosis_successes: 0,
    intake_volume: 0,
    diagnosis_volume: 0,
    deflection_volume: 0,
    dispatch_volume: 0,
    verification_volume: 0,
    reporting_volume: 0,
    intake_exceptions: 0,
    diagnosis_exceptions: 0,
    deflection_exceptions: 0,
    dispatch_exceptions: 0,
    verification_exceptions: 0,
    reporting_exceptions: 0,
});

const emptyReportModel = (): ReportReadModel => ({
    period: emptyReportPeriod(),
    current: {
        current_reports: 0,
        active_work_orders: 0,
        workflow_failures: 0,
    },
});

const roundMetric = (value: number, digits = 2): number => Number(value.toFixed(digits));
const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, value))
);

const metricNumber = (value: number | string | null | undefined): number => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
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

const estimatedMetric = (
    value: number,
    unit: MetricUnit,
    sampleSize: number,
    source: string,
): MetricPoint => ({
    value,
    unit,
    measurement: 'estimated',
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

const errorMessage = (error: unknown): string => (
    error instanceof Error ? error.message : 'Unknown data access failure'
);

const captureSource = async <T>(
    source: string,
    promise: Promise<T>,
    fallback: T,
): Promise<{ result: SourceResult<T>; issue: DataAccessIssue | null }> => {
    try {
        return {
            result: { available: true, value: await promise },
            issue: null,
        };
    } catch (error) {
        return {
            result: { available: false, value: fallback },
            issue: { source, message: errorMessage(error) },
        };
    }
};

const createTimeWindow = (range: AnalyticsRange, generatedAt: Date): AnalyticsTimeWindow => {
    const until = new Date(generatedAt);
    const since = new Date(Date.UTC(
        until.getUTCFullYear(),
        until.getUTCMonth(),
        until.getUTCDate(),
    ));
    since.setUTCDate(since.getUTCDate() - RANGE_DAYS[range] + 1);
    return { since, until, generatedAt: until };
};

const percentageMetric = (
    numerator: number,
    denominator: number,
    source: string,
    noDataReason: string,
): MetricPoint => (
    denominator > 0
        ? measuredMetric(
            roundMetric((numerator / denominator) * 100, 2),
            'percent',
            denominator,
            source,
        )
        : unavailableMetric('percent', source, noDataReason)
);

const unavailableSystemLoad = (generatedAt: Date): SystemLoadMetric => {
    const reason = 'Current process metrics could not be read.';
    return {
        observation_started_at: generatedAt.toISOString(),
        throughput_per_minute: unavailableMetric(
            'requests_per_minute',
            'metricsStore.current_process',
            reason,
        ),
        success_rate_pct: unavailableMetric(
            'percent',
            'metricsStore.current_process',
            reason,
        ),
        average_latency_ms: unavailableMetric(
            'milliseconds',
            'metricsStore.current_process',
            reason,
        ),
        p95_latency_ms: unavailableMetric('milliseconds', 'ops_metric_samples', reason),
        active_agents: unavailableMetric('count', 'agent_runs', reason),
        utilization_pct: unavailableMetric('percent', 'system_capacity', reason),
        samples: [],
    };
};

const unavailableTelemetry = (
    generatedAt: Date,
    message: string,
): AgentTelemetryOverview => ({
    agent_operations: [],
    system_load: unavailableSystemLoad(generatedAt),
    total_cost_cny: null,
    access_issues: [{ source: 'agent_telemetry', message }],
});

const unavailableScore = (
    source: string,
    reason: string,
): MetricPoint => unavailableMetric('score_10', source, reason);

export const isAnalyticsRange = (value: string): value is AnalyticsRange => (
    Object.prototype.hasOwnProperty.call(RANGE_DAYS, value)
);

export class CompanyAnalyticsService {
    constructor(
        private readonly database: AnalyticsDatabase = db,
        private readonly telemetry: AgentTelemetryReader = agentTelemetryService,
    ) {}

    async getOverview(
        range: AnalyticsRange,
        generatedAt = new Date(),
    ): Promise<CompanyAnalyticsOverview> {
        const window = createTimeWindow(range, generatedAt);
        const [
            reportsCapture,
            workersCapture,
            reviewsCapture,
            revenueCapture,
            telemetryCapture,
        ] = await Promise.all([
            captureSource('reports', this.readReports(window), emptyReportModel()),
            captureSource<WorkerRow>(
                'workers',
                this.readWorkers(),
                { total_workers: 0, available_workers: 0 },
            ),
            captureSource<ReviewRow>(
                'reviews',
                this.readReviews(window),
                { review_count: 0, average_rating: null },
            ),
            captureSource<RevenueRow>(
                'orders',
                this.readRevenue(window),
                { paid_order_count: 0, paid_amount_minor: 0 },
            ),
            captureSource<AgentTelemetryOverview>(
                'agent_telemetry',
                this.telemetry.getTelemetry(window),
                unavailableTelemetry(window.generatedAt, 'Agent telemetry could not be read.'),
            ),
        ]);

        const reports = reportsCapture.result;
        const workers = workersCapture.result;
        const reviews = reviewsCapture.result;
        const revenue = revenueCapture.result;
        const telemetry = telemetryCapture.result.value;
        const accessIssues = [
            reportsCapture.issue,
            workersCapture.issue,
            reviewsCapture.issue,
            revenueCapture.issue,
            telemetryCapture.issue,
            ...telemetry.access_issues,
            ...PLANNED_ACCESS_ISSUES,
        ].filter((issue): issue is DataAccessIssue => issue !== null);

        const periodReportCount = metricNumber(reports.value.period.period_reports);
        const currentReportCount = metricNumber(reports.value.current.current_reports);
        const activeWorkOrderCount = metricNumber(reports.value.current.active_work_orders);
        const availableWorkerCount = metricNumber(workers.value.available_workers);
        const totalWorkerCount = metricNumber(workers.value.total_workers);
        const reviewCount = metricNumber(reviews.value.review_count);
        const averageRating = reviews.value.average_rating === null
            ? null
            : metricNumber(reviews.value.average_rating);
        const paidOrderCount = metricNumber(revenue.value.paid_order_count);
        const revenueCnyValue = roundMetric(
            metricNumber(revenue.value.paid_amount_minor) / 100,
            2,
        );

        const activeWorkOrders = reports.available
            ? measuredMetric(
                activeWorkOrderCount,
                'count',
                currentReportCount,
                'reports.status',
            )
            : unavailableMetric(
                'count',
                'reports.status',
                'Report status data could not be read.',
            );
        const availableWorkers = workers.available
            ? measuredMetric(
                availableWorkerCount,
                'count',
                totalWorkerCount,
                'workers.available',
            )
            : unavailableMetric(
                'count',
                'workers.available',
                'Worker availability data could not be read.',
            );
        const satisfaction = !reviews.available
            ? unavailableMetric(
                'score_10',
                'reviews.rating',
                'Review data could not be read.',
            )
            : reviewCount === 0 || averageRating === null
                ? unavailableMetric(
                    'score_10',
                    'reviews.rating',
                    'No durable reviews exist in the selected period.',
                )
                : measuredMetric(
                    roundMetric(clamp(averageRating * 2, 0, 10), 2),
                    'score_10',
                    reviewCount,
                    'reviews.rating',
                );
        const deflectionRate = !reports.available
            ? unavailableMetric(
                'percent',
                'reports.severity_tag',
                'Report data could not be read.',
            )
            : percentageMetric(
                metricNumber(reports.value.period.diy_reports),
                periodReportCount,
                'reports.severity_tag',
                'No reports exist in the selected period.',
            );
        const firstTimeFixRate = !reports.available
            ? unavailableMetric(
                'percent',
                'reports.first_time_fix',
                'Report data could not be read.',
            )
            : percentageMetric(
                metricNumber(reports.value.period.first_time_fix_successes),
                metricNumber(reports.value.period.first_time_fix_samples),
                'reports.first_time_fix',
                'No first-time-fix observations exist in the selected period.',
            );
        const diagnosisAccuracy = !reports.available
            ? unavailableMetric(
                'percent',
                'reports.diagnosis_correct',
                'Report data could not be read.',
            )
            : percentageMetric(
                metricNumber(reports.value.period.diagnosis_successes),
                metricNumber(reports.value.period.diagnosis_samples),
                'reports.diagnosis_correct',
                'No diagnosis accuracy observations exist in the selected period.',
            );
        const revenueCny = revenue.available
            ? measuredMetric(
                revenueCnyValue,
                'cny',
                paidOrderCount,
                'orders.amount_minor',
            )
            : unavailableMetric(
                'cny',
                'orders.amount_minor',
                'Paid order data could not be read.',
            );
        const grossMargin = this.buildGrossMargin(
            revenue,
            revenueCnyValue,
            paidOrderCount,
            telemetry.total_cost_cny,
        );

        const pulse: CompanyAnalyticsOverview['pulse'] = {
            active_work_orders: activeWorkOrders,
            available_workers: availableWorkers,
            satisfaction,
            sla_attainment_pct: unavailableMetric(
                'percent',
                'sla_policy_ledger',
                'No durable SLA deadline or policy ledger exists.',
            ),
            deflection_rate_pct: deflectionRate,
            first_time_fix_rate_pct: firstTimeFixRate,
            diagnosis_accuracy_pct: diagnosisAccuracy,
            revenue_cny: revenueCny,
            gross_margin_pct: grossMargin,
        };

        const operatingLoop = this.buildOperatingLoop(reports, periodReportCount);
        const workerAvailabilityRate = !workers.available
            ? unavailableMetric(
                'percent',
                'workers.available',
                'Worker availability data could not be read.',
            )
            : percentageMetric(
                availableWorkerCount,
                totalWorkerCount,
                'workers.available',
                'No workers exist.',
            );
        const strategicDimensions = this.buildStrategicDimensions(
            pulse,
            workerAvailabilityRate,
            revenueCnyValue,
            telemetry.total_cost_cny,
            paidOrderCount,
        );
        const alerts = this.buildAlerts({
            pulse,
            reports,
            activeWorkOrderCount,
            currentReportCount,
            availableWorkerCount,
            workersAvailable: workers.available,
            generatedAt: window.generatedAt,
        });

        const efficiencyReason = (
            'Required compute, coordination, idle, and baseline observations are not durable.'
        );

        return {
            meta: {
                range,
                since: window.since.toISOString(),
                until: window.until.toISOString(),
                generated_at: window.generatedAt.toISOString(),
                formula_version: FORMULA_VERSION,
                freshness: 'partial',
                access_issues: accessIssues,
            },
            pulse,
            operating_loop: operatingLoop,
            strategic_dimensions: strategicDimensions,
            alerts,
            agent_operations: telemetry.agent_operations,
            system_load: telemetry.system_load,
            efficiency: {
                ai_compute_share_pct: unavailableMetric(
                    'percent',
                    'efficiency_telemetry',
                    efficiencyReason,
                ),
                coordination_share_pct: unavailableMetric(
                    'percent',
                    'efficiency_telemetry',
                    efficiencyReason,
                ),
                idle_share_pct: unavailableMetric(
                    'percent',
                    'efficiency_telemetry',
                    efficiencyReason,
                ),
                cost_optimization_pct: unavailableMetric(
                    'percent',
                    'efficiency_baseline',
                    'No declared baseline model and period are available.',
                ),
            },
            intelligence: {
                latest: null,
                measurement: 'unavailable',
                reason: 'Validated research-run history is not durable.',
            },
        };
    }

    private async readReports(window: AnalyticsTimeWindow): Promise<ReportReadModel> {
        const params = [sqlTimestamp(window.since), sqlTimestamp(window.until)];
        const [periodResult, currentResult] = await Promise.all([
            this.database.query<ReportPeriodRow>(`
                SELECT
                    COUNT(*) AS period_reports,
                    COALESCE(SUM(CASE WHEN severity_tag = 'diy' THEN 1 ELSE 0 END), 0)
                        AS diy_reports,
                    COALESCE(SUM(CASE WHEN first_time_fix IS NOT NULL THEN 1 ELSE 0 END), 0)
                        AS first_time_fix_samples,
                    COALESCE(SUM(CASE WHEN first_time_fix = 1 THEN 1 ELSE 0 END), 0)
                        AS first_time_fix_successes,
                    COALESCE(SUM(CASE WHEN diagnosis_correct IS NOT NULL THEN 1 ELSE 0 END), 0)
                        AS diagnosis_samples,
                    COALESCE(SUM(CASE WHEN diagnosis_correct = 1 THEN 1 ELSE 0 END), 0)
                        AS diagnosis_successes,
                    COALESCE(SUM(CASE
                        WHEN status = 'pending'
                            OR status IS NULL
                            OR status NOT IN (
                                'pending',
                                'failed_analysis',
                                'flagged_for_review',
                                'analyzed',
                                'failed_planning',
                                'planned',
                                'matching',
                                'broadcasted',
                                'matched',
                                'in_progress',
                                'completed',
                                'cancelled'
                            )
                        THEN 1 ELSE 0
                    END), 0) AS intake_volume,
                    COALESCE(SUM(CASE
                        WHEN status IN ('failed_analysis', 'flagged_for_review')
                        THEN 1 ELSE 0
                    END), 0) AS diagnosis_volume,
                    COALESCE(SUM(CASE
                        WHEN status IN ('analyzed', 'failed_planning')
                        THEN 1 ELSE 0
                    END), 0) AS deflection_volume,
                    COALESCE(SUM(CASE
                        WHEN status IN ('planned', 'matching', 'broadcasted', 'matched')
                        THEN 1 ELSE 0
                    END), 0) AS dispatch_volume,
                    COALESCE(SUM(CASE
                        WHEN status = 'in_progress'
                        THEN 1 ELSE 0
                    END), 0) AS verification_volume,
                    COALESCE(SUM(CASE
                        WHEN status IN ('completed', 'cancelled')
                        THEN 1 ELSE 0
                    END), 0) AS reporting_volume,
                    0 AS intake_exceptions,
                    COALESCE(SUM(CASE
                        WHEN status = 'failed_analysis'
                        THEN 1 ELSE 0
                    END), 0) AS diagnosis_exceptions,
                    COALESCE(SUM(CASE
                        WHEN status = 'failed_planning'
                        THEN 1 ELSE 0
                    END), 0) AS deflection_exceptions,
                    0 AS dispatch_exceptions,
                    0 AS verification_exceptions,
                    COALESCE(SUM(CASE
                        WHEN status = 'cancelled'
                        THEN 1 ELSE 0
                    END), 0) AS reporting_exceptions
                FROM reports
                WHERE created_at >= $1 AND created_at <= $2
            `, params),
            this.database.query<CurrentReportRow>(`
                SELECT
                    COUNT(*) AS current_reports,
                    COALESCE(SUM(CASE
                        WHEN status IS NULL OR status NOT IN ('completed', 'cancelled')
                        THEN 1 ELSE 0
                    END), 0) AS active_work_orders,
                    COALESCE(SUM(CASE
                        WHEN status IN ('failed_analysis', 'failed_planning')
                        THEN 1 ELSE 0
                    END), 0) AS workflow_failures
                FROM reports
            `),
        ]);

        return {
            period: periodResult.rows[0] || emptyReportPeriod(),
            current: currentResult.rows[0] || emptyReportModel().current,
        };
    }

    private async readWorkers(): Promise<WorkerRow> {
        const result = await this.database.query<WorkerRow>(`
            SELECT
                COUNT(*) AS total_workers,
                COALESCE(SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END), 0)
                    AS available_workers
            FROM workers
        `);
        return result.rows[0] || { total_workers: 0, available_workers: 0 };
    }

    private async readReviews(window: AnalyticsTimeWindow): Promise<ReviewRow> {
        const result = await this.database.query<ReviewRow>(`
            SELECT
                COUNT(*) AS review_count,
                AVG(rating) AS average_rating
            FROM reviews
            WHERE created_at >= $1 AND created_at <= $2
        `, [sqlTimestamp(window.since), sqlTimestamp(window.until)]);
        return result.rows[0] || { review_count: 0, average_rating: null };
    }

    private async readRevenue(window: AnalyticsTimeWindow): Promise<RevenueRow> {
        const result = await this.database.query<RevenueRow>(`
            SELECT
                COUNT(*) AS paid_order_count,
                COALESCE(SUM(amount), 0) AS paid_amount_minor
            FROM orders
            WHERE status = 'paid'
                AND LOWER(COALESCE(currency, 'cny')) = 'cny'
                AND created_at >= $1
                AND created_at <= $2
        `, [sqlTimestamp(window.since), sqlTimestamp(window.until)]);
        return result.rows[0] || { paid_order_count: 0, paid_amount_minor: 0 };
    }

    private buildGrossMargin(
        revenue: SourceResult<RevenueRow>,
        revenueCny: number,
        paidOrderCount: number,
        aiCostCny: number | null,
    ): MetricPoint {
        if (!revenue.available) {
            return unavailableMetric(
                'percent',
                'orders.amount_minor+ai_usage_logs.cost_usd',
                'Paid order data could not be read.',
            );
        }
        if (revenueCny <= 0) {
            return unavailableMetric(
                'percent',
                'orders.amount_minor+ai_usage_logs.cost_usd',
                'Paid revenue is zero in the selected period.',
            );
        }
        if (aiCostCny === null) {
            return unavailableMetric(
                'percent',
                'orders.amount_minor+ai_usage_logs.cost_usd',
                'AI cost data could not be read.',
                paidOrderCount,
            );
        }

        return measuredMetric(
            roundMetric(((revenueCny - aiCostCny) / revenueCny) * 100, 2),
            'percent',
            paidOrderCount,
            'orders.amount_minor+ai_usage_logs.cost_usd',
        );
    }

    private buildOperatingLoop(
        reports: SourceResult<ReportReadModel>,
        periodReportCount: number,
    ): CompanyAnalyticsOverview['operating_loop'] {
        const transitionReason = (
            'Stage-transition history is not durable, so this metric cannot be inferred.'
        );

        return STAGES.map(({ stage, order }) => {
            const volume = metricNumber(
                reports.value.period[`${stage}_volume` as keyof ReportPeriodRow],
            );
            const exceptions = metricNumber(
                reports.value.period[`${stage}_exceptions` as keyof ReportPeriodRow],
            );

            return {
                stage,
                order,
                current_volume: reports.available
                    ? measuredMetric(
                        volume,
                        'count',
                        periodReportCount,
                        'reports.status',
                    )
                    : unavailableMetric(
                        'count',
                        'reports.status',
                        'Report data could not be read.',
                    ),
                conversion_to_next_pct: unavailableMetric(
                    'percent',
                    'stage_transition_events',
                    transitionReason,
                ),
                median_cycle_hours: unavailableMetric(
                    'hours',
                    'stage_transition_events',
                    transitionReason,
                ),
                exception_count: reports.available
                    ? measuredMetric(
                        exceptions,
                        'count',
                        volume,
                        'reports.status',
                    )
                    : unavailableMetric(
                        'count',
                        'reports.status',
                        'Report data could not be read.',
                    ),
            };
        });
    }

    private buildStrategicDimensions(
        pulse: CompanyAnalyticsOverview['pulse'],
        workerAvailabilityRate: MetricPoint,
        revenueCny: number,
        aiCostCny: number | null,
        paidOrderCount: number,
    ): CompanyAnalyticsOverview['strategic_dimensions'] {
        const tenXInputs = [
            pulse.deflection_rate_pct,
            pulse.diagnosis_accuracy_pct,
            pulse.first_time_fix_rate_pct,
        ];
        const tenXAvailable = tenXInputs.every((metric) => metric.value !== null);
        const tenXScore = tenXAvailable
            ? estimatedMetric(
                roundMetric(clamp((
                    (pulse.deflection_rate_pct.value as number) * 0.4
                    + (pulse.diagnosis_accuracy_pct.value as number) * 0.35
                    + (pulse.first_time_fix_rate_pct.value as number) * 0.25
                ) / 10, 0, 10), 2),
                'score_10',
                Math.min(...tenXInputs.map((metric) => metric.sample_size)),
                `${FORMULA_VERSION}:ten_x`,
            )
            : unavailableScore(
                `${FORMULA_VERSION}:ten_x`,
                'Deflection, diagnosis accuracy, and first-time-fix inputs are all required.',
            );

        const teamInputs = [
            workerAvailabilityRate,
            pulse.first_time_fix_rate_pct,
            pulse.satisfaction,
        ];
        const teamAvailable = teamInputs.every((metric) => metric.value !== null);
        const satisfactionPct = pulse.satisfaction.value === null
            ? null
            : pulse.satisfaction.value * 10;
        const teamScore = teamAvailable && satisfactionPct !== null
            ? estimatedMetric(
                roundMetric(clamp((
                    (workerAvailabilityRate.value as number) * 0.3
                    + (pulse.first_time_fix_rate_pct.value as number) * 0.4
                    + satisfactionPct * 0.3
                ) / 10, 0, 10), 2),
                'score_10',
                Math.min(...teamInputs.map((metric) => metric.sample_size)),
                `${FORMULA_VERSION}:team`,
            )
            : unavailableScore(
                `${FORMULA_VERSION}:team`,
                'Worker availability, first-time-fix, and satisfaction inputs are all required.',
            );

        const inferenceEfficiency = revenueCny > 0 && aiCostCny !== null
            ? (1 - aiCostCny / revenueCny) * 100
            : null;
        const financialAvailable = pulse.gross_margin_pct.value !== null
            && inferenceEfficiency !== null;
        const financialScore = financialAvailable
            ? estimatedMetric(
                roundMetric(clamp((
                    (pulse.gross_margin_pct.value as number) * 0.6
                    + inferenceEfficiency * 0.4
                ) / 10, 0, 10), 2),
                'score_10',
                paidOrderCount,
                `${FORMULA_VERSION}:financials`,
            )
            : unavailableScore(
                `${FORMULA_VERSION}:financials`,
                'Positive paid revenue, gross margin, and AI cost are required.',
            );

        return [
            {
                id: 'tam',
                score: unavailableScore(
                    `${FORMULA_VERSION}:tam`,
                    'No durable validated research-run source exists.',
                ),
                confidence: 'unavailable',
                formula_version: `${FORMULA_VERSION}:tam`,
                evidence_metric_ids: [],
            },
            {
                id: 'ten_x',
                score: tenXScore,
                confidence: tenXAvailable ? 'medium' : 'unavailable',
                formula_version: `${FORMULA_VERSION}:ten_x`,
                evidence_metric_ids: [
                    'deflection_rate_pct',
                    'diagnosis_accuracy_pct',
                    'first_time_fix_rate_pct',
                ],
            },
            {
                id: 'team',
                score: teamScore,
                confidence: teamAvailable ? 'medium' : 'unavailable',
                formula_version: `${FORMULA_VERSION}:team`,
                evidence_metric_ids: [
                    'worker_availability_rate_pct',
                    'first_time_fix_rate_pct',
                    'satisfaction',
                ],
            },
            {
                id: 'financials',
                score: financialScore,
                confidence: financialAvailable ? 'medium' : 'unavailable',
                formula_version: `${FORMULA_VERSION}:financials`,
                evidence_metric_ids: [
                    'gross_margin_pct',
                    'inference_efficiency_pct',
                ],
            },
        ];
    }

    private buildAlerts(input: {
        pulse: CompanyAnalyticsOverview['pulse'];
        reports: SourceResult<ReportReadModel>;
        activeWorkOrderCount: number;
        currentReportCount: number;
        availableWorkerCount: number;
        workersAvailable: boolean;
        generatedAt: Date;
    }): StrategyAlert[] {
        const alerts: StrategyAlert[] = [];
        const generatedAt = input.generatedAt.toISOString();
        const workflowFailures = metricNumber(input.reports.value.current.workflow_failures);

        if (input.reports.available && workflowFailures >= 1) {
            alerts.push({
                id: 'workflow-failures',
                severity: 'critical',
                owner: 'operations',
                stage: null,
                metric_id: 'operating_failures',
                metric: measuredMetric(
                    workflowFailures,
                    'count',
                    input.currentReportCount,
                    'reports.status',
                ),
                threshold: 1,
                comparator: 'gte',
                recommendation_code: 'review_operating_exceptions',
                requires_human_approval: true,
                generated_at: generatedAt,
            });
        }

        if (
            input.pulse.diagnosis_accuracy_pct.value !== null
            && input.pulse.diagnosis_accuracy_pct.value < 85
        ) {
            alerts.push({
                id: 'diagnosis-accuracy',
                severity: 'warning',
                owner: 'quality',
                stage: 'diagnosis',
                metric_id: 'diagnosis_accuracy_pct',
                metric: input.pulse.diagnosis_accuracy_pct,
                threshold: 85,
                comparator: 'lt',
                recommendation_code: 'review_diagnosis_accuracy',
                requires_human_approval: false,
                generated_at: generatedAt,
            });
        }

        if (
            input.pulse.first_time_fix_rate_pct.value !== null
            && input.pulse.first_time_fix_rate_pct.value < 80
        ) {
            alerts.push({
                id: 'first-time-fix',
                severity: 'warning',
                owner: 'quality',
                stage: 'verification',
                metric_id: 'first_time_fix_rate_pct',
                metric: input.pulse.first_time_fix_rate_pct,
                threshold: 80,
                comparator: 'lt',
                recommendation_code: 'review_first_time_fix',
                requires_human_approval: true,
                generated_at: generatedAt,
            });
        }

        if (
            input.reports.available
            && input.workersAvailable
            && input.activeWorkOrderCount > 0
            && (
                input.availableWorkerCount === 0
                || input.activeWorkOrderCount / input.availableWorkerCount > 3
            )
        ) {
            const workOrdersPerWorker = input.availableWorkerCount === 0
                ? unavailableMetric(
                    'ratio',
                    'reports.status+workers.available',
                    'No workers are available, so the ratio has a zero denominator.',
                    input.activeWorkOrderCount,
                )
                : measuredMetric(
                    roundMetric(
                        input.activeWorkOrderCount / input.availableWorkerCount,
                        2,
                    ),
                    'ratio',
                    input.activeWorkOrderCount,
                    'reports.status+workers.available',
                );

            alerts.push({
                id: 'workforce-capacity',
                severity: 'warning',
                owner: 'workforce',
                stage: 'dispatch',
                metric_id: 'work_orders_per_available_worker',
                metric: workOrdersPerWorker,
                threshold: 3,
                comparator: 'gt',
                recommendation_code: 'review_workforce_capacity',
                requires_human_approval: true,
                generated_at: generatedAt,
            });
        }

        if (
            input.pulse.gross_margin_pct.value !== null
            && input.pulse.gross_margin_pct.value < 60
        ) {
            alerts.push({
                id: 'gross-margin',
                severity: 'warning',
                owner: 'finance',
                stage: null,
                metric_id: 'gross_margin_pct',
                metric: input.pulse.gross_margin_pct,
                threshold: 60,
                comparator: 'lt',
                recommendation_code: 'review_gross_margin',
                requires_human_approval: true,
                generated_at: generatedAt,
            });
        }

        return alerts;
    }
}

export const companyAnalyticsService = new CompanyAnalyticsService(
    db,
    agentTelemetryService as AgentTelemetryService,
);
