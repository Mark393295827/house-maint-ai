import { Workflow } from 'lucide-react';
import {
    MetricValue,
    ModuleHeader,
    cx,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type { OperatingStageId, OperatingStageMetric } from './types';

export interface OperatingLoopHealthCopy {
    title: string;
    description?: string;
    stageLabels: Record<OperatingStageId, string>;
    currentVolumeLabel: string;
    conversionLabel: string;
    cycleTimeLabel: string;
    exceptionsLabel: string;
    selectStageLabel: string;
    emptyLabel: string;
}

export interface OperatingLoopHealthProps extends AnalyticsModuleProps {
    stages: readonly OperatingStageMetric[];
    copy: OperatingLoopHealthCopy;
    selectedStage?: OperatingStageId | null;
    onSelectStage?: (stage: OperatingStageId, metric: OperatingStageMetric) => void;
}

export function OperatingLoopHealth({
    stages,
    copy,
    selectedStage,
    onSelectStage,
    valueCopy,
    locale,
    unitLabels,
    className,
    id,
}: OperatingLoopHealthProps) {
    const headingId = useModuleHeadingId(id, 'operating-loop');
    const orderedStages = [...stages].sort((left, right) => left.order - right.order);

    return (
        <section
            className={cx('eam-module', 'eam-operating-loop', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<Workflow size={18} />}
                title={copy.title}
                description={copy.description}
            />
            <div className="eam-loop-surface">
                {orderedStages.length === 0 ? (
                    <p className="eam-empty-state">{copy.emptyLabel}</p>
                ) : (
                    <ol className="eam-loop-list">
                        {orderedStages.map((stage) => {
                            const isSelected = selectedStage === stage.stage;
                            const stageContent = (
                                <>
                                    <span className="eam-loop-stage-heading">
                                        <span className="eam-loop-order" aria-hidden="true">
                                            {stage.order}
                                        </span>
                                        <strong>{copy.stageLabels[stage.stage]}</strong>
                                    </span>
                                    <dl className="eam-loop-metrics">
                                        <div>
                                            <dt>{copy.currentVolumeLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={stage.current_volume}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{copy.conversionLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={stage.conversion_to_next_pct}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{copy.cycleTimeLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={stage.median_cycle_hours}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{copy.exceptionsLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={stage.exception_count}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                    </dl>
                                </>
                            );

                            return (
                                <li
                                    className={cx('eam-loop-stage', isSelected && 'is-selected')}
                                    data-stage={stage.stage}
                                    key={stage.stage}
                                >
                                    {onSelectStage ? (
                                        <button
                                            type="button"
                                            aria-label={`${copy.selectStageLabel}: ${copy.stageLabels[stage.stage]}`}
                                            aria-pressed={isSelected}
                                            onClick={() => onSelectStage(stage.stage, stage)}
                                        >
                                            {stageContent}
                                        </button>
                                    ) : (
                                        <div className="eam-loop-stage-content">{stageContent}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </section>
    );
}

export default OperatingLoopHealth;
