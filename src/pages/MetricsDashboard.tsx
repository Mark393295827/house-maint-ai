import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    Bot,
    CircleDollarSign,
    Database,
    LayoutDashboard,
    RefreshCw,
    Search,
    Workflow,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
    AgentOperations,
    AnalyticsDataAtlas,
    CompanyPulse,
    EfficiencyTopology,
    MarketIntelligence,
    OperatingLoopHealth,
    StrategicDimensions,
    StrategyAlerts,
    SystemLoad,
    type AnalyticsValueCopy,
    type CompanyPulseMetricId,
    type LatestResearchSummary,
    type OperatingStageId,
    type StrategicDimensionId,
} from '../components/enterprise/analytics';
import { useLanguage } from '../i18n/LanguageContext';
import {
    getAiEconomics,
    getCompanyAnalyticsOverview,
    getMarketResearchPreflight,
    runMarketResearch,
    type AiEconomicsBreakdown,
    type AiEconomicsMetrics,
    type AiEconomicsRange,
    type CompanyAnalyticsMetric,
    type CompanyAnalyticsOverview,
    type MarketResearchPreflight,
    type MarketResearchReport,
} from '../services/api';
import '../enterprise-analytics.css';

interface TrendPoint {
    label: string;
    totalTokens: number;
    outputTokens: number;
}

const RANGE_DAYS: Record<AiEconomicsRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

const VALID_STAGES = new Set<OperatingStageId>([
    'intake',
    'diagnosis',
    'deflection',
    'dispatch',
    'verification',
    'reporting',
]);

const PULSE_METRIC_IDS = new Set<CompanyPulseMetricId>([
    'active_work_orders',
    'available_workers',
    'satisfaction',
    'sla_attainment_pct',
    'deflection_rate_pct',
    'first_time_fix_rate_pct',
    'diagnosis_accuracy_pct',
    'revenue_cny',
    'gross_margin_pct',
    'estimated_ai_value_cny',
]);

const ANALYTICS_SECTION_NAV = [
    { id: 'overview', key: 'navigation.overview', icon: LayoutDashboard },
    { id: 'visualizations', key: 'navigation.visualizations', icon: BarChart3 },
    { id: 'operations', key: 'navigation.operations', icon: Workflow },
    { id: 'ai-agents', key: 'navigation.aiAgents', icon: Bot },
    { id: 'economics', key: 'navigation.economics', icon: CircleDollarSign },
    { id: 'intelligence', key: 'navigation.intelligence', icon: Search },
    { id: 'evidence', key: 'navigation.evidence', icon: Database },
] as const;

const reasonKeyForSource = (source: string): string => {
    if (source === 'sla_policy_ledger') return 'unavailableReasons.slaPolicyMissing';
    if (source === 'stage_transition_events') return 'unavailableReasons.transitionHistoryMissing';
    if (source === 'agent_run_outcomes') return 'unavailableReasons.graphReceiptsMissing';
    if (source === 'ops_metric_samples') return 'unavailableReasons.historicalSamplesMissing';
    if (source === 'system_capacity') return 'unavailableReasons.capacityMissing';
    if (source === 'research_runs') return 'unavailableReasons.validatedResearchMissing';
    if (source === 'efficiency_telemetry') return 'unavailableReasons.timingCategoriesMissing';
    if (source.includes('efficiency_baseline')) return 'unavailableReasons.baselineMissing';
    if (source.includes('first_time_fix')) return 'unavailableReasons.noActivity';
    if (source.includes('diagnosis_correct')) return 'unavailableReasons.noActivity';
    if (source.includes('severity_tag')) return 'unavailableReasons.noActivity';
    if (source.includes('reviews.rating')) return 'unavailableReasons.noActivity';
    if (source.includes('orders.amount_minor')) return 'unavailableReasons.positiveRevenueRequired';
    if (source.includes('duration_ms')) return 'unavailableReasons.noActivity';
    if (source.includes('ai_usage_logs')) return 'unavailableReasons.telemetryObservationsMissing';
    return 'unavailableReasons.sourceUnavailable';
};

const localizeOverviewReasons = (
    overview: CompanyAnalyticsOverview,
    translate: (key: string) => string,
): CompanyAnalyticsOverview => {
    const localizeValue = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(localizeValue);
        }
        if (!value || typeof value !== 'object') {
            return value;
        }

        const record = value as Record<string, unknown>;
        const localized = Object.fromEntries(
            Object.entries(record).map(([key, entry]) => [key, localizeValue(entry)]),
        );
        if (
            record.measurement === 'unavailable'
            && typeof record.source === 'string'
            && 'reason' in record
        ) {
            localized.reason = translate(reasonKeyForSource(record.source));
        }
        return localized;
    };

    const localized = localizeValue(overview) as CompanyAnalyticsOverview;
    localized.meta.access_issues = overview.meta.access_issues.map((issue) => ({
        source: issue.source,
        message: translate(reasonKeyForSource(issue.source)),
    }));
    if (localized.intelligence.measurement === 'unavailable') {
        localized.intelligence.reason = translate(
            'unavailableReasons.validatedResearchMissing',
        );
    }
    return localized;
};

const buildTrend = (
    range: AiEconomicsRange,
    daily: AiEconomicsMetrics['daily'],
    locale: string,
): TrendPoint[] => {
    const days = RANGE_DAYS[range];
    const targetPoints = range === '7d' ? 7 : range === '30d' ? 10 : 12;
    const chunkSize = Math.ceil(days / targetPoints);
    const usageByDate = new Map(daily.map((point) => [point.date, point]));
    const points: Array<TrendPoint & { date: Date }> = [];
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days + 1);

    for (let index = 0; index < days; index += 1) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + index);
        const key = date.toISOString().slice(0, 10);
        const usage = usageByDate.get(key);
        points.push({
            date,
            label: new Intl.DateTimeFormat(locale, {
                month: 'numeric',
                day: 'numeric',
                timeZone: 'UTC',
            }).format(date),
            totalTokens: usage?.total_tokens || 0,
            outputTokens: usage?.output_tokens || 0,
        });
    }

    const grouped: TrendPoint[] = [];
    for (let index = 0; index < points.length; index += chunkSize) {
        const chunk = points.slice(index, index + chunkSize);
        grouped.push({
            label: chunk[chunk.length - 1].label,
            totalTokens: chunk.reduce((sum, point) => sum + point.totalTokens, 0),
            outputTokens: chunk.reduce((sum, point) => sum + point.outputTokens, 0),
        });
    }
    return grouped;
};

const PanelHeader: React.FC<{
    title: string;
    subtitle: string;
    badge?: string;
}> = ({ title, subtitle, badge }) => (
    <header className="analytics-panel-header">
        <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
        </div>
        {badge && <span className="analytics-panel-badge">{badge}</span>}
    </header>
);

