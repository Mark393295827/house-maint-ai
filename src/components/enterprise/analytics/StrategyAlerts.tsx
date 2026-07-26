import { Check, ExternalLink, ShieldAlert } from 'lucide-react';
import {
    MetricValue,
    ModuleHeader,
    cx,
    formatDateTime,
    formatMetricNumber,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type {
    AlertComparator,
    AlertOwner,
    AlertSeverity,
    OperatingStageId,
    StrategyAlertView,
} from './types';

export interface StrategyAlertsCopy {
    title: string;
    description?: string;
    severityLabels: Record<AlertSeverity, string>;
    ownerLabels: Record<AlertOwner, string>;
    stageLabels: Record<OperatingStageId, string>;
    comparatorLabels: Record<AlertComparator, string>;
    metricLabels?: Record<string, string>;
    recommendationLabels?: Record<string, string>;
    thresholdLabel: string;
    generatedLabel: string;
    recommendationLabel: string;
    approvalLabels: {
        required: string;
        notRequired: string;
    };
    noStageLabel: string;
    openAlertLabel: string;
    acknowledgeLabel: string;
    emptyLabel: string;
}

export interface StrategyAlertsProps extends AnalyticsModuleProps {
    alerts: readonly StrategyAlertView[];
    copy: StrategyAlertsCopy;
    onSelectAlert?: (alert: StrategyAlertView) => void;
    onAcknowledgeAlert?: (alert: StrategyAlertView) => void;
}

export function StrategyAlerts({
    alerts,
    copy,
    onSelectAlert,
    onAcknowledgeAlert,
    valueCopy,
    locale = 'en',
    unitLabels,
    className,
    id,
}: StrategyAlertsProps) {
    const headingId = useModuleHeadingId(id, 'strategy-alerts');

    return (
        <section
            className={cx('eam-module', 'eam-strategy-alerts', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<ShieldAlert size={18} />}
                title={copy.title}
                description={copy.description}
            />
            <div className="eam-alert-surface">
                {alerts.length === 0 ? (
                    <p className="eam-empty-state">{copy.emptyLabel}</p>
                ) : (
                    <ul className="eam-alert-list">
                        {alerts.map((alert) => (
                            <li
                                className="eam-alert-row"
                                data-severity={alert.severity}
                                key={alert.id}
                            >
                                <div className="eam-alert-primary">
                                    <div className="eam-alert-title-line">
                                        <span
                                            className="eam-severity-badge"
                                            data-severity={alert.severity}
                                        >
                                            {copy.severityLabels[alert.severity]}
                                        </span>
                                        <strong>
                                            {copy.metricLabels?.[alert.metric_id] ?? alert.metric_id}
                                        </strong>
                                    </div>
                                    <div className="eam-alert-meta">
                                        <span>{copy.ownerLabels[alert.owner]}</span>
                                        <span>
                                            {alert.stage
                                                ? copy.stageLabels[alert.stage]
                                                : copy.noStageLabel}
                                        </span>
                                        <span>{alert.id}</span>
                                    </div>
                                </div>
                                <div className="eam-alert-measure">
                                    <MetricValue
                                        compact
                                        metric={alert.metric}
                                        valueCopy={valueCopy}
                                        locale={locale}
                                        unitLabels={unitLabels}
                                    />
                                    <span className="eam-alert-threshold">
                                        {copy.thresholdLabel}:{' '}
                                        {copy.comparatorLabels[alert.comparator]}{' '}
                                        {formatMetricNumber(
                                            alert.threshold,
                                            alert.metric.unit,
                                            locale,
                                            unitLabels,
                                        )}
                                    </span>
                                </div>
                                <div className="eam-alert-recommendation">
                                    <span>{copy.recommendationLabel}</span>
                                    <strong>
                                        {copy.recommendationLabels?.[alert.recommendation_code]
                                            ?? alert.recommendation_code}
                                    </strong>
                                    <small>
                                        {alert.requires_human_approval
                                            ? copy.approvalLabels.required
                                            : copy.approvalLabels.notRequired}
                                    </small>
                                </div>
                                <div className="eam-alert-time">
                                    <span>{copy.generatedLabel}</span>
                                    <time dateTime={alert.generated_at}>
                                        {formatDateTime(alert.generated_at, locale)}
                                    </time>
                                </div>
                                {(onSelectAlert || onAcknowledgeAlert) && (
                                    <div className="eam-row-actions">
                                        {onSelectAlert && (
                                            <button
                                                type="button"
                                                className="eam-icon-button"
                                                aria-label={`${copy.openAlertLabel}: ${alert.id}`}
                                                onClick={() => onSelectAlert(alert)}
                                            >
                                                <ExternalLink size={15} aria-hidden="true" />
                                            </button>
                                        )}
                                        {onAcknowledgeAlert && (
                                            <button
                                                type="button"
                                                className="eam-icon-button"
                                                aria-label={`${copy.acknowledgeLabel}: ${alert.id}`}
                                                onClick={() => onAcknowledgeAlert(alert)}
                                            >
                                                <Check size={16} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

export default StrategyAlerts;
