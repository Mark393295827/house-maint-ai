import { BarChart3 } from 'lucide-react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts';
import type {
    AiEconomicsMetrics,
    CompanyAnalyticsMetric,
    CompanyAnalyticsOverview,
} from '../../../services/api';
import {
    ModuleHeader,
    cx,
    useModuleHeadingId,
} from './shared';
import type {
    CompanyPulseData,
    CompanyPulseMetricId,
    MeasurementKind,
    OperatingStageId,
    StrategicDimensionId,
} from './types';

const CHART_COLORS = {
    primary: '#0b57d0',
    primarySoft: '#a8c7fa',
    positive: '#137333',
    positiveSoft: '#81c995',
    warning: '#b06000',
    critical: '#b3261e',
    neutral: '#747775',
    neutralSoft: '#c4c7c5',
};

const MEASUREMENT_COLORS: Record<MeasurementKind, string> = {
    measured: CHART_COLORS.positive,
    estimated: CHART_COLORS.warning,
    unavailable: CHART_COLORS.neutralSoft,
};

const AGENT_STATUS_COLORS = {
    online: CHART_COLORS.positive,
    idle: CHART_COLORS.warning,
    offline: CHART_COLORS.neutral,
};

const isChartValue = (metric: CompanyAnalyticsMetric | undefined): metric is CompanyAnalyticsMetric => (
    Boolean(metric)
    && metric?.value !== null
    && Number.isFinite(metric?.value)
    && metric?.measurement !== 'unavailable'
);

export interface AnalyticsDataAtlasCopy {
    title: string;
    description: string;
    inventoryTitle: string;
    inventoryLabels: {
        metrics: string;
        stages: string;
        agents: string;
        samples: string;
        days: string;
        models: string;
        endpoints: string;
    };
    coverageTitle: string;
    coverageDescription: string;
    measurementLabels: Record<MeasurementKind, string>;
    charts: {
        stageVolume: string;
        stagePerformance: string;
        pulseRates: string;
        strategyScores: string;
        agentTokens: string;
        agentRuntime: string;
        systemLoad: string;
        tokenTimeline: string;
        modelEconomics: string;
        endpointValue: string;
    };
    series: {
        volume: string;
        exceptions: string;
        conversion: string;
        cycleTime: string;
        actual: string;
        score: string;
        inputTokens: string;
        outputTokens: string;
        calls: string;
        averageLatency: string;
        throughput: string;
        successRate: string;
        cost: string;
        businessValue: string;
    };
    noData: string;
    zeroData: string;
}

export interface AnalyticsDataAtlasProps {
    id?: string;
    className?: string;
    overview: CompanyAnalyticsOverview;
    pulse: CompanyPulseData;
    economics: AiEconomicsMetrics | null;
    locale: string;
    stageLabels: Record<OperatingStageId, string>;
    pulseLabels: Record<CompanyPulseMetricId, string>;
    strategyLabels: Record<StrategicDimensionId, string>;
    copy: AnalyticsDataAtlasCopy;
}

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

function ChartCard({ title, children, className }: ChartCardProps) {
    return (
        <article className={cx('analytics-atlas-card', className)}>
            <header>
                <h3>{title}</h3>
            </header>
            {children}
        </article>
    );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
    return <div className="analytics-atlas-empty">{children}</div>;
}

