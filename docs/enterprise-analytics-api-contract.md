# Enterprise Analytics API Contract

Status: Published for implementation  
Contract version: `company-analytics-v1`  
Route: `GET /api/v1/analytics/company-overview?range=7d|30d|90d`

This contract is the shared boundary between the backend read model, analytics
UI modules, and the integration owner. Field names on the wire use
`snake_case`. Labels and reader-facing explanatory prose are localized in the
client. `source` is the stable localization key for unavailable metrics;
backend `reason` and access-issue `message` values are diagnostic evidence and
must not be rendered directly.

## Measurement Semantics

Every metric carries one of these states:

```ts
type MeasurementKind = 'measured' | 'estimated' | 'unavailable';

interface MetricPoint {
  value: number | null;
  unit:
    | 'count'
    | 'percent'
    | 'score_10'
    | 'milliseconds'
    | 'hours'
    | 'cny'
    | 'cny_per_minute'
    | 'requests_per_minute'
    | 'ratio';
  measurement: MeasurementKind;
  sample_size: number;
  source: string;
  reason: string | null;
}
```

Rules:

- `measured` means the value comes directly from a durable source or a
  deterministic aggregation of durable rows.
- `estimated` means the value uses a declared formula, baseline, or proxy.
- `unavailable` always uses `value: null` and a non-empty `reason`.
- A missing or zero denominator is `unavailable`, never a false `0%`.
- Percentages are returned on a `0..100` scale.
- Money is returned in CNY unless the field explicitly says otherwise.
- Dates are UTC ISO-8601 strings.

## Response

```ts
type AnalyticsRange = '7d' | '30d' | '90d';
type OperatingStageId =
  | 'intake'
  | 'diagnosis'
  | 'deflection'
  | 'dispatch'
  | 'verification'
  | 'reporting';

interface CompanyAnalyticsOverview {
  meta: {
    range: AnalyticsRange;
    since: string;
    until: string;
    generated_at: string;
    formula_version: 'company-analytics-v1';
    freshness: 'live' | 'partial';
    access_issues: Array<{
      source: string;
      message: string;
    }>;
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
  agent_operations: Array<{
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
  }>;
  system_load: {
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
  };
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
```

AI economics remains sourced from the already verified
`GET /api/v1/metrics/ai-economics` endpoint. The page joins the two bounded
requests with the same `range`; the economics formula is not duplicated in the
company read model.

Market research is guarded by
`GET /api/v1/ai/research-market/preflight`. The preflight exposes the daily
budget, reserved spend, settled spend, remaining budget, maximum run
reservation, measurement state, and a stable `reason_code`. The POST route
atomically reserves the configured maximum run cost before invoking any model,
then settles actual stored model cost or releases the reservation on failure.

## Source and Formula Rules

### Company Pulse

- Active work orders: reports whose current status is not `completed` or
  `cancelled`.
- Available workers: workers with `available = 1`.
- Satisfaction: average durable review rating for the selected period.
- SLA attainment: unavailable until an SLA deadline or policy ledger exists.
- Deflection rate: period reports with `severity_tag = 'diy'` divided by all
  period reports.
- First-time-fix: average of non-null `first_time_fix` observations.
- Diagnosis accuracy: average of non-null `diagnosis_correct` observations.
- Revenue: paid order amount for the selected period, converted from the
  persisted minor unit to CNY (`SUM(amount) / 100`).
- Gross margin: `(paid revenue - AI token cost in CNY) / paid revenue`.
  With zero revenue, gross margin is unavailable.

### Six-Stage Operating Loop

Each report is classified once using the same status mapping as
`getReportOperatingStageId`:

- `pending` -> `intake`
- `failed_analysis`, `flagged_for_review` -> `diagnosis`
- `analyzed`, `failed_planning` -> `deflection`
- `planned`, `matching`, `broadcasted`, `matched` -> `dispatch`
- `in_progress` -> `verification`
- `completed`, `cancelled` -> `reporting`

Unknown and null statuses fall back to Intake. `severity_tag = 'diy'` remains
the source for the deflection-rate KPI, but it does not override the report's
current operating stage. The backend may mirror `getReportOperatingStageId`
but must cover the same statuses. Failed analysis and failed planning records
contribute to their mapped stage's exception count. Cancelled records
contribute to Reporting volume and exceptions. The current schema does not
contain stage-transition events, so conversion and per-stage cycle time remain
unavailable instead of being inferred from current inventory.

### Strategic Dimensions

- TAM: unavailable until a durable validated research-run source exists.
- 10X: estimated score from deflection rate (40%), diagnosis accuracy (35%),
  and first-time-fix rate (25%), divided by ten. All inputs are required.
- Team: estimated score from worker availability rate (30%),
  first-time-fix rate (40%), and satisfaction normalized to 100% (30%).
  All inputs are required.
- Financials: estimated score from gross margin (60%) and inference efficiency
  `(1 - AI cost / revenue)` (40%), divided by ten. Positive revenue is required.
- Every score is clamped to `0..10` and exposes its formula version.

### Strategy Alerts

Alerts are deterministic and advisory:

- Quality warning: diagnosis accuracy below 85%.
- First-fix warning: first-time-fix below 80%.
- Workforce warning: more than three active work orders per available worker.
- Financial warning: gross margin below 60%.
- Critical alert: one or more current failed-analysis or failed-planning
  exceptions.

Recruitment, spending, dispatch, customer communication, and financial actions
set `requires_human_approval: true`.

### Agent and System Telemetry

Phase 1 derives agent identity from `ai_usage_logs.endpoint` using a
version-controlled endpoint registry. Calls, tokens, cost, latency, model, and
last activity are measured from that durable ledger. Success rate and p95
latency are unavailable unless the ledger contains the required observations.

Status is derived from last activity:

- `online`: within 15 minutes
- `idle`: over 15 minutes and within 24 hours
- `offline`: over 24 hours or no activity

System throughput, success rate, and average response latency come from the
current process metrics store. Historical `samples`, p95, and configured
capacity utilization remain unavailable until durable sampling exists.

### Market Intelligence and Efficiency

Market research is never started by a GET request or page load. The UI uses the
existing explicit `POST /api/v1/ai/research-market` action. Because research
history is not yet durable, `intelligence.latest` is null until a successful
user-triggered result is held in page state.

Efficiency topology values are returned only when all required timing
categories and a declared baseline are observable. Missing coordination,
idle, or baseline measurements remain unavailable; the UI must not substitute
the screenshot's example `60/25/15` values.
