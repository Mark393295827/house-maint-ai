import { History, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    MeasurementBadge,
    MetricValue,
    ModuleHeader,
    TextMeasurement,
    cx,
    formatDateTime,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type {
    MarketIntelligenceUnavailable,
    MeasurementKind,
    MetricPoint,
} from './types';

export type ResearchValidationStatus = 'passed' | 'failed' | 'pending' | 'unavailable';

export interface ResearchValidationView {
    id: string;
    status: ResearchValidationStatus;
    measurement: MeasurementKind;
    detail?: string | null;
}

export interface LatestResearchSummary {
    id: string;
    sector: string;
    focus: string | null;
    generated_at: string;
    measurement: MeasurementKind;
    verdict: string;
    executive_summary: string;
    evidence_count: MetricPoint;
    run_duration: MetricPoint;
    validation: ResearchValidationView[];
}

export interface ResearchBudgetState {
    state: string | null;
    measurement: MeasurementKind;
    reason?: string | null;
}

export interface MarketIntelligenceCopy {
    title: string;
    description?: string;
    sectorLabel: string;
    sectorPlaceholder?: string;
    focusLabel: string;
    focusPlaceholder?: string;
    costEstimateLabel: string;
    budgetLabel: string;
    budgetStateLabels?: Record<string, string>;
    runLabel: string;
    runningLabel: string;
    historyLabel: string;
    latestResultLabel: string;
    verdictLabel: string;
    summaryLabel: string;
    evidenceCountLabel: string;
    runDurationLabel: string;
    generatedLabel: string;
    validationLabel: string;
    validationStatusLabels: Record<ResearchValidationStatus, string>;
    validationAgentLabels?: Record<string, string>;
    verdictLabels?: Record<string, string>;
    noValidationLabel: string;
}

export interface MarketIntelligenceProps extends AnalyticsModuleProps {
    intelligence: MarketIntelligenceUnavailable;
    latestRun?: LatestResearchSummary | null;
    sector: string;
    focus: string;
    costEstimate?: MetricPoint | null;
    budgetState: ResearchBudgetState;
    canRun: boolean;
    isRunning?: boolean;
    copy: MarketIntelligenceCopy;
    onSectorChange?: (value: string) => void;
    onFocusChange?: (value: string) => void;
    onRun?: () => void;
    onOpenHistory?: () => void;
}

export function MarketIntelligence({
    intelligence,
    latestRun,
    sector,
    focus,
    costEstimate,
    budgetState,
    canRun,
    isRunning = false,
    copy,
    onSectorChange,
    onFocusChange,
    onRun,
    onOpenHistory,
    valueCopy,
    locale = 'en',
    unitLabels,
    className,
    id,
}: MarketIntelligenceProps) {
    const headingId = useModuleHeadingId(id, 'market-intelligence');

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (canRun && !isRunning) onRun?.();
    };

    return (
        <section
            className={cx('eam-module', 'eam-market-intelligence', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<Search size={18} />}
                title={copy.title}
                description={copy.description}
                action={onOpenHistory ? (
                    <button
                        type="button"
                        className="eam-secondary-button"
                        onClick={onOpenHistory}
                    >
                        <History size={15} aria-hidden="true" />
                        <span>{copy.historyLabel}</span>
                    </button>
                ) : undefined}
            />
            <div className="eam-market-grid">
                <form className="eam-market-control" onSubmit={handleSubmit}>
                    <label>
                        <span>{copy.sectorLabel}</span>
                        <input
                            type="text"
                            value={sector}
                            placeholder={copy.sectorPlaceholder}
                            readOnly={!onSectorChange}
                            onChange={(event) => onSectorChange?.(event.target.value)}
                        />
                    </label>
                    <label>
                        <span>{copy.focusLabel}</span>
                        <textarea
                            value={focus}
                            placeholder={copy.focusPlaceholder}
                            readOnly={!onFocusChange}
                            onChange={(event) => onFocusChange?.(event.target.value)}
                            rows={3}
                        />
                    </label>
                    <dl className="eam-market-readiness">
                        <div>
                            <dt>{copy.costEstimateLabel}</dt>
                            <dd>
                                <MetricValue
                                    compact
                                    metric={costEstimate}
                                    valueCopy={valueCopy}
                                    locale={locale}
                                    unitLabels={unitLabels}
                                />
                            </dd>
                        </div>
                        <div>
                            <dt>{copy.budgetLabel}</dt>
                            <dd>
                                <TextMeasurement
                                    compact
                                    value={budgetState.state
                                        ? copy.budgetStateLabels?.[budgetState.state]
                                            ?? budgetState.state
                                        : null}
                                    measurement={budgetState.measurement}
                                    reason={budgetState.reason}
                                    valueCopy={valueCopy}
                                />
                            </dd>
                        </div>
                    </dl>
                    <button
                        type="submit"
                        className="eam-primary-button"
                        disabled={!canRun || isRunning || !onRun}
                    >
                        <Search size={16} aria-hidden="true" />
                        <span>{isRunning ? copy.runningLabel : copy.runLabel}</span>
                    </button>
                </form>
                <article className="eam-market-result">
                    <header>
                        <h3>{copy.latestResultLabel}</h3>
                        <MeasurementBadge
                            labels={valueCopy.measurementLabels}
                            measurement={latestRun?.measurement ?? intelligence.measurement}
                        />
                    </header>
                    {latestRun ? (
                        <>
                            <dl className="eam-market-result-meta">
                                <div>
                                    <dt>{copy.verdictLabel}</dt>
                                    <dd className="eam-market-verdict">
                                        {copy.verdictLabels?.[latestRun.verdict]
                                            ?? latestRun.verdict}
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.generatedLabel}</dt>
                                    <dd>
                                        <time dateTime={latestRun.generated_at}>
                                            {formatDateTime(latestRun.generated_at, locale)}
                                        </time>
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.evidenceCountLabel}</dt>
                                    <dd>
                                        <MetricValue
                                            compact
                                            metric={latestRun.evidence_count}
                                            valueCopy={valueCopy}
                                            locale={locale}
                                            unitLabels={unitLabels}
                                        />
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.runDurationLabel}</dt>
                                    <dd>
                                        <MetricValue
                                            compact
                                            metric={latestRun.run_duration}
                                            valueCopy={valueCopy}
                                            locale={locale}
                                            unitLabels={unitLabels}
                                        />
                                    </dd>
                                </div>
                            </dl>
                            <div className="eam-market-summary">
                                <h4>{copy.summaryLabel}</h4>
                                <p>{latestRun.executive_summary}</p>
                            </div>
                            <div className="eam-validation">
                                <h4>{copy.validationLabel}</h4>
                                {latestRun.validation.length === 0 ? (
                                    <p className="eam-empty-state">{copy.noValidationLabel}</p>
                                ) : (
                                    <ul>
                                        {latestRun.validation.map((validation) => (
                                            <li
                                                data-status={validation.status}
                                                key={validation.id}
                                            >
                                                <span>
                                                    {copy.validationAgentLabels?.[validation.id]
                                                        ?? validation.id}
                                                </span>
                                                <strong>
                                                    {copy.validationStatusLabels[validation.status]}
                                                </strong>
                                                <MeasurementBadge
                                                    compact
                                                    labels={valueCopy.measurementLabels}
                                                    measurement={validation.measurement}
                                                />
                                                {validation.detail && <small>{validation.detail}</small>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="eam-unavailable-result">
                            <p>{intelligence.reason}</p>
                        </div>
                    )}
                </article>
            </div>
        </section>
    );
}

export default MarketIntelligence;