const toLatestResearchSummary = (
    report: MarketResearchReport,
    focus: string,
    elapsedMs: number,
): LatestResearchSummary => {
    const checklist = [
        ['incremental_demand', report.go_no_go.incremental_demand],
        ['ten_x_possibility', report.go_no_go.tenx_possibility],
        ['competitive_moat', report.go_no_go.competitive_moat],
    ] as const;

    return {
        id: `research-${report.generated_at}`,
        sector: report.sector,
        focus: focus.trim() || null,
        generated_at: report.generated_at,
        measurement: 'estimated',
        verdict: report.go_no_go.overall_verdict,
        executive_summary: report.executive_summary,
        evidence_count: {
            value: report.pain_points.top_complaints.length + checklist.length,
            unit: 'count',
            measurement: 'measured',
            sample_size: report.pain_points.top_complaints.length + checklist.length,
            source: 'research_swarm_response',
            reason: null,
        },
        run_duration: {
            value: Math.round(elapsedMs),
            unit: 'milliseconds',
            measurement: 'estimated',
            sample_size: 1,
            source: 'browser_request_elapsed',
            reason: null,
        },
        validation: checklist.map(([id, result]) => ({
            id,
            status: result.pass ? 'passed' : 'failed',
            measurement: 'estimated',
            detail: result.evidence,
        })),
    };
};