export function AnalyticsDataAtlas({
    id,
    className,
    overview,
    pulse,
    economics,
    locale,
    stageLabels,
    pulseLabels,
    strategyLabels,
    copy,
}: AnalyticsDataAtlasProps) {
    const headingId = useModuleHeadingId(id, 'analytics-data-atlas');
    const compactNumber = new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
    });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const stageVolumeData = overview.operating_loop.map((stage) => ({
        name: stageLabels[stage.stage],
        volume: isChartValue(stage.current_volume) ? stage.current_volume.value : null,
        exceptions: isChartValue(stage.exception_count) ? stage.exception_count.value : null,
    }));
    const stagePerformanceData = overview.operating_loop.map((stage) => ({
        name: stageLabels[stage.stage],
        conversion: isChartValue(stage.conversion_to_next_pct)
            ? stage.conversion_to_next_pct.value
            : null,
        cycleTime: isChartValue(stage.median_cycle_hours)
            ? stage.median_cycle_hours.value
            : null,
    }));
    const pulseRateData = (Object.entries(pulse) as Array<
        [CompanyPulseMetricId, CompanyPulseData[CompanyPulseMetricId]]
    >)
        .filter(([, metric]) => metric.unit === 'percent')
        .map(([metricId, metric]) => ({
            name: pulseLabels[metricId],
            actual: isChartValue(metric) ? metric.value : null,
            measurement: metric.measurement,
        }));
    const strategyData = overview.strategic_dimensions.map((dimension) => ({
        name: strategyLabels[dimension.id],
        score: isChartValue(dimension.score) ? dimension.score.value : null,
        measurement: dimension.score.measurement,
    }));
    const agentTokenData = overview.agent_operations.map((agent) => ({
        name: agent.display_code,
        inputTokens: isChartValue(agent.input_tokens) ? agent.input_tokens.value : null,
        outputTokens: isChartValue(agent.output_tokens) ? agent.output_tokens.value : null,
        calls: isChartValue(agent.calls) ? agent.calls.value : null,
        cost: isChartValue(agent.cost_cny) ? agent.cost_cny.value : null,
        averageLatency: isChartValue(agent.average_latency_ms)
            ? agent.average_latency_ms.value
            : null,
        successRate: isChartValue(agent.success_rate_pct)
            ? agent.success_rate_pct.value
            : null,
        status: agent.status,
    }));
    const agentRuntimeData = agentTokenData
        .filter((agent) => agent.calls !== null && agent.averageLatency !== null)
        .map((agent) => ({
            ...agent,
            tokenVolume: (agent.inputTokens || 0) + (agent.outputTokens || 0),
        }));
    const systemLoadData = overview.system_load.samples.map((sample) => ({
        name: timeFormatter.format(new Date(sample.timestamp)),
        throughput: sample.throughput_per_minute,
        successRate: sample.success_rate_pct,
        averageLatency: sample.average_latency_ms,
    }));
    const tokenTimelineData = economics?.daily.map((day) => ({
        name: day.date,
        inputTokens: day.input_tokens,
        outputTokens: day.output_tokens,
        cost: day.cost_usd,
    })) || [];
    const modelData = economics?.by_model.map((model) => ({
        name: model.key,
        inputTokens: model.input_tokens,
        outputTokens: model.output_tokens,
        calls: model.calls,
        cost: model.cost_cny,
        businessValue: model.estimated_business_value_cny,
        averageLatency: model.avg_duration_ms,
    })) || [];
    const endpointData = economics?.by_endpoint.map((endpoint) => ({
        name: endpoint.key.replace(/^\/api\/(?:v1\/)?/, '/'),
        businessValue: endpoint.estimated_business_value_cny,
        cost: endpoint.cost_cny,
        calls: endpoint.calls,
        inputTokens: endpoint.input_tokens,
        outputTokens: endpoint.output_tokens,
    })) || [];

    const coverageMetrics: CompanyAnalyticsMetric[] = [
        ...Object.values(pulse),
        ...overview.operating_loop.flatMap((stage) => [
            stage.current_volume,
            stage.conversion_to_next_pct,
            stage.median_cycle_hours,
            stage.exception_count,
        ]),
        ...overview.strategic_dimensions.map((dimension) => dimension.score),
        ...overview.agent_operations.flatMap((agent) => [
            agent.calls,
            agent.input_tokens,
            agent.output_tokens,
            agent.total_tokens,
            agent.cost_cny,
            agent.average_latency_ms,
            agent.p95_latency_ms,
            agent.success_rate_pct,
        ]),
        overview.system_load.throughput_per_minute,
        overview.system_load.success_rate_pct,
        overview.system_load.average_latency_ms,
        overview.system_load.p95_latency_ms,
        overview.system_load.active_agents,
        overview.system_load.utilization_pct,
        overview.efficiency.ai_compute_share_pct,
        overview.efficiency.coordination_share_pct,
        overview.efficiency.idle_share_pct,
        overview.efficiency.cost_optimization_pct,
    ];
    const coverageData = (['measured', 'estimated', 'unavailable'] as const).map(
        (measurement) => ({
            name: copy.measurementLabels[measurement],
            measurement,
            value: coverageMetrics.filter((metric) => metric.measurement === measurement).length,
        }),
    );
    const inventory = [
        { label: copy.inventoryLabels.metrics, value: coverageMetrics.length },
        { label: copy.inventoryLabels.stages, value: overview.operating_loop.length },
        { label: copy.inventoryLabels.agents, value: overview.agent_operations.length },
        { label: copy.inventoryLabels.samples, value: overview.system_load.samples.length },
        { label: copy.inventoryLabels.days, value: tokenTimelineData.length },
        { label: copy.inventoryLabels.models, value: modelData.length },
        { label: copy.inventoryLabels.endpoints, value: endpointData.length },
    ];
    const hasStagePerformance = stagePerformanceData.some(
        (row) => row.conversion !== null || row.cycleTime !== null,
    );
    const hasPulseRates = pulseRateData.some((row) => row.actual !== null);
    const hasStrategyScores = strategyData.some((row) => row.score !== null);
    const chartStyle = {
        backgroundColor: '#ffffff',
        border: '1px solid #dfe3eb',
        borderRadius: '8px',
        fontSize: '12px',
    };
    const axisTick = { fill: '#5e5e5e', fontSize: 10 };

    return (
        <section
            className={cx('eam-module', 'analytics-data-atlas', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<BarChart3 size={18} />}
                title={copy.title}
                description={copy.description}
            />

            <div className="analytics-atlas-summary">
                <article className="analytics-atlas-inventory">
                    <h3>{copy.inventoryTitle}</h3>
                    <dl>
                        {inventory.map((item) => (
                            <div key={item.label}>
                                <dt>{item.label}</dt>
                                <dd>{item.value}</dd>
                            </div>
                        ))}
                    </dl>
                </article>
                <article className="analytics-atlas-coverage">
                    <div>
                        <h3>{copy.coverageTitle}</h3>
                        <p>{copy.coverageDescription}</p>
                    </div>
                    <div className="analytics-atlas-coverage-chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={coverageData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={34}
                                    outerRadius={54}
                                    paddingAngle={2}
                                >
                                    {coverageData.map((entry) => (
                                        <Cell
                                            fill={MEASUREMENT_COLORS[entry.measurement]}
                                            key={entry.measurement}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={chartStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul>
                        {coverageData.map((item) => (
                            <li key={item.measurement}>
                                <i style={{ background: MEASUREMENT_COLORS[item.measurement] }} />
                                <span>{item.name}</span>
                                <strong>{item.value}</strong>
                            </li>
                        ))}
                    </ul>
                </article>
            </div>

            <div className="analytics-atlas-grid">
                <ChartCard title={copy.charts.stageVolume}>
                    <div className="analytics-atlas-chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageVolumeData}>
                                <CartesianGrid stroke="#eef1f5" vertical={false} />
                                <XAxis dataKey="name" tick={axisTick} />
                                <YAxis tick={axisTick} allowDecimals={false} />
                                <Tooltip contentStyle={chartStyle} />
                                <Legend />
                                <Bar
                                    dataKey="volume"
                                    fill={CHART_COLORS.primary}
                                    name={copy.series.volume}
                                    radius={[3, 3, 0, 0]}
                                />
                                <Bar
                                    dataKey="exceptions"
                                    fill={CHART_COLORS.critical}
                                    name={copy.series.exceptions}
                                    radius={[3, 3, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title={copy.charts.stagePerformance}>
                    {hasStagePerformance ? (
                        <div className="analytics-atlas-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={stagePerformanceData}>
                                    <CartesianGrid stroke="#eef1f5" vertical={false} />
                                    <XAxis dataKey="name" tick={axisTick} />
                                    <YAxis
                                        yAxisId="percent"
                                        tick={axisTick}
                                        domain={[0, 100]}
                                        unit="%"
                                    />
                                    <YAxis
                                        yAxisId="hours"
                                        orientation="right"
                                        tick={axisTick}
                                        unit="h"
                                    />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Legend />
                                    <Bar
                                        dataKey="conversion"
                                        fill={CHART_COLORS.primarySoft}
                                        name={copy.series.conversion}
                                        yAxisId="percent"
                                        radius={[3, 3, 0, 0]}
                                    />
                                    <Line
                                        dataKey="cycleTime"
                                        name={copy.series.cycleTime}
                                        stroke={CHART_COLORS.warning}
                                        strokeWidth={2}
                                        yAxisId="hours"
                                        connectNulls={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard title={copy.charts.pulseRates}>
                    {hasPulseRates ? (
                        <div className="analytics-atlas-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pulseRateData} layout="vertical">
                                    <CartesianGrid stroke="#eef1f5" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} tick={axisTick} unit="%" />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={108}
                                        tick={axisTick}
                                    />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Bar
                                        dataKey="actual"
                                        name={copy.series.actual}
                                        fill={CHART_COLORS.positive}
                                        radius={[0, 3, 3, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard title={copy.charts.strategyScores}>
                    {hasStrategyScores ? (
                        <div className="analytics-atlas-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={strategyData}>
                                    <CartesianGrid stroke="#eef1f5" vertical={false} />
                                    <XAxis dataKey="name" tick={axisTick} />
                                    <YAxis domain={[0, 10]} tick={axisTick} />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Bar
                                        dataKey="score"
                                        name={copy.series.score}
                                        fill={CHART_COLORS.primary}
                                        radius={[3, 3, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard
                    className="analytics-atlas-span-2"
                    title={copy.charts.agentTokens}
                >
                    <div
                        className="analytics-atlas-chart is-dynamic"
                        style={{ height: Math.max(260, agentTokenData.length * 38) }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agentTokenData} layout="vertical">
                                <CartesianGrid stroke="#eef1f5" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={axisTick}
                                    tickFormatter={(value) => compactNumber.format(value)}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={124}
                                    tick={axisTick}
                                />
                                <Tooltip contentStyle={chartStyle} />
                                <Legend />
                                <Bar
                                    dataKey="inputTokens"
                                    fill={CHART_COLORS.primarySoft}
                                    name={copy.series.inputTokens}
                                    stackId="tokens"
                                />
                                <Bar
                                    dataKey="outputTokens"
                                    fill={CHART_COLORS.primary}
                                    name={copy.series.outputTokens}
                                    stackId="tokens"
                                    radius={[0, 3, 3, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title={copy.charts.agentRuntime}>
                    {agentRuntimeData.length > 0 ? (
                        <div className="analytics-atlas-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ right: 16 }}>
                                    <CartesianGrid stroke="#eef1f5" />
                                    <XAxis
                                        type="number"
                                        dataKey="calls"
                                        name={copy.series.calls}
                                        tick={axisTick}
                                        allowDecimals={false}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="averageLatency"
                                        name={copy.series.averageLatency}
                                        tick={axisTick}
                                        unit="ms"
                                    />
                                    <ZAxis
                                        type="number"
                                        dataKey="tokenVolume"
                                        range={[70, 440]}
                                    />
                                    <Tooltip
                                        contentStyle={chartStyle}
                                        cursor={{ strokeDasharray: '3 3' }}
                                    />
                                    <Scatter data={agentRuntimeData}>
                                        {agentRuntimeData.map((agent) => (
                                            <Cell
                                                fill={AGENT_STATUS_COLORS[agent.status]}
                                                key={agent.name}
                                            />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard title={copy.charts.systemLoad}>
                    {systemLoadData.length > 0 ? (
                        <div className="analytics-atlas-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={systemLoadData}>
                                    <CartesianGrid stroke="#eef1f5" vertical={false} />
                                    <XAxis dataKey="name" tick={axisTick} minTickGap={28} />
                                    <YAxis yAxisId="throughput" tick={axisTick} />
                                    <YAxis
                                        yAxisId="latency"
                                        orientation="right"
                                        tick={axisTick}
                                        unit="ms"
                                    />
                                    <YAxis
                                        yAxisId="success"
                                        orientation="right"
                                        domain={[0, 100]}
                                        hide
                                    />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Legend />
                                    <Area
                                        dataKey="throughput"
                                        fill={CHART_COLORS.primarySoft}
                                        fillOpacity={0.55}
                                        name={copy.series.throughput}
                                        stroke={CHART_COLORS.primary}
                                        yAxisId="throughput"
                                    />
                                    <Line
                                        dataKey="averageLatency"
                                        name={copy.series.averageLatency}
                                        stroke={CHART_COLORS.warning}
                                        strokeWidth={2}
                                        yAxisId="latency"
                                        connectNulls={false}
                                    />
                                    <Line
                                        dataKey="successRate"
                                        name={copy.series.successRate}
                                        stroke={CHART_COLORS.positive}
                                        strokeWidth={2}
                                        yAxisId="success"
                                        connectNulls={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard
                    className="analytics-atlas-span-2"
                    title={copy.charts.tokenTimeline}
                >
                    {tokenTimelineData.length > 0 ? (
                        <div className="analytics-atlas-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={tokenTimelineData}>
                                    <CartesianGrid stroke="#eef1f5" vertical={false} />
                                    <XAxis dataKey="name" tick={axisTick} minTickGap={22} />
                                    <YAxis
                                        yAxisId="tokens"
                                        tick={axisTick}
                                        tickFormatter={(value) => compactNumber.format(value)}
                                    />
                                    <YAxis
                                        yAxisId="cost"
                                        orientation="right"
                                        tick={axisTick}
                                    />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Legend />
                                    <Bar
                                        dataKey="inputTokens"
                                        fill={CHART_COLORS.primarySoft}
                                        name={copy.series.inputTokens}
                                        stackId="tokens"
                                        yAxisId="tokens"
                                    />
                                    <Bar
                                        dataKey="outputTokens"
                                        fill={CHART_COLORS.primary}
                                        name={copy.series.outputTokens}
                                        radius={[3, 3, 0, 0]}
                                        stackId="tokens"
                                        yAxisId="tokens"
                                    />
                                    <Line
                                        dataKey="cost"
                                        name={copy.series.cost}
                                        stroke={CHART_COLORS.positive}
                                        strokeWidth={2}
                                        yAxisId="cost"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard title={copy.charts.modelEconomics}>
                    {modelData.length > 0 ? (
                        <div
                            className="analytics-atlas-chart is-dynamic"
                            style={{ height: Math.max(240, modelData.length * 46) }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={modelData} layout="vertical">
                                    <CartesianGrid stroke="#eef1f5" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={axisTick}
                                        tickFormatter={(value) => compactNumber.format(value)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={120}
                                        tick={axisTick}
                                    />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Legend />
                                    <Bar
                                        dataKey="inputTokens"
                                        fill={CHART_COLORS.primarySoft}
                                        name={copy.series.inputTokens}
                                        stackId="tokens"
                                    />
                                    <Bar
                                        dataKey="outputTokens"
                                        fill={CHART_COLORS.primary}
                                        name={copy.series.outputTokens}
                                        radius={[0, 3, 3, 0]}
                                        stackId="tokens"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>

                <ChartCard title={copy.charts.endpointValue}>
                    {endpointData.length > 0 ? (
                        <div
                            className="analytics-atlas-chart is-dynamic"
                            style={{ height: Math.max(240, endpointData.length * 52) }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={endpointData} layout="vertical">
                                    <CartesianGrid stroke="#eef1f5" horizontal={false} />
                                    <XAxis type="number" tick={axisTick} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={148}
                                        tick={axisTick}
                                    />
                                    <Tooltip contentStyle={chartStyle} />
                                    <Legend />
                                    <Bar
                                        dataKey="businessValue"
                                        fill={CHART_COLORS.positive}
                                        name={copy.series.businessValue}
                                        radius={[0, 3, 3, 0]}
                                    />
                                    <Bar
                                        dataKey="cost"
                                        fill={CHART_COLORS.warning}
                                        name={copy.series.cost}
                                        radius={[0, 3, 3, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyChart>{copy.noData}</EmptyChart>}
                </ChartCard>
            </div>
        </section>
    );
}

export default AnalyticsDataAtlas;
