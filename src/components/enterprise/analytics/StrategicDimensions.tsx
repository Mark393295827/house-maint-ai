import { Crosshair, ExternalLink } from 'lucide-react';
import {
    MeasurementBadge,
    MetricValue,
    ModuleHeader,
    cx,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type {
    MetricPoint,
    StrategicConfidence,
    StrategicDimensionId,
    StrategicDimensionMetric,
} from './types';

export interface StrategicDimensionsCopy {
    title: string;
    description?: string;
    dimensionLabels: Record<StrategicDimensionId, string>;
    confidenceLabels: Record<StrategicConfidence, string>;
    scoreLabel: string;
    trendLabel: string;
    confidenceLabel: string;
    formulaLabel: string;
    sourceLabel: string;
    evidenceLabel: string;
    selectDimensionLabel: string;
    emptyLabel: string;
}

export interface StrategicDimensionsProps extends AnalyticsModuleProps {
    dimensions: readonly StrategicDimensionMetric[];
    copy: StrategicDimensionsCopy;
    trends?: Partial<Record<StrategicDimensionId, MetricPoint | null>>;
    onSelectDimension?: (
        dimensionId: StrategicDimensionId,
        dimension: StrategicDimensionMetric,
    ) => void;
}

export function StrategicDimensions({
    dimensions,
    copy,
    trends = {},
    onSelectDimension,
    valueCopy,
    locale,
    unitLabels,
    className,
    id,
}: StrategicDimensionsProps) {
    const headingId = useModuleHeadingId(id, 'strategic-dimensions');

    return (
        <section
            className={cx('eam-module', 'eam-strategic-dimensions', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<Crosshair size={18} />}
                title={copy.title}
                description={copy.description}
            />
            {dimensions.length === 0 ? (
                <div className="eam-surface eam-empty-state">{copy.emptyLabel}</div>
            ) : (
                <div className="eam-dimension-grid">
                    {dimensions.map((dimension) => (
                        <article
                            className="eam-dimension-card"
                            data-dimension-id={dimension.id}
                            key={dimension.id}
                        >
                            <header>
                                <h3>{copy.dimensionLabels[dimension.id]}</h3>
                                {onSelectDimension && (
                                    <button
                                        type="button"
                                        className="eam-icon-button"
                                        aria-label={`${copy.selectDimensionLabel}: ${copy.dimensionLabels[dimension.id]}`}
                                        onClick={() => onSelectDimension(dimension.id, dimension)}
                                    >
                                        <ExternalLink size={15} aria-hidden="true" />
                                    </button>
                                )}
                            </header>
                            <dl className="eam-dimension-details">
                                <div className="eam-dimension-score">
                                    <dt>{copy.scoreLabel}</dt>
                                    <dd>
                                        <MetricValue
                                            metric={dimension.score}
                                            valueCopy={valueCopy}
                                            locale={locale}
                                            unitLabels={unitLabels}
                                        />
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.trendLabel}</dt>
                                    <dd>
                                        <MetricValue
                                            compact
                                            metric={trends[dimension.id]}
                                            valueCopy={valueCopy}
                                            locale={locale}
                                            unitLabels={unitLabels}
                                        />
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.confidenceLabel}</dt>
                                    <dd>
                                        <span
                                            className="eam-confidence"
                                            data-confidence={dimension.confidence}
                                        >
                                            {copy.confidenceLabels[dimension.confidence]}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.formulaLabel}</dt>
                                    <dd><code>{dimension.formula_version}</code></dd>
                                </div>
                                <div>
                                    <dt>{copy.sourceLabel}</dt>
                                    <dd>
                                        {dimension.score.source || (
                                            <MeasurementBadge
                                                compact
                                                labels={valueCopy.measurementLabels}
                                                measurement="unavailable"
                                            />
                                        )}
                                    </dd>
                                </div>
                            </dl>
                            <div className="eam-evidence">
                                <span>{copy.evidenceLabel}</span>
                                {dimension.evidence_metric_ids.length > 0 ? (
                                    <ul>
                                        {dimension.evidence_metric_ids.map((metricId) => (
                                            <li key={metricId}><code>{metricId}</code></li>
                                        ))}
                                    </ul>
                                ) : (
                                    <MeasurementBadge
                                        compact
                                        labels={valueCopy.measurementLabels}
                                        measurement="unavailable"
                                    />
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default StrategicDimensions;
