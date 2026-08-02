import { BarChart3 } from 'lucide-react';
import type { CSSProperties } from 'react';
import {
    MetricValue,
    ModuleHeader,
    TextMeasurement,
    cx,
    formatDateTime,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type { MetricPoint, MetricUnit, SystemLoadMetric } from './types';

export interface SystemLoadCopy {
    title: string;
    description?: string;
    observationStartedLabel: string;
    throughputLabel: string;
    successRateLabel: string;
    averageLatencyLabel: string;
    p95LatencyLabel: string;
    activeAgentsLabel: string;
    utilizationLabel: string;
    trendLabel: string;
    samplesTableCaption: string;
    timestampLabel: string;
    emptySamplesLabel: string;
}

export interface SystemLoadProps extends AnalyticsModuleProps {
    data: SystemLoadMetric;
    copy: SystemLoadCopy;
}

const toSampleMetric = (
    value: number | null,
    unit: MetricUnit,
): MetricPoint => ({
    value,
    unit,
    measurement: value === null ? 'unavailable' : 'measured',
    sample_size: value === null ? 0 : 1,
    source: '',
    reason: null,
});

const formatSampleLabel = (timestamp: string, locale: string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
        ? timestamp
        : new Intl.DateTimeFormat(locale, {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
};

export function SystemLoad({
    data,
    copy,
    valueCopy,
    locale = 'en',
    unitLabels,
    className,
    id,
}: SystemLoadProps) {
    const headingId = useModuleHeadingId(id, 'system-load');
    const maxThroughput = data.samples.reduce(
        (maximum, sample) => Math.max(maximum, sample.throughput_per_minute),
        0,
    );

    const summaryMetrics: Array<{
        label: string;
        metric: MetricPoint;
    }> = [
        { label: copy.throughputLabel, metric: data.throughput_per_minute },
        { label: copy.successRateLabel, metric: data.success_rate_pct },
        { label: copy.averageLatencyLabel, metric: data.average_latency_ms },
        { label: copy.p95LatencyLabel, metric: data.p95_latency_ms },
        { label: copy.activeAgentsLabel, metric: data.active_agents },
        { label: copy.utilizationLabel, metric: data.utilization_pct },
    ];

    return (
        <section
            className={cx('eam-module', 'eam-system-load', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<BarChart3 size={18} />}
                title={copy.title}
                description={copy.description}
            />
            <div className="eam-load-surface">
                <div className="eam-load-observation">
                    <span>{copy.observationStartedLabel}</span>
                    <TextMeasurement
                        compact
                        value={formatDateTime(data.observation_started_at, locale)}
                        measurement="measured"
                        valueCopy={valueCopy}
                    />
                </div>
                <dl className="eam-load-metrics">
                    {summaryMetrics.map(({ label, metric }) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>
                                <MetricValue
                                    metric={metric}
                                    valueCopy={valueCopy}
                                    locale={locale}
                                    unitLabels={unitLabels}
                                />
                            </dd>
                        </div>
                    ))}
                </dl>
                <div className="eam-load-trend">
                    <h3>{copy.trendLabel}</h3>
                    {data.samples.length === 0 ? (
                        <p className="eam-empty-state">{copy.emptySamplesLabel}</p>
                    ) : (
                        <div className="eam-load-chart" aria-hidden="true">
                            {data.samples.map((sample) => {
                                const height = maxThroughput > 0
                                    ? (sample.throughput_per_minute / maxThroughput) * 100
                                    : 0;
                                const style = {
                                    '--eam-sample-height': `${height}%`,
                                } as CSSProperties;

                                return (
                                    <span
                                        className="eam-load-column"
                                        key={sample.timestamp}
                                        style={style}
                                        title={`${formatSampleLabel(sample.timestamp, locale)}: ${sample.throughput_per_minute}`}
                                    >
                                        <i />
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
                {data.samples.length > 0 && (
                    <div className="eam-table-surface eam-sample-table-wrap" tabIndex={0}>
                        <table className="eam-data-table eam-sample-table">
                            <caption>{copy.samplesTableCaption}</caption>
                            <thead>
                                <tr>
                                    <th scope="col">{copy.timestampLabel}</th>
                                    <th scope="col">{copy.throughputLabel}</th>
                                    <th scope="col">{copy.successRateLabel}</th>
                                    <th scope="col">{copy.averageLatencyLabel}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.samples.map((sample) => (
                                    <tr key={sample.timestamp}>
                                        <th scope="row">
                                            <time dateTime={sample.timestamp}>
                                                {formatSampleLabel(sample.timestamp, locale)}
                                            </time>
                                        </th>
                                        <td>
                                            <MetricValue
                                                compact
                                                metric={toSampleMetric(
                                                    sample.throughput_per_minute,
                                                    'requests_per_minute',
                                                )}
                                                valueCopy={valueCopy}
                                                locale={locale}
                                                unitLabels={unitLabels}
                                            />
                                        </td>
                                        <td>
                                            <MetricValue
                                                compact
                                                metric={toSampleMetric(
                                                    sample.success_rate_pct,
                                                    'percent',
                                                )}
                                                valueCopy={valueCopy}
                                                locale={locale}
                                                unitLabels={unitLabels}
                                            />
                                        </td>
                                        <td>
                                            <MetricValue
                                                compact
                                                metric={toSampleMetric(
                                                    sample.average_latency_ms,
                                                    'milliseconds',
                                                )}
                                                valueCopy={valueCopy}
                                                locale={locale}
                                                unitLabels={unitLabels}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

export default SystemLoad;
