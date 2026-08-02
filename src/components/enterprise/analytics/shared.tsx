import { useId, type ReactNode } from 'react';
import type { MeasurementKind, MetricPoint, MetricUnit } from './types';

export interface AnalyticsValueCopy {
    measurementLabels: Record<MeasurementKind, string>;
    unavailableValue: string;
}

export interface AnalyticsRenderOptions {
    locale?: string;
    unitLabels?: Partial<Record<MetricUnit, string>>;
}

export interface AnalyticsModuleProps extends AnalyticsRenderOptions {
    valueCopy: AnalyticsValueCopy;
    className?: string;
    id?: string;
}

export const cx = (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(' ');

const formatNumber = (value: number, locale: string, maximumFractionDigits = 1) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);

export const formatMetricNumber = (
    value: number,
    unit: MetricUnit,
    locale = 'en',
    unitLabels: Partial<Record<MetricUnit, string>> = {},
) => {
    const unitLabel = unitLabels[unit];

    if (unit === 'cny' || unit === 'cny_per_minute') {
        const currency = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'CNY',
            maximumFractionDigits: 2,
        }).format(value);
        return unit === 'cny_per_minute'
            ? `${currency}${unitLabel ?? '/min'}`
            : `${currency}${unitLabel ?? ''}`;
    }

    const formatted = formatNumber(value, locale, unit === 'count' ? 0 : 1);
    const defaultSuffix: Record<Exclude<MetricUnit, 'cny' | 'cny_per_minute'>, string> = {
        count: '',
        percent: '%',
        score_10: '/10',
        milliseconds: ' ms',
        hours: ' h',
        requests_per_minute: '/min',
        ratio: 'x',
    };

    return `${formatted}${unitLabel ?? defaultSuffix[unit]}`;
};

export const getEffectiveMeasurement = (
    metric: MetricPoint | null | undefined,
): MeasurementKind => (
    !metric || metric.value === null ? 'unavailable' : metric.measurement
);

export function MeasurementBadge({
    measurement,
    labels,
    compact = false,
}: {
    measurement: MeasurementKind;
    labels: Record<MeasurementKind, string>;
    compact?: boolean;
}) {
    return (
        <span
            className={cx('eam-measurement-badge', compact && 'is-compact')}
            data-measurement={measurement}
        >
            {labels[measurement]}
        </span>
    );
}

export function MetricValue({
    metric,
    valueCopy,
    locale = 'en',
    unitLabels,
    compact = false,
    showReason = true,
    showSource = false,
}: {
    metric: MetricPoint | null | undefined;
    valueCopy: AnalyticsValueCopy;
    locale?: string;
    unitLabels?: Partial<Record<MetricUnit, string>>;
    compact?: boolean;
    showReason?: boolean;
    showSource?: boolean;
}) {
    const measurement = getEffectiveMeasurement(metric);
    const value = metric?.value === null || metric?.value === undefined
        ? valueCopy.unavailableValue
        : formatMetricNumber(metric.value, metric.unit, locale, unitLabels);

    return (
        <span
            className={cx('eam-metric-value', compact && 'is-compact')}
            data-measurement={measurement}
        >
            <span className="eam-metric-value-line">
                <strong>{value}</strong>
                <MeasurementBadge
                    compact={compact}
                    labels={valueCopy.measurementLabels}
                    measurement={measurement}
                />
            </span>
            {metric && metric.sample_size > 0 && (
                <small className="eam-metric-sample">n={metric.sample_size}</small>
            )}
            {showReason && measurement === 'unavailable' && metric?.reason && (
                <small className="eam-metric-reason">{metric.reason}</small>
            )}
            {showSource && metric?.source && (
                <small className="eam-metric-source">{metric.source}</small>
            )}
        </span>
    );
}

export function TextMeasurement({
    value,
    measurement,
    reason,
    valueCopy,
    compact = false,
}: {
    value: string | null | undefined;
    measurement: MeasurementKind;
    reason?: string | null;
    valueCopy: AnalyticsValueCopy;
    compact?: boolean;
}) {
    const effectiveMeasurement = value ? measurement : 'unavailable';

    return (
        <span
            className={cx('eam-metric-value', compact && 'is-compact')}
            data-measurement={effectiveMeasurement}
        >
            <span className="eam-metric-value-line">
                <strong>{value || valueCopy.unavailableValue}</strong>
                <MeasurementBadge
                    compact={compact}
                    labels={valueCopy.measurementLabels}
                    measurement={effectiveMeasurement}
                />
            </span>
            {effectiveMeasurement === 'unavailable' && reason && (
                <small className="eam-metric-reason">{reason}</small>
            )}
        </span>
    );
}

export function ModuleHeader({
    title,
    description,
    icon,
    action,
    id,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    id?: string;
}) {
    return (
        <header className="eam-module-header">
            <div className="eam-module-heading">
                {icon && <span className="eam-module-icon" aria-hidden="true">{icon}</span>}
                <div>
                    <h2 id={id}>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
            </div>
            {action}
        </header>
    );
}

export const useModuleHeadingId = (id: string | undefined, prefix: string) => {
    const generatedId = useId();
    return id ? `${id}-title` : `${prefix}-${generatedId.replace(/:/g, '')}`;
};

export const formatDateTime = (value: string, locale = 'en') => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
};
