import { Activity, ArrowUpRight } from 'lucide-react';
import {
    MetricValue,
    ModuleHeader,
    TextMeasurement,
    cx,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type {
    CompanyPulseData,
    CompanyPulseMetricId,
    MeasurementKind,
    MetricPoint,
} from './types';

const DEFAULT_METRIC_ORDER: readonly CompanyPulseMetricId[] = [
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
];

export interface PulseFreshnessPoint {
    value: string | null;
    measurement: MeasurementKind;
    reason?: string | null;
}

export interface PulseMetricContext {
    comparison?: MetricPoint | null;
    target?: MetricPoint | null;
    freshness?: PulseFreshnessPoint | null;
}

export interface CompanyPulseCopy {
    title: string;
    description?: string;
    metricLabels: Record<CompanyPulseMetricId, string>;
    comparisonLabel: string;
    targetLabel: string;
    freshnessLabel: string;
    selectMetricLabel: string;
}

export interface CompanyPulseProps extends AnalyticsModuleProps {
    data: CompanyPulseData;
    copy: CompanyPulseCopy;
    metricOrder?: readonly CompanyPulseMetricId[];
    context?: Partial<Record<CompanyPulseMetricId, PulseMetricContext>>;
    onSelectMetric?: (metricId: CompanyPulseMetricId, metric: MetricPoint) => void;
}

export function CompanyPulse({
    data,
    copy,
    valueCopy,
    metricOrder = DEFAULT_METRIC_ORDER,
    context = {},
    onSelectMetric,
    locale,
    unitLabels,
    className,
    id,
}: CompanyPulseProps) {
    const headingId = useModuleHeadingId(id, 'company-pulse');

    return (
        <section
            className={cx('eam-module', 'eam-company-pulse', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<Activity size={18} />}
                title={copy.title}
                description={copy.description}
            />
            <div className="eam-pulse-grid">
                {metricOrder.map((metricId) => {
                    const metric = data[metricId];
                    const metricContext = context[metricId];
                    const content = (
                        <>
                            <span className="eam-pulse-label">
                                {copy.metricLabels[metricId]}
                                {onSelectMetric && <ArrowUpRight size={14} aria-hidden="true" />}
                            </span>
                            <MetricValue
                                metric={metric}
                                valueCopy={valueCopy}
                                locale={locale}
                                unitLabels={unitLabels}
                            />
                            <dl className="eam-pulse-context">
                                <div>
                                    <dt>{copy.comparisonLabel}</dt>
                                    <dd>
                                        <MetricValue
                                            compact
                                            metric={metricContext?.comparison}
                                            valueCopy={valueCopy}
                                            locale={locale}
                                            unitLabels={unitLabels}
                                        />
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.targetLabel}</dt>
                                    <dd>
                                        <MetricValue
                                            compact
                                            metric={metricContext?.target}
                                            valueCopy={valueCopy}
                                            locale={locale}
                                            unitLabels={unitLabels}
                                        />
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.freshnessLabel}</dt>
                                    <dd>
                                        <TextMeasurement
                                            compact
                                            value={metricContext?.freshness?.value}
                                            measurement={
                                                metricContext?.freshness?.measurement ?? 'unavailable'
                                            }
                                            reason={metricContext?.freshness?.reason}
                                            valueCopy={valueCopy}
                                        />
                                    </dd>
                                </div>
                            </dl>
                        </>
                    );

                    return (
                        <article
                            className="eam-pulse-item"
                            data-metric-id={metricId}
                            key={metricId}
                        >
                            {onSelectMetric ? (
                                <button
                                    type="button"
                                    className="eam-pulse-action"
                                    aria-label={`${copy.selectMetricLabel}: ${copy.metricLabels[metricId]}`}
                                    onClick={() => onSelectMetric(metricId, metric)}
                                >
                                    {content}
                                </button>
                            ) : content}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export default CompanyPulse;
