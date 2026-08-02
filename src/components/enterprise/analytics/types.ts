export type AnalyticsRange = '7d' | '30d' | '90d';

export type MeasurementKind = 'measured' | 'estimated' | 'unavailable';

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
    measurement: MeasurementKind;
    sample_size: number;
    source: string;
    reason: string | null;
}

export type OperatingStageId =
    | 'intake'
    | 'diagnosis'
    | 'deflection'
    | 'dispatch'
    | 'verification'
    | 'reporting';

export interface AnalyticsAccessIssue {
    source: string;
    message: string;
}

export interface CompanyAnalyticsMeta {
    range: AnalyticsRange;
    since: string;
    until: string;
    generated_at: string;
    formula_version: 'company-analytics-v1';
    freshness: 'live' | 'partial';
    access_issues: AnalyticsAccessIssue[];
}

export interface CompanyPulseData {
    active_work_orders: MetricPoint;
    available_workers: MetricPoint;
    satisfaction: MetricPoint;
    sla_attainment_pct: MetricPoint;
    deflection_rate_pct: MetricPoint;
    first_time_fix_rate_pct: MetricPoint;
    diagnosis_accuracy_pct: MetricPoint;
    revenue_cny: MetricPoint;
    gross_margin_pct: MetricPoint;
    estimated_ai_value_cny: MetricPoint;
}

export type CompanyPulseMetricId = keyof CompanyPulseData;

export interface OperatingStageMetric {
    stage: OperatingStageId;
    order: 1 | 2 | 3 | 4 | 5 | 6;
    current_volume: MetricPoint;
    conversion_to_next_pct: MetricPoint;
    median_cycle_hours: MetricPoint;
    exception_count: MetricPoint;
}

export type StrategicDimensionId = 'tam' | 'ten_x' | 'team' | 'financials';
export type StrategicConfidence = 'high' | 'medium' | 'low' | 'unavailable';

export interface StrategicDimensionMetric {
    id: StrategicDimensionId;
    score: MetricPoint;
    confidence: StrategicConfidence;
    formula_version: string;
    evidence_metric_ids: string[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertOwner = 'operations' | 'finance' | 'workforce' | 'quality';
export type AlertComparator = 'gt' | 'gte' | 'lt' | 'lte';

export interface StrategyAlertView {
    id: string;
    severity: AlertSeverity;
    owner: AlertOwner;
    stage: OperatingStageId | null;
    metric_id: string;
    metric: MetricPoint;
    threshold: number;
    comparator: AlertComparator;
    recommendation_code: string;
    requires_human_approval: boolean;
    generated_at: string;
}

export type AgentWorkflowStage = OperatingStageId | 'cross_stage';
export type AgentStatus = 'online' | 'idle' | 'offline';

export interface AgentOperationMetric {
    id: string;
    display_code: string;
    workflow_stage: AgentWorkflowStage;
    status: AgentStatus;
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

export interface SystemLoadSample {
    timestamp: string;
    throughput_per_minute: number;
    success_rate_pct: number | null;
    average_latency_ms: number | null;
}

export interface SystemLoadMetric {
    observation_started_at: string;
    throughput_per_minute: MetricPoint;
    success_rate_pct: MetricPoint;
    average_latency_ms: MetricPoint;
    p95_latency_ms: MetricPoint;
    active_agents: MetricPoint;
    utilization_pct: MetricPoint;
    samples: SystemLoadSample[];
}

export interface EfficiencyMetric {
    ai_compute_share_pct: MetricPoint;
    coordination_share_pct: MetricPoint;
    idle_share_pct: MetricPoint;
    cost_optimization_pct: MetricPoint;
}

export interface MarketIntelligenceUnavailable {
    latest: null;
    measurement: 'unavailable';
    reason: string;
}

export interface CompanyAnalyticsOverview {
    meta: CompanyAnalyticsMeta;
    pulse: CompanyPulseData;
    operating_loop: OperatingStageMetric[];
    strategic_dimensions: StrategicDimensionMetric[];
    alerts: StrategyAlertView[];
    agent_operations: AgentOperationMetric[];
    system_load: SystemLoadMetric;
    efficiency: EfficiencyMetric;
    intelligence: MarketIntelligenceUnavailable;
}
