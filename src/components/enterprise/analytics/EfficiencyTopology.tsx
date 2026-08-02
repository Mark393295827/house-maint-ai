import { ExternalLink, Gauge } from 'lucide-react';
import {
    MetricValue,
    ModuleHeader,
    TextMeasurement,
    cx,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type { EfficiencyMetric, MeasurementKind, MetricPoint } from './types';

export interface EfficiencyBaseline {
    model: string | null;
    period: string | null;
    measurement: MeasurementKind;
    reason?: string | null;
}

export interface EfficiencyTopologyCopy {
    title: string;
    description?: string;
    compositionLabel: string;
    categoryLabels: {
        aiCompute: string;
        coordination: string;
        idle: string;
    };
    costOptimizationLabel: string;
    baselineModelLabel: string;
    baselinePeriodLabel: string;
    compositionUnavailableLabel: string;
    openEvidenceLabel: string;
}

export interface EfficiencyTopologyProps extends AnalyticsModuleProps {
    data: EfficiencyMetric;
    copy: EfficiencyTopologyCopy;
    baseline?: EfficiencyBaseline | null;
    onOpenEvidence?: () => void;
}

const hasUsableShare = (metric: MetricPoint) => (
    metric.measurement !== 'unavailable'
    && metric.value !== null
    && metric.value >= 0
    && metric.value <= 100
);

export function EfficiencyTopology({
    data,
    copy,
    baseline,
    onOpenEvidence,
    valueCopy,
    locale,
    unitLabels,
    className,
    id,
}: EfficiencyTopologyProps) {
    const headingId = useModuleHeadingId(id, 'efficiency-topology');
    const categories = [
        {
            id: 'ai-compute',
            label: copy.categoryLabels.aiCompute,
            metric: data.ai_compute_share_pct,
        },
        {
            id: 'coordination',
            label: copy.categoryLabels.coordination,
            metric: data.coordination_share_pct,
        },
        {
            id: 'idle',
            label: copy.categoryLabels.idle,
            metric: data.idle_share_pct,
        },
    ] as const;
    const total = categories.reduce(
        (sum, category) => sum + (category.metric.value ?? 0),
        0,
    );
    const hasValidComposition = categories.every(
        (category) => hasUsableShare(category.metric),
    ) && Math.abs(total - 100) <= 0.2;

    return (
        <section
            className={cx('eam-module', 'eam-efficiency-topology', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<Gauge size={18} />}
                title={copy.title}
                description={copy.description}
                action={onOpenEvidence ? (
                    <button
                        type="button"
                        className="eam-icon-button"
                        aria-label={copy.openEvidenceLabel}
                        onClick={onOpenEvidence}
                    >
                        <ExternalLink size={15} aria-hidden="true" />
                    </button>
                ) : undefined}
            />
            <div className="eam-efficiency-surface">
                {hasValidComposition ? (
                    <div
                        className="eam-efficiency-bar"
                        role="img"
                        aria-label={copy.compositionLabel}
                    >
                        {categories.map((category) => (
                            <span
                                data-category={category.id}
                                key={category.id}
                                style={{ width: `${category.metric.value}%` }}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="eam-composition-unavailable">
                        {copy.compositionUnavailableLabel}
                    </p>
                )}
                <dl className="eam-efficiency-categories">
                    {categories.map((category) => (
                        <div key={category.id}>
                            <dt>
                                <i data-category={category.id} aria-hidden="true" />
                                {category.label}
                            </dt>
                            <dd>
                                <MetricValue
                                    metric={category.metric}
                                    valueCopy={valueCopy}
                                    locale={locale}
                                    unitLabels={unitLabels}
                                />
                            </dd>
                        </div>
                    ))}
                </dl>
                <div className="eam-optimization">
                    <div>
                        <span>{copy.costOptimizationLabel}</span>
                        <MetricValue
                            metric={data.cost_optimization_pct}
                            valueCopy={valueCopy}
                            locale={locale}
                            unitLabels={unitLabels}
                        />
                    </div>
                    <dl>
                        <div>
                            <dt>{copy.baselineModelLabel}</dt>
                            <dd>
                                <TextMeasurement
                                    compact
                                    value={baseline?.model}
                                    measurement={baseline?.measurement ?? 'unavailable'}
                                    reason={baseline?.reason}
                                    valueCopy={valueCopy}
                                />
                            </dd>
                        </div>
                        <div>
                            <dt>{copy.baselinePeriodLabel}</dt>
                            <dd>
                                <TextMeasurement
                                    compact
                                    value={baseline?.period}
                                    measurement={baseline?.measurement ?? 'unavailable'}
                                    reason={baseline?.reason}
                                    valueCopy={valueCopy}
                                />
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>
    );
}

export default EfficiencyTopology;