const MetricsDashboard: React.FC = () => {
    const { t, locale } = useLanguage();
    const localeCode = locale === 'zh' ? 'zh-CN' : 'en-US';
    const analyticsText = (key: string, params?: Record<string, string | number>) => (
        t(`enterprise.analytics.${key}`, params)
    );
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedRange = searchParams.get('range');
    const range: AiEconomicsRange = requestedRange && requestedRange in RANGE_DAYS
        ? requestedRange as AiEconomicsRange
        : '30d';
    const requestedStage = searchParams.get('stage');
    const selectedStage = requestedStage && VALID_STAGES.has(requestedStage as OperatingStageId)
        ? requestedStage as OperatingStageId
        : null;
    const requestedMetric = searchParams.get('metric');
    const selectedPulseMetric = requestedMetric
        && PULSE_METRIC_IDS.has(requestedMetric as CompanyPulseMetricId)
        ? requestedMetric as CompanyPulseMetricId
        : null;

    const [refreshKey, setRefreshKey] = useState(0);
    const [overview, setOverview] = useState<CompanyAnalyticsOverview | null>(null);
    const [economics, setEconomics] = useState<AiEconomicsMetrics | null>(null);
    const [researchPreflight, setResearchPreflight] = useState<MarketResearchPreflight | null>(null);
    const [overviewError, setOverviewError] = useState(false);
    const [economicsError, setEconomicsError] = useState(false);
    const [researchPreflightError, setResearchPreflightError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sector, setSector] = useState(
        locale === 'zh' ? '本地家政物业维修' : 'Local property maintenance',
    );
    const [focus, setFocus] = useState(
        locale === 'zh' ? '运营效率与需求缺口' : 'Operating efficiency and demand gaps',
    );
    const [latestResearch, setLatestResearch] = useState<LatestResearchSummary | null>(null);
    const [researchError, setResearchError] = useState(false);
    const [isResearchRunning, setIsResearchRunning] = useState(false);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setOverviewError(false);
        setEconomicsError(false);
        setResearchPreflightError(false);
        setOverview(null);
        setEconomics(null);
        setResearchPreflight(null);

        Promise.allSettled([
            getCompanyAnalyticsOverview(range),
            getAiEconomics(range),
            getMarketResearchPreflight(),
        ]).then(([overviewResult, economicsResult, preflightResult]) => {
            if (!active) return;

            if (overviewResult.status === 'fulfilled') {
                setOverview(overviewResult.value);
            } else {
                setOverviewError(true);
            }

            if (economicsResult.status === 'fulfilled') {
                setEconomics(economicsResult.value);
            } else {
                setEconomicsError(true);
            }

            if (preflightResult.status === 'fulfilled') {
                setResearchPreflight(preflightResult.value);
            } else {
                setResearchPreflightError(true);
            }
        }).finally(() => {
            if (active) setIsLoading(false);
        });

        return () => {
            active = false;
        };
    }, [range, refreshKey]);

    const numberFormatter = useMemo(() => new Intl.NumberFormat(
        localeCode,
        { maximumFractionDigits: 1 },
    ), [localeCode]);
    const compactFormatter = useMemo(() => new Intl.NumberFormat(
        localeCode,
        { notation: 'compact', maximumFractionDigits: 1 },
    ), [localeCode]);
    const currencyFormatter = useMemo(() => new Intl.NumberFormat(
        localeCode,
        { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 },
    ), [localeCode]);

    const valueCopy: AnalyticsValueCopy = {
        measurementLabels: {
            measured: analyticsText('measurement.measured'),
            estimated: analyticsText('measurement.estimated'),
            unavailable: analyticsText('measurement.unavailable'),
        },
        unavailableValue: analyticsText('measurement.na'),
    };
    const stageLabels: Record<OperatingStageId, string> = {
        intake: analyticsText('operatingLoop.stages.intake.label'),
        diagnosis: analyticsText('operatingLoop.stages.diagnosis.label'),
        deflection: analyticsText('operatingLoop.stages.deflection.label'),
        dispatch: analyticsText('operatingLoop.stages.dispatch.label'),
        verification: analyticsText('operatingLoop.stages.verification.label'),
        reporting: analyticsText('operatingLoop.stages.reporting.label'),
    };
    const pulseMetricLabels: Record<CompanyPulseMetricId, string> = {
        active_work_orders: analyticsText('pulse.metrics.activeWorkOrders.label'),
        available_workers: analyticsText('pulse.metrics.availableWorkers.label'),
        satisfaction: analyticsText('pulse.metrics.satisfaction.label'),
        sla_attainment_pct: analyticsText('pulse.metrics.slaAttainment.label'),
        deflection_rate_pct: analyticsText('pulse.metrics.diyDeflectionRate.label'),
        first_time_fix_rate_pct: analyticsText('pulse.metrics.firstTimeFixRate.label'),
        diagnosis_accuracy_pct: analyticsText('pulse.metrics.diagnosisAccuracy.label'),
        revenue_cny: analyticsText('pulse.metrics.revenue.label'),
        gross_margin_pct: analyticsText('pulse.metrics.grossMargin.label'),
        estimated_ai_value_cny: analyticsText('pulse.metrics.estimatedAiValue.label'),
    };
    const strategicDimensionLabels: Record<StrategicDimensionId, string> = {
        tam: analyticsText('strategy.dimensions.tam.label'),
        ten_x: analyticsText('strategy.dimensions.tenX.label'),
        team: analyticsText('strategy.dimensions.team.label'),
        financials: analyticsText('strategy.dimensions.financials.label'),
    };

    const updateScope = (key: 'range' | 'stage' | 'metric', value: string | null) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (value) next.set(key, value);
            else next.delete(key);
            return next;
        }, { replace: true });
    };

    const handleSelectPulseMetric = (metricId: CompanyPulseMetricId) => {
        updateScope('metric', metricId);
        document.getElementById('evidence')?.scrollIntoView?.({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleRunResearch = async () => {
        if (!sector.trim() || isResearchRunning || !researchPreflight?.allowed) return;
        setIsResearchRunning(true);
        setResearchError(false);
        const startedAt = performance.now();

        try {
            const report = await runMarketResearch({
                sector: sector.trim(),
                focusArea: focus.trim() || undefined,
                locale,
            });
            setLatestResearch(toLatestResearchSummary(
                report,
                focus,
                performance.now() - startedAt,
            ));
        } catch {
            setResearchError(true);
        } finally {
            try {
                setResearchPreflight(await getMarketResearchPreflight());
            } catch {
                setResearchPreflightError(true);
            }
            setIsResearchRunning(false);
        }
    };

    const displayOverview = overview
        ? localizeOverviewReasons(overview, analyticsText)
        : null;
    const totals = economics?.totals;
    const unavailableComparison = (
        unit: CompanyAnalyticsMetric['unit'],
    ): CompanyAnalyticsMetric => ({
        value: null,
        unit,
        measurement: 'unavailable',
        sample_size: 0,
        source: 'previous_period_comparison',
        reason: analyticsText('unavailableReasons.outsideSelectedRange'),
    });
    const aiValueMetric: CompanyAnalyticsMetric = {
        value: totals?.estimated_business_value_cny ?? null,
        unit: 'cny',
        measurement: totals ? 'estimated' : 'unavailable',
        sample_size: totals?.calls ?? 0,
        source: 'ai_economics.endpoint_value_model',
        reason: totals
            ? null
            : analyticsText('unavailableReasons.economicsUnavailable'),
    };
    const pulseData = displayOverview
        ? {
            ...displayOverview.pulse,
            estimated_ai_value_cny: aiValueMetric,
        }
        : null;
    const selectedMetricData = selectedPulseMetric && pulseData
        ? pulseData[selectedPulseMetric]
        : null;
    const trend = useMemo(
        () => economics ? buildTrend(range, economics.daily, localeCode) : [],
        [economics, localeCode, range],
    );
    const maxTrend = Math.max(...trend.map((point) => point.totalTokens), 1);
    const inputShare = totals && totals.total_tokens > 0
        ? (totals.input_tokens / totals.total_tokens) * 100
        : null;
    const outputShare = totals && totals.total_tokens > 0
        ? totals.output_share_pct
        : null;
    const roiDisplay = totals?.zero_cost_usage && totals.estimated_business_value_cny > 0
        ? '∞'
        : totals?.return_on_inference !== null && totals?.return_on_inference !== undefined
            ? `${numberFormatter.format(totals.return_on_inference)}×`
            : '—';
    const ratioDisplay = totals?.total_to_output_ratio
        ? `${numberFormatter.format(totals.total_to_output_ratio)} : 1`
        : '—';
    const generatedAtValue = displayOverview?.meta.generated_at || economics?.period.generated_at;
    const generatedAt = generatedAtValue
        ? new Intl.DateTimeFormat(localeCode, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(generatedAtValue))
        : null;
    const isPartial = overviewError
        || economicsError
        || displayOverview?.meta.freshness === 'partial';
    const accessIssues = [
        ...(displayOverview?.meta.access_issues || []),
        ...(overviewError ? [{
            source: 'company_overview',
            message: analyticsText('states.errorBody'),
        }] : []),
        ...(economicsError ? [{
            source: 'ai_economics',
            message: analyticsText('unavailableReasons.economicsUnavailable'),
        }] : []),
    ];
    const researchBudgetReason = researchPreflight?.reason_code
        ? analyticsText('intelligence.budget.approvalRequired')
        : researchPreflightError
            ? analyticsText('unavailableReasons.sourceUnavailable')
            : null;
    const researchBudgetState = {
        state: researchPreflight?.state || 'unavailable',
        measurement: researchPreflight?.measurement || 'unavailable',
        reason: researchBudgetReason,
    } as const;
    const researchCostEstimate: CompanyAnalyticsMetric = {
        value: researchPreflight?.estimated_run_cost_cny ?? null,
        unit: 'cny',
        measurement: researchPreflight?.measurement || 'unavailable',
        sample_size: researchPreflight?.measurement === 'measured' ? 1 : 0,
        source: 'research_budget_reservations',
        reason: researchBudgetReason,
    };
    const selectedMetricValue = selectedMetricData?.value === null
        || selectedMetricData?.value === undefined
        ? analyticsText('measurement.na')
        : selectedMetricData.unit === 'cny'
            ? currencyFormatter.format(selectedMetricData.value)
            : selectedMetricData.unit === 'percent'
                ? `${numberFormatter.format(selectedMetricData.value)}%`
                : numberFormatter.format(selectedMetricData.value);

    const renderModelRows = (rows: AiEconomicsBreakdown[]) => {
        if (rows.length === 0) {
            return (
                <tr>
                    <td colSpan={6} className="analytics-table-empty">
                        {analyticsText('states.noEconomics')}
                    </td>
                </tr>
            );
        }

        return rows.map((row) => (
            <tr key={row.key}>
                <td><strong className="analytics-model-name">{row.key}</strong></td>
                <td>{numberFormatter.format(row.calls)}</td>
                <td>
                    <span className="analytics-token-mix">
                        {compactFormatter.format(row.input_tokens)} / {compactFormatter.format(row.output_tokens)}
                    </span>
                </td>
                <td>{row.total_tokens > 0 ? `${numberFormatter.format(row.output_share_pct)}%` : '—'}</td>
                <td>{currencyFormatter.format(row.cost_cny)}</td>
                <td>{numberFormatter.format(row.avg_duration_ms)} ms</td>
            </tr>
        ));
    };

    return (
        <section
            className="analytics-google analytics-google-operations page-enter"
            aria-labelledby="enterprise-analytics-title"
        >
            <header className="analytics-page-header">
                <div className="analytics-page-heading">
                    <span className="analytics-page-mark" aria-hidden="true">
                        <BarChart3 size={22} />
                    </span>
                    <div className="analytics-page-copy">
                        <p>{analyticsText('page.eyebrow')}</p>
                        <h1 id="enterprise-analytics-title">{analyticsText('page.title')}</h1>
                        <span>{analyticsText('page.subtitle')}</span>
                    </div>
                </div>

                <div className="analytics-page-controls">
                    <div
                        className="analytics-range-control"
                        role="group"
                        aria-label={analyticsText('accessibility.rangeFilter')}
                    >
                        {(Object.keys(RANGE_DAYS) as AiEconomicsRange[]).map((item) => (
                            <button
                                type="button"
                                key={item}
                                aria-pressed={range === item}
                                onClick={() => updateScope('range', item)}
                            >
                                {analyticsText(`filters.ranges.${item}`)}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="analytics-refresh-button"
                        onClick={() => setRefreshKey((value) => value + 1)}
                        disabled={isLoading}
                        aria-label={isLoading
                            ? analyticsText('accessibility.refreshingAnalytics')
                            : analyticsText('accessibility.refreshAnalytics')}
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                        <span>{isLoading
                            ? analyticsText('filters.refreshing')
                            : analyticsText('filters.refresh')}</span>
                    </button>
                </div>

                <div className="analytics-source-line" aria-live="polite">
                    <span
                        className={`analytics-source-status${isPartial ? ' is-partial' : ''}${overviewError && economicsError ? ' is-error' : ''}`}
                    >
                        <span aria-hidden="true" />
                        {isLoading
                            ? analyticsText('states.loadingTitle')
                            : overviewError && economicsError
                                ? analyticsText('measurement.unavailable')
                                : isPartial
                                    ? analyticsText('freshness.partial')
                                    : analyticsText('freshness.live')}
                    </span>
                    {generatedAt && <span>{analyticsText('metadata.generatedAt')}: {generatedAt}</span>}
                    {displayOverview?.meta.formula_version && (
                        <span>
                            {analyticsText('metadata.formulaVersion')}: {displayOverview.meta.formula_version}
                        </span>
                    )}
                </div>
            </header>

            <nav
                className="analytics-section-nav"
                aria-label={analyticsText('accessibility.sectionNavigation')}
            >
                {ANALYTICS_SECTION_NAV.map(({ id, key, icon: Icon }) => (
                    <a href={`#${id}`} key={id}>
                        <Icon size={15} aria-hidden="true" />
                        <span>{analyticsText(key)}</span>
                    </a>
                ))}
            </nav>

            {accessIssues.length > 0 && (
                <div className="analytics-access-issues" role="status">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <details>
                        <summary>
                            <strong>{analyticsText('states.partialTitle')}</strong>
                            <span>{accessIssues.length}</span>
                        </summary>
                        <ul>
                            {accessIssues.map((issue) => (
                                <li key={`${issue.source}-${issue.message}`}>
                                    <b>{issue.source}</b>: {issue.message}
                                </li>
                            ))}
                        </ul>
                    </details>
                </div>
            )}

            {displayOverview && pulseData ? (
                <>
                    <CompanyPulse
                        className="analytics-pulse-domain"
                        id="overview"
                        data={pulseData}
                        metricOrder={[
                            'active_work_orders',
                            'sla_attainment_pct',
                            'deflection_rate_pct',
                            'first_time_fix_rate_pct',
                            'estimated_ai_value_cny',
                            'gross_margin_pct',
                        ]}
                        context={{
                            active_work_orders: {
                                comparison: unavailableComparison('count'),
                                freshness: {
                                    value: generatedAt,
                                    measurement: generatedAt ? 'measured' : 'unavailable',
                                    reason: generatedAt
                                        ? null
                                        : analyticsText('unavailableReasons.missingValue'),
                                },
                            },
                            sla_attainment_pct: {
                                comparison: unavailableComparison('percent'),
                                freshness: {
                                    value: generatedAt,
                                    measurement: generatedAt ? 'measured' : 'unavailable',
                                },
                            },
                            deflection_rate_pct: {
                                comparison: unavailableComparison('percent'),
                                target: {
                                    value: 20,
                                    unit: 'percent',
                                    measurement: 'estimated',
                                    sample_size: 0,
                                    source: 'operating_model_target',
                                    reason: null,
                                },
                                freshness: {
                                    value: generatedAt,
                                    measurement: generatedAt ? 'measured' : 'unavailable',
                                },
                            },
                            first_time_fix_rate_pct: {
                                comparison: unavailableComparison('percent'),
                                target: {
                                    value: 80,
                                    unit: 'percent',
                                    measurement: 'estimated',
                                    sample_size: 0,
                                    source: 'company_analytics_policy_target',
                                    reason: null,
                                },
                                freshness: {
                                    value: generatedAt,
                                    measurement: generatedAt ? 'measured' : 'unavailable',
                                },
                            },
                            estimated_ai_value_cny: {
                                comparison: unavailableComparison('cny'),
                                freshness: {
                                    value: generatedAt,
                                    measurement: generatedAt ? 'measured' : 'unavailable',
                                },
                            },
                            gross_margin_pct: {
                                comparison: unavailableComparison('percent'),
                                target: {
                                    value: 60,
                                    unit: 'percent',
                                    measurement: 'estimated',
                                    sample_size: 0,
                                    source: 'company_analytics_policy_target',
                                    reason: null,
                                },
                                freshness: {
                                    value: generatedAt,
                                    measurement: generatedAt ? 'measured' : 'unavailable',
                                },
                            },
                        }}
                        valueCopy={valueCopy}
                        locale={localeCode}
                        copy={{
                            title: analyticsText('pulse.title'),
                            description: analyticsText('pulse.subtitle'),
                            metricLabels: pulseMetricLabels,
                            comparisonLabel: analyticsText('metadata.previousPeriod'),
                            targetLabel: analyticsText('metadata.target'),
                            freshnessLabel: analyticsText('metadata.freshness'),
                            selectMetricLabel: analyticsText('pulse.metricAction'),
                        }}
                        onSelectMetric={(metricId) => handleSelectPulseMetric(metricId)}
                    />

                    <AnalyticsDataAtlas
                        className="analytics-domain analytics-visualization-domain"
                        id="visualizations"
                        overview={displayOverview}
                        pulse={pulseData}
                        economics={economics}
                        locale={localeCode}
                        stageLabels={stageLabels}
                        pulseLabels={pulseMetricLabels}
                        strategyLabels={strategicDimensionLabels}
                        copy={{
                            title: analyticsText('dataAtlas.title'),
                            description: analyticsText('dataAtlas.description'),
                            inventoryTitle: analyticsText('dataAtlas.inventoryTitle'),
                            inventoryLabels: {
                                metrics: analyticsText('dataAtlas.inventory.metrics'),
                                stages: analyticsText('dataAtlas.inventory.stages'),
                                agents: analyticsText('dataAtlas.inventory.agents'),
                                samples: analyticsText('dataAtlas.inventory.samples'),
                                days: analyticsText('dataAtlas.inventory.days'),
                                models: analyticsText('dataAtlas.inventory.models'),
                                endpoints: analyticsText('dataAtlas.inventory.endpoints'),
                            },
                            coverageTitle: analyticsText('dataAtlas.coverageTitle'),
                            coverageDescription: analyticsText('dataAtlas.coverageDescription'),
                            measurementLabels: valueCopy.measurementLabels,
                            charts: {
                                stageVolume: analyticsText('dataAtlas.charts.stageVolume'),
                                stagePerformance: analyticsText('dataAtlas.charts.stagePerformance'),
                                pulseRates: analyticsText('dataAtlas.charts.pulseRates'),
                                strategyScores: analyticsText('dataAtlas.charts.strategyScores'),
                                agentTokens: analyticsText('dataAtlas.charts.agentTokens'),
                                agentRuntime: analyticsText('dataAtlas.charts.agentRuntime'),
                                systemLoad: analyticsText('dataAtlas.charts.systemLoad'),
                                tokenTimeline: analyticsText('dataAtlas.charts.tokenTimeline'),
                                modelEconomics: analyticsText('dataAtlas.charts.modelEconomics'),
                                endpointValue: analyticsText('dataAtlas.charts.endpointValue'),
                            },
                            series: {
                                volume: analyticsText('dataAtlas.series.volume'),
                                exceptions: analyticsText('dataAtlas.series.exceptions'),
                                conversion: analyticsText('dataAtlas.series.conversion'),
                                cycleTime: analyticsText('dataAtlas.series.cycleTime'),
                                actual: analyticsText('dataAtlas.series.actual'),
                                score: analyticsText('dataAtlas.series.score'),
                                inputTokens: analyticsText('dataAtlas.series.inputTokens'),
                                outputTokens: analyticsText('dataAtlas.series.outputTokens'),
                                calls: analyticsText('dataAtlas.series.calls'),
                                averageLatency: analyticsText('dataAtlas.series.averageLatency'),
                                throughput: analyticsText('dataAtlas.series.throughput'),
                                successRate: analyticsText('dataAtlas.series.successRate'),
                                cost: analyticsText('dataAtlas.series.cost'),
                                businessValue: analyticsText('dataAtlas.series.businessValue'),
                            },
                            noData: analyticsText('dataAtlas.noData'),
                            zeroData: analyticsText('dataAtlas.zeroData'),
                        }}
                    />

                    <section
                        className="analytics-module-grid analytics-domain analytics-operations-domain"
                        id="operations"
                        aria-label={analyticsText('navigation.operations')}
                    >
                        <OperatingLoopHealth
                            className="analytics-grid-span-12"
                            stages={displayOverview.operating_loop}
                            selectedStage={selectedStage}
                            onSelectStage={(stage) => updateScope(
                                'stage',
                                selectedStage === stage ? null : stage,
                            )}
                            valueCopy={valueCopy}
                            locale={localeCode}
                            copy={{
                                title: analyticsText('operatingLoop.title'),
                                description: analyticsText('operatingLoop.subtitle'),
                                stageLabels,
                                currentVolumeLabel: analyticsText('operatingLoop.fields.currentVolume'),
                                conversionLabel: analyticsText('operatingLoop.fields.conversionToNext'),
                                cycleTimeLabel: analyticsText('operatingLoop.fields.medianCycleTime'),
                                exceptionsLabel: analyticsText('operatingLoop.fields.exceptionCount'),
                                selectStageLabel: analyticsText('operatingLoop.selectStage'),
                                emptyLabel: analyticsText('states.emptyBody'),
                            }}
                        />
                        <StrategyAlerts
                            className="analytics-grid-span-12 analytics-alert-strip"
                            alerts={selectedStage
                                ? displayOverview.alerts.filter((alert) => alert.stage === selectedStage)
                                : displayOverview.alerts}
                            valueCopy={valueCopy}
                            locale={localeCode}
                            copy={{
                                title: analyticsText('alerts.title'),
                                description: analyticsText('alerts.subtitle'),
                                severityLabels: {
                                    critical: analyticsText('alerts.severity.critical'),
                                    warning: analyticsText('alerts.severity.warning'),
                                    info: analyticsText('alerts.severity.info'),
                                },
                                ownerLabels: {
                                    operations: analyticsText('alerts.owners.operations'),
                                    finance: analyticsText('alerts.owners.finance'),
                                    workforce: analyticsText('alerts.owners.workforce'),
                                    quality: analyticsText('alerts.owners.quality'),
                                },
                                stageLabels,
                                comparatorLabels: {
                                    gt: analyticsText('alerts.comparators.gt'),
                                    gte: analyticsText('alerts.comparators.gte'),
                                    lt: analyticsText('alerts.comparators.lt'),
                                    lte: analyticsText('alerts.comparators.lte'),
                                },
                                metricLabels: {
                                    diagnosis_accuracy_pct: analyticsText('pulse.metrics.diagnosisAccuracy.label'),
                                    first_time_fix_rate_pct: analyticsText('pulse.metrics.firstTimeFixRate.label'),
                                    work_orders_per_available_worker: analyticsText('pulse.metrics.activeWorkOrders.label'),
                                    gross_margin_pct: analyticsText('pulse.metrics.grossMargin.label'),
                                    operating_failures: analyticsText('operatingLoop.fields.exceptionCount'),
                                },
                                recommendationLabels: {
                                    review_diagnosis_accuracy: analyticsText('alerts.recommendations.review_diagnosis_accuracy'),
                                    review_first_time_fix: analyticsText('alerts.recommendations.review_first_time_fix'),
                                    review_workforce_capacity: analyticsText('alerts.recommendations.review_workforce_capacity'),
                                    review_gross_margin: analyticsText('alerts.recommendations.review_gross_margin'),
                                    review_failed_analysis: analyticsText('alerts.recommendations.review_failed_analysis'),
                                    review_failed_planning: analyticsText('alerts.recommendations.review_failed_planning'),
                                    review_operating_exceptions: analyticsText('alerts.recommendations.review_operating_exceptions'),
                                },
                                thresholdLabel: analyticsText('metadata.threshold'),
                                generatedLabel: analyticsText('metadata.generatedAt'),
                                recommendationLabel: analyticsText('alerts.fields.recommendedAction'),
                                approvalLabels: {
                                    required: analyticsText('alerts.approval.required'),
                                    notRequired: analyticsText('alerts.approval.notRequired'),
                                },
                                noStageLabel: analyticsText('filters.allStages'),
                                openAlertLabel: analyticsText('alerts.actions.view'),
                                acknowledgeLabel: analyticsText('alerts.actions.acknowledge'),
                                emptyLabel: analyticsText('states.noAlerts'),
                            }}
                        />
                    </section>

                    <StrategicDimensions
                        className="analytics-strategy-domain"
                        dimensions={displayOverview.strategic_dimensions}
                        valueCopy={valueCopy}
                        locale={localeCode}
                        copy={{
                            title: analyticsText('strategy.title'),
                            description: analyticsText('strategy.subtitle'),
                            dimensionLabels: strategicDimensionLabels,
                            confidenceLabels: {
                                high: analyticsText('strategy.confidence.high'),
                                medium: analyticsText('strategy.confidence.medium'),
                                low: analyticsText('strategy.confidence.low'),
                                unavailable: analyticsText('strategy.confidence.unavailable'),
                            },
                            scoreLabel: analyticsText('strategy.fields.score'),
                            trendLabel: analyticsText('strategy.fields.trend'),
                            confidenceLabel: analyticsText('strategy.fields.confidence'),
                            formulaLabel: analyticsText('strategy.fields.formulaVersion'),
                            sourceLabel: analyticsText('strategy.fields.source'),
                            evidenceLabel: analyticsText('strategy.fields.evidence'),
                            selectDimensionLabel: analyticsText('metadata.viewEvidence'),
                            emptyLabel: analyticsText('strategy.minimumInputsMissing'),
                        }}
                    />

                    <section
                        className="analytics-module-grid analytics-domain analytics-ai-domain"
                        id="ai-agents"
                        aria-label={analyticsText('navigation.aiAgents')}
                    >
                        <AgentOperations
                            className="analytics-grid-span-12"
                            agents={displayOverview.agent_operations}
                            valueCopy={valueCopy}
                            locale={localeCode}
                            copy={{
                                title: analyticsText('agents.title'),
                                description: analyticsText('agents.subtitle'),
                                tableCaption: analyticsText('accessibility.dataTable'),
                                agentLabel: analyticsText('agents.fields.displayName'),
                                statusLabel: analyticsText('agents.fields.status'),
                                workflowLabel: analyticsText('agents.fields.workflowStage'),
                                modelsLabel: analyticsText('agents.fields.assignedModels'),
                                callsLabel: analyticsText('agents.fields.calls'),
                                tokensLabel: analyticsText('agents.fields.totalTokens'),
                                totalTokensLabel: analyticsText('agents.fields.totalTokens'),
                                inputTokensLabel: analyticsText('agents.fields.inputTokens'),
                                outputTokensLabel: analyticsText('agents.fields.outputTokens'),
                                costLabel: analyticsText('agents.fields.storedCost'),
                                latencyLabel: analyticsText('agents.fields.averageLatency'),
                                averageLatencyLabel: analyticsText('agents.fields.averageLatency'),
                                p95LatencyLabel: analyticsText('agents.fields.p95Latency'),
                                successLabel: analyticsText('agents.fields.successRate'),
                                lastActiveLabel: analyticsText('agents.fields.lastActivity'),
                                statusLabels: {
                                    online: analyticsText('agents.statuses.online'),
                                    idle: analyticsText('agents.statuses.idle'),
                                    offline: analyticsText('agents.statuses.offline'),
                                },
                                workflowLabels: {
                                    ...stageLabels,
                                    cross_stage: analyticsText('agents.crossStage'),
                                },
                                inspectAgentLabel: analyticsText('agents.openDetails'),
                                emptyLabel: analyticsText('states.noAgents'),
                            }}
                        />
                        <SystemLoad
                            className="analytics-grid-span-6"
                            data={displayOverview.system_load}
                            valueCopy={valueCopy}
                            locale={localeCode}
                            copy={{
                                title: analyticsText('systemLoad.title'),
                                description: analyticsText('systemLoad.subtitle'),
                                observationStartedLabel: analyticsText('systemLoad.fields.observationStartedAt'),
                                throughputLabel: analyticsText('systemLoad.fields.throughput'),
                                successRateLabel: analyticsText('systemLoad.fields.successRate'),
                                averageLatencyLabel: analyticsText('systemLoad.fields.averageLatency'),
                                p95LatencyLabel: analyticsText('systemLoad.fields.p95Latency'),
                                activeAgentsLabel: analyticsText('systemLoad.fields.activeAgents'),
                                utilizationLabel: analyticsText('systemLoad.fields.utilization'),
                                trendLabel: analyticsText('systemLoad.fields.trend'),
                                samplesTableCaption: analyticsText('accessibility.dataTable'),
                                timestampLabel: analyticsText('systemLoad.fields.timestamp'),
                                emptySamplesLabel: analyticsText('states.noSamples'),
                            }}
                        />
                        <EfficiencyTopology
                            className="analytics-grid-span-6"
                            data={displayOverview.efficiency}
                            baseline={{
                                model: null,
                                period: null,
                                measurement: 'unavailable',
                                reason: analyticsText('unavailableReasons.baselineMissing'),
                            }}
                            valueCopy={valueCopy}
                            locale={localeCode}
                            copy={{
                                title: analyticsText('efficiency.title'),
                                description: analyticsText('efficiency.subtitle'),
                                compositionLabel: analyticsText('efficiency.allocationTotal'),
                                categoryLabels: {
                                    aiCompute: analyticsText('efficiency.categories.aiCompute.label'),
                                    coordination: analyticsText('efficiency.categories.agentCoordination.label'),
                                    idle: analyticsText('efficiency.categories.systemIdle.label'),
                                },
                                costOptimizationLabel: analyticsText('efficiency.categories.costOptimization.label'),
                                baselineModelLabel: analyticsText('efficiency.fields.baselineModel'),
                                baselinePeriodLabel: analyticsText('efficiency.fields.baselinePeriod'),
                                compositionUnavailableLabel: analyticsText('efficiency.unavailableNote'),
                                openEvidenceLabel: analyticsText('metadata.viewEvidence'),
                            }}
                        />
                    </section>
                </>
            ) : isLoading ? (
                <div className="analytics-loading-panel" id="overview" role="status">
                    <RefreshCw size={20} aria-hidden="true" />
                    <div>
                        <strong>{analyticsText('states.loadingTitle')}</strong>
                        <span>{analyticsText('states.loadingBody')}</span>
                    </div>
                </div>
            ) : (
                <div className="analytics-empty-panel" id="overview">
                    <strong>{analyticsText('states.errorTitle')}</strong>
                    <span>{analyticsText('states.errorBody')}</span>
                </div>
            )}

            <section className="analytics-domain analytics-economics-domain" id="economics">
                <div className="analytics-section analytics-economics-grid">
                    <article className="analytics-panel analytics-vc-panel">
                    <PanelHeader
                        title={analyticsText('economics.vc.title')}
                        subtitle={analyticsText('economics.vc.subtitle')}
                        badge={analyticsText(
                            economics ? 'measurement.estimated' : 'measurement.unavailable',
                        )}
                    />
                    <div className="analytics-vc-metrics">
                        <div>
                            <span>{analyticsText('economics.metrics.estimatedBusinessValue')}</span>
                            <strong>{totals
                                ? currencyFormatter.format(totals.estimated_business_value_cny)
                                : '—'}</strong>
                        </div>
                        <div>
                            <span>{analyticsText('economics.metrics.actualTokenCost')}</span>
                            <strong>{totals ? currencyFormatter.format(totals.cost_cny) : '—'}</strong>
                        </div>
                        <div>
                            <span>{analyticsText('economics.metrics.returnOnInference')}</span>
                            <strong>{roiDisplay}</strong>
                            {totals?.zero_cost_usage && (
                                <small>{analyticsText('economics.noBillableCost')}</small>
                            )}
                        </div>
                        <div>
                            <span>{analyticsText('economics.metrics.inferenceCostToValue')}</span>
                            <strong>
                                {totals?.inference_to_value_pct !== null
                                    && totals?.inference_to_value_pct !== undefined
                                    ? `${numberFormatter.format(totals.inference_to_value_pct)}%`
                                    : '—'}
                            </strong>
                        </div>
                    </div>
                    </article>

                    <article className="analytics-panel analytics-token-panel">
                    <PanelHeader
                        title={analyticsText('economics.token.title')}
                        subtitle={analyticsText('economics.token.subtitle')}
                        badge={analyticsText(
                            economics ? 'measurement.measured' : 'measurement.unavailable',
                        )}
                    />
                    {totals ? (
                        <>
                            <div className="analytics-token-total">
                                <span>{analyticsText('economics.metrics.totalTokenConsumption')}</span>
                                <strong>{compactFormatter.format(totals.total_tokens)}</strong>
                            </div>
                            {totals.total_tokens > 0 && (
                                <div
                                    className="analytics-token-composition"
                                    role="img"
                                    aria-label={`${analyticsText('economics.metrics.inputTokens')} ${numberFormatter.format(inputShare ?? 0)}%, ${analyticsText('economics.metrics.outputTokens')} ${numberFormatter.format(outputShare ?? 0)}%`}
                                >
                                    <span
                                        className="is-input"
                                        style={{ width: `${Math.min(inputShare ?? 0, 100)}%` }}
                                    />
                                    <span
                                        className="is-output"
                                        style={{ width: `${Math.min(outputShare ?? 0, 100)}%` }}
                                    />
                                </div>
                            )}
                            <div className="analytics-token-legend">
                                <span>
                                    <i className="is-input" />
                                    {analyticsText('economics.metrics.inputTokens')} ·{' '}
                                    {compactFormatter.format(totals.input_tokens)}
                                </span>
                                <span>
                                    <i className="is-output" />
                                    {analyticsText('economics.metrics.outputTokens')} ·{' '}
                                    {compactFormatter.format(totals.output_tokens)}
                                </span>
                            </div>
                            <dl className="analytics-token-ratios">
                                <div>
                                    <dt>{analyticsText('economics.metrics.outputShare')}</dt>
                                    <dd>{totals.total_tokens
                                        ? `${numberFormatter.format(outputShare ?? 0)}%`
                                        : '—'}</dd>
                                </div>
                                <div title={analyticsText('economics.effectiveTotalNote')}>
                                    <dt>{analyticsText('economics.metrics.totalToOutputRatio')}</dt>
                                    <dd>{ratioDisplay}</dd>
                                </div>
                            </dl>
                            {totals.calls > 0 && totals.total_tokens === 0 && (
                                <p className="analytics-token-note">
                                    <AlertTriangle size={15} aria-hidden="true" />
                                    {analyticsText('unavailableReasons.zeroDenominator')}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="analytics-empty-inline">
                            {analyticsText('unavailableReasons.economicsUnavailable')}
                        </p>
                    )}
                    </article>
                </div>

                <div className="analytics-section analytics-insight-grid">
                    <article className="analytics-panel analytics-trend-panel">
                    <PanelHeader
                        title={analyticsText('economics.trendTitle')}
                        subtitle={analyticsText('economics.trendSubtitle')}
                    />
                    {economics ? (
                        <>
                            <div
                                className="analytics-trend-chart"
                                role="img"
                                aria-label={analyticsText('accessibility.tokenTrendChart')}
                            >
                                {trend.map((point) => {
                            const totalHeight = point.totalTokens > 0
                                ? Math.max((point.totalTokens / maxTrend) * 100, 3)
                                : 0;
                            const outputHeight = point.totalTokens > 0
                                ? (point.outputTokens / point.totalTokens) * 100
                                : 0;
                                    return (
                                        <div className="analytics-trend-column" key={point.label}>
                                            <div className="analytics-trend-value">
                                                {point.totalTokens > 0
                                                    ? compactFormatter.format(point.totalTokens)
                                                    : ''}
                                            </div>
                                            <div className="analytics-trend-track">
                                                <span
                                                    className="analytics-trend-total"
                                                    style={{ height: `${totalHeight}%` }}
                                                >
                                                    <i style={{ height: `${outputHeight}%` }} />
                                                </span>
                                            </div>
                                            <span>{point.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <table className="eam-sr-only">
                                <caption>{analyticsText('evidence.chartSummary')}</caption>
                                <thead>
                                    <tr>
                                        <th>{analyticsText('economics.fields.period')}</th>
                                        <th>{analyticsText('economics.metrics.totalTokenConsumption')}</th>
                                        <th>{analyticsText('economics.metrics.outputTokens')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trend.map((point) => (
                                        <tr key={point.label}>
                                            <th>{point.label}</th>
                                            <td>{numberFormatter.format(point.totalTokens)}</td>
                                            <td>{numberFormatter.format(point.outputTokens)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <p className="analytics-empty-inline">
                            {analyticsText('unavailableReasons.economicsUnavailable')}
                        </p>
                    )}
                    </article>

                    <article className="analytics-panel analytics-endpoint-panel">
                    <PanelHeader
                        title={analyticsText('economics.endpointTitle')}
                        subtitle={analyticsText('economics.endpointSubtitle')}
                    />
                    {(economics?.by_endpoint.length || 0) > 0 ? (
                        <div className="analytics-endpoint-list">
                            {economics?.by_endpoint.map((endpoint) => (
                                <div key={endpoint.key}>
                                    <div className="analytics-endpoint-main">
                                        <strong>{endpoint.key.replace(/^\/api\/(?:v1\/)?/, '/')}</strong>
                                        <span>
                                            {numberFormatter.format(endpoint.calls)}{' '}
                                            {analyticsText('economics.fields.calls')}
                                        </span>
                                    </div>
                                    <div className="analytics-endpoint-values">
                                        <span>
                                            {compactFormatter.format(endpoint.total_tokens)}{' '}
                                            {analyticsText('economics.metrics.totalTokenConsumption')}
                                        </span>
                                        <strong>
                                            {currencyFormatter.format(endpoint.estimated_business_value_cny)}
                                        </strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="analytics-empty-inline">{analyticsText('states.noEconomics')}</p>
                    )}
                    </article>
                </div>
            </section>

            <section
                className="analytics-module-grid analytics-domain analytics-intelligence-domain"
                id="intelligence"
                aria-label={analyticsText('navigation.intelligence')}
            >
                <div className="analytics-grid-span-12 analytics-research-stack">
                    <MarketIntelligence
                        intelligence={displayOverview?.intelligence || {
                            latest: null,
                            measurement: 'unavailable',
                            reason: analyticsText('unavailableReasons.researchHistoryMissing'),
                        }}
                        latestRun={latestResearch}
                        sector={sector}
                        focus={focus}
                        budgetState={researchBudgetState}
                        costEstimate={researchCostEstimate}
                        canRun={Boolean(sector.trim()) && Boolean(researchPreflight?.allowed)}
                        isRunning={isResearchRunning}
                        onSectorChange={setSector}
                        onFocusChange={setFocus}
                        onRun={handleRunResearch}
                        valueCopy={valueCopy}
                        locale={localeCode}
                        copy={{
                            title: analyticsText('intelligence.title'),
                            description: analyticsText('intelligence.subtitle'),
                            sectorLabel: analyticsText('intelligence.inputs.sector'),
                            sectorPlaceholder: analyticsText('intelligence.inputs.sectorPlaceholder'),
                            focusLabel: analyticsText('intelligence.inputs.focus'),
                            focusPlaceholder: analyticsText('intelligence.inputs.focusPlaceholder'),
                            costEstimateLabel: analyticsText('intelligence.inputs.costEstimate'),
                            budgetLabel: analyticsText('intelligence.inputs.budgetState'),
                            budgetStateLabels: {
                                available: analyticsText('intelligence.budget.withinBudget'),
                                blocked: analyticsText('intelligence.budget.exceeded'),
                                unavailable: analyticsText('intelligence.budget.unavailable'),
                            },
                            runLabel: analyticsText('intelligence.actions.execute'),
                            runningLabel: analyticsText('intelligence.actions.executing'),
                            historyLabel: analyticsText('intelligence.actions.viewHistory'),
                            latestResultLabel: analyticsText('intelligence.results.title'),
                            verdictLabel: analyticsText('intelligence.results.latestVerdict'),
                            summaryLabel: analyticsText('intelligence.results.executiveSummary'),
                            evidenceCountLabel: analyticsText('intelligence.results.evidenceCount'),
                            runDurationLabel: analyticsText('intelligence.results.runTime'),
                            generatedLabel: analyticsText('intelligence.results.completedAt'),
                            validationLabel: analyticsText('intelligence.validation.title'),
                            validationStatusLabels: {
                                passed: analyticsText('intelligence.validation.passed'),
                                failed: analyticsText('intelligence.validation.failed'),
                                pending: analyticsText('intelligence.validation.pending'),
                                unavailable: analyticsText('measurement.unavailable'),
                            },
                            validationAgentLabels: {
                                incremental_demand: analyticsText('intelligence.validation.agents.incrementalDemand'),
                                ten_x_possibility: analyticsText('intelligence.validation.agents.tenX'),
                                competitive_moat: analyticsText('intelligence.validation.agents.competitiveMoat'),
                            },
                            verdictLabels: {
                                GO: 'GO',
                                NO_GO: 'NO-GO',
                                NEEDS_MORE_DATA: analyticsText('states.partialTitle'),
                            },
                            noValidationLabel: analyticsText('intelligence.results.noResult'),
                        }}
                    />
                    {researchError && (
                        <p className="analytics-research-error" role="alert">
                            <AlertTriangle size={16} aria-hidden="true" />
                            {analyticsText('intelligence.executionBlocked')}
                        </p>
                    )}
                </div>
            </section>

            <section className="analytics-section analytics-domain analytics-evidence-domain" id="evidence">
                {selectedPulseMetric && selectedMetricData && (
                    <article className="analytics-panel analytics-evidence-detail" aria-live="polite">
                        <PanelHeader
                            title={`${analyticsText('evidence.title')} · ${pulseMetricLabels[selectedPulseMetric]}`}
                            subtitle={analyticsText('evidence.subtitle')}
                            badge={valueCopy.measurementLabels[selectedMetricData.measurement]}
                        />
                        <dl>
                            <div>
                                <dt>{analyticsText('metadata.currentValue')}</dt>
                                <dd>{selectedMetricValue}</dd>
                            </div>
                            <div>
                                <dt>{analyticsText('metadata.source')}</dt>
                                <dd>{selectedMetricData.source}</dd>
                            </div>
                            <div>
                                <dt>{analyticsText('metadata.sampleSize')}</dt>
                                <dd>{numberFormatter.format(selectedMetricData.sample_size)}</dd>
                            </div>
                            <div>
                                <dt>{analyticsText('metadata.reason')}</dt>
                                <dd>{selectedMetricData.reason || analyticsText('measurement.measured')}</dd>
                            </div>
                        </dl>
                    </article>
                )}
                <article className="analytics-panel analytics-table-panel">
                    <PanelHeader
                        title={analyticsText('economics.modelTitle')}
                        subtitle={analyticsText('economics.modelSubtitle')}
                    />
                    <div className="analytics-table-scroll" tabIndex={0}>
                        <table className="analytics-data-table">
                            <thead>
                                <tr>
                                    <th>{analyticsText('economics.fields.model')}</th>
                                    <th>{analyticsText('economics.fields.calls')}</th>
                                    <th>{analyticsText('economics.fields.tokenMix')}</th>
                                    <th>{analyticsText('economics.fields.outputShare')}</th>
                                    <th>{analyticsText('economics.fields.cost')}</th>
                                    <th>{analyticsText('economics.fields.latency')}</th>
                                </tr>
                            </thead>
                            <tbody>{renderModelRows(economics?.by_model || [])}</tbody>
                        </table>
                    </div>
                </article>
            </section>
        </section>
    );
};

export default MetricsDashboard;
