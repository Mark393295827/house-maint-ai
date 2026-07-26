import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    AgentOperations,
    CompanyPulse,
    EfficiencyTopology,
    MarketIntelligence,
    OperatingLoopHealth,
    StrategicDimensions,
    StrategyAlerts,
    SystemLoad,
    type AgentOperationMetric,
    type AgentOperationsCopy,
    type AnalyticsValueCopy,
    type CompanyPulseCopy,
    type CompanyPulseData,
    type EfficiencyMetric,
    type EfficiencyTopologyCopy,
    type MarketIntelligenceCopy,
    type MetricPoint,
    type MetricUnit,
    type OperatingLoopHealthCopy,
    type OperatingStageId,
    type OperatingStageMetric,
    type StrategicDimensionsCopy,
    type StrategyAlertsCopy,
    type SystemLoadCopy,
    type SystemLoadMetric,
} from './index';

const valueCopy: AnalyticsValueCopy = {
    measurementLabels: {
        measured: 'Measured',
        estimated: 'Estimated',
        unavailable: 'Unavailable',
    },
    unavailableValue: 'N/A',
};

const metric = (
    value: number | null,
    unit: MetricUnit = 'count',
    measurement: MetricPoint['measurement'] = value === null ? 'unavailable' : 'measured',
    reason: string | null = value === null ? 'Source unavailable' : null,
): MetricPoint => ({
    value,
    unit,
    measurement,
    sample_size: value === null ? 0 : 12,
    source: 'fixture-ledger',
    reason,
});

const stageLabels: Record<OperatingStageId, string> = {
    intake: 'Intake',
    diagnosis: 'Diagnosis',
    deflection: 'Deflection',
    dispatch: 'Dispatch',
    verification: 'Verification',
    reporting: 'Reporting',
};

const pulseCopy: CompanyPulseCopy = {
    title: 'Company pulse',
    description: 'Current company health',
    metricLabels: {
        active_work_orders: 'Active work orders',
        available_workers: 'Available workers',
        satisfaction: 'Satisfaction',
        sla_attainment_pct: 'SLA attainment',
        deflection_rate_pct: 'Deflection',
        first_time_fix_rate_pct: 'First-time fix',
        diagnosis_accuracy_pct: 'Diagnosis accuracy',
        revenue_cny: 'Revenue',
        gross_margin_pct: 'Gross margin',
        estimated_ai_value_cny: 'Estimated AI value',
    },
    comparisonLabel: 'Period change',
    targetLabel: 'Target',
    freshnessLabel: 'Freshness',
    selectMetricLabel: 'Inspect metric',
};

const pulse: CompanyPulseData = {
    active_work_orders: metric(12),
    available_workers: metric(7),
    satisfaction: metric(4.6, 'ratio'),
    sla_attainment_pct: metric(null, 'percent', 'unavailable', 'No SLA denominator'),
    deflection_rate_pct: metric(21.5, 'percent'),
    first_time_fix_rate_pct: metric(82, 'percent', 'estimated'),
    diagnosis_accuracy_pct: metric(89, 'percent'),
    revenue_cny: metric(8200, 'cny'),
    gross_margin_pct: metric(68, 'percent', 'estimated'),
    estimated_ai_value_cny: metric(1500, 'cny', 'estimated'),
};

const loopCopy: OperatingLoopHealthCopy = {
    title: 'Operating loop',
    stageLabels,
    currentVolumeLabel: 'Current volume',
    conversionLabel: 'Conversion',
    cycleTimeLabel: 'Median cycle',
    exceptionsLabel: 'Exceptions',
    selectStageLabel: 'Filter stage',
    emptyLabel: 'No stage data',
};

const makeStage = (
    stage: OperatingStageId,
    order: OperatingStageMetric['order'],
): OperatingStageMetric => ({
    stage,
    order,
    current_volume: metric(order * 3),
    conversion_to_next_pct: metric(
        null,
        'percent',
        'unavailable',
        'No transition ledger',
    ),
    median_cycle_hours: metric(null, 'hours'),
    exception_count: metric(order === 2 ? 2 : 0),
});

const operatingLoop: OperatingStageMetric[] = [
    makeStage('intake', 1),
    makeStage('diagnosis', 2),
    makeStage('deflection', 3),
    makeStage('dispatch', 4),
    makeStage('verification', 5),
    makeStage('reporting', 6),
];

const strategicCopy: StrategicDimensionsCopy = {
    title: 'Strategic dimensions',
    dimensionLabels: {
        tam: 'TAM',
        ten_x: '10X',
        team: 'Team',
        financials: 'Financials',
    },
    confidenceLabels: {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        unavailable: 'Unavailable confidence',
    },
    scoreLabel: 'Score',
    trendLabel: 'Trend',
    confidenceLabel: 'Confidence',
    formulaLabel: 'Formula',
    sourceLabel: 'Source',
    evidenceLabel: 'Evidence',
    selectDimensionLabel: 'Inspect dimension',
    emptyLabel: 'No strategic dimensions',
};

const alertsCopy: StrategyAlertsCopy = {
    title: 'Strategy alerts',
    severityLabels: {
        critical: 'Critical',
        warning: 'Warning',
        info: 'Information',
    },
    ownerLabels: {
        operations: 'Operations',
        finance: 'Finance',
        workforce: 'Workforce',
        quality: 'Quality',
    },
    stageLabels,
    comparatorLabels: {
        gt: '>',
        gte: '>=',
        lt: '<',
        lte: '<=',
    },
    metricLabels: {
        diagnosis_accuracy_pct: 'Diagnosis accuracy',
    },
    recommendationLabels: {
        review_quality: 'Review quality evidence',
    },
    thresholdLabel: 'Threshold',
    generatedLabel: 'Generated',
    recommendationLabel: 'Recommendation',
    approvalLabels: {
        required: 'Human approval required',
        notRequired: 'No human approval required',
    },
    noStageLabel: 'Cross-stage',
    openAlertLabel: 'Open alert',
    acknowledgeLabel: 'Acknowledge alert',
    emptyLabel: 'No alerts',
};

const agentCopy: AgentOperationsCopy = {
    title: 'Agent operations',
    tableCaption: 'Agent status records',
    agentLabel: 'Agent',
    statusLabel: 'Status',
    workflowLabel: 'Workflow',
    modelsLabel: 'Models',
    callsLabel: 'Calls',
    tokensLabel: 'Tokens',
    totalTokensLabel: 'Total',
    inputTokensLabel: 'Input',
    outputTokensLabel: 'Output',
    costLabel: 'Cost',
    latencyLabel: 'Latency',
    averageLatencyLabel: 'Average',
    p95LatencyLabel: 'P95',
    successLabel: 'Success',
    lastActiveLabel: 'Last active',
    statusLabels: {
        online: 'Online',
        idle: 'Idle',
        offline: 'Offline',
    },
    workflowLabels: {
        ...stageLabels,
        cross_stage: 'Cross-stage',
    },
    inspectAgentLabel: 'Inspect agent',
    emptyLabel: 'No agent records',
};

const agent: AgentOperationMetric = {
    id: 'diagnosis-agent',
    display_code: 'DIAG-01',
    workflow_stage: 'diagnosis',
    status: 'online',
    models: ['gemini-2.5-flash'],
    calls: metric(18),
    input_tokens: metric(1200),
    output_tokens: metric(440),
    total_tokens: metric(1640),
    cost_cny: metric(2.4, 'cny'),
    average_latency_ms: metric(820, 'milliseconds'),
    p95_latency_ms: metric(null, 'milliseconds', 'unavailable', 'No p95 samples'),
    success_rate_pct: metric(97.5, 'percent'),
    last_active_at: '2026-07-26T08:00:00.000Z',
};

const systemLoadCopy: SystemLoadCopy = {
    title: 'System load',
    observationStartedLabel: 'Observation started',
    throughputLabel: 'Throughput',
    successRateLabel: 'Success rate',
    averageLatencyLabel: 'Average latency',
    p95LatencyLabel: 'P95 latency',
    activeAgentsLabel: 'Active agents',
    utilizationLabel: 'Utilization',
    trendLabel: 'Throughput trend',
    samplesTableCaption: 'System load samples',
    timestampLabel: 'Timestamp',
    emptySamplesLabel: 'No historical samples',
};

const systemLoad: SystemLoadMetric = {
    observation_started_at: '2026-07-26T07:00:00.000Z',
    throughput_per_minute: metric(14, 'requests_per_minute'),
    success_rate_pct: metric(98, 'percent'),
    average_latency_ms: metric(720, 'milliseconds'),
    p95_latency_ms: metric(null, 'milliseconds', 'unavailable', 'P95 unavailable'),
    active_agents: metric(3),
    utilization_pct: metric(null, 'percent', 'unavailable', 'Capacity not configured'),
    samples: [
        {
            timestamp: '2026-07-26T07:00:00.000Z',
            throughput_per_minute: 10,
            success_rate_pct: 97,
            average_latency_ms: 760,
        },
        {
            timestamp: '2026-07-26T08:00:00.000Z',
            throughput_per_minute: 14,
            success_rate_pct: null,
            average_latency_ms: 720,
        },
    ],
};

const marketCopy: MarketIntelligenceCopy = {
    title: 'Market intelligence',
    sectorLabel: 'Sector',
    sectorPlaceholder: 'Sector name',
    focusLabel: 'Focus',
    focusPlaceholder: 'Research focus',
    costEstimateLabel: 'Cost estimate',
    budgetLabel: 'Budget state',
    budgetStateLabels: {
        within_budget: 'Within budget',
    },
    runLabel: 'Run research',
    runningLabel: 'Running research',
    historyLabel: 'Research history',
    latestResultLabel: 'Latest result',
    verdictLabel: 'Verdict',
    summaryLabel: 'Executive summary',
    evidenceCountLabel: 'Evidence count',
    runDurationLabel: 'Run duration',
    generatedLabel: 'Generated',
    validationLabel: 'Validation',
    validationStatusLabels: {
        passed: 'Passed',
        failed: 'Failed',
        pending: 'Pending',
        unavailable: 'Unavailable',
    },
    validationAgentLabels: {
        data: 'Data agent',
        social: 'Social agent',
        simulation: 'Simulation agent',
    },
    verdictLabels: {
        GO: 'Go',
    },
    noValidationLabel: 'No validation records',
};

const efficiencyCopy: EfficiencyTopologyCopy = {
    title: 'Efficiency topology',
    compositionLabel: 'Measured efficiency composition',
    categoryLabels: {
        aiCompute: 'AI compute',
        coordination: 'Coordination',
        idle: 'Idle',
    },
    costOptimizationLabel: 'Cost optimization',
    baselineModelLabel: 'Baseline model',
    baselinePeriodLabel: 'Baseline period',
    compositionUnavailableLabel: 'Composition unavailable',
    openEvidenceLabel: 'Open efficiency evidence',
};

describe('CompanyPulse', () => {
    it('renders supplied values with measurement states and never substitutes zero', () => {
        const onSelectMetric = vi.fn();

        render(
            <CompanyPulse
                data={pulse}
                copy={pulseCopy}
                valueCopy={valueCopy}
                metricOrder={['active_work_orders', 'sla_attainment_pct']}
                context={{
                    active_work_orders: {
                        comparison: metric(3, 'count', 'estimated'),
                        target: metric(10),
                        freshness: {
                            value: '2026-07-26 08:00',
                            measurement: 'measured',
                        },
                    },
                }}
                onSelectMetric={onSelectMetric}
            />,
        );

        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('No SLA denominator')).toBeInTheDocument();
        expect(screen.queryByText('0%')).not.toBeInTheDocument();
        expect(screen.getAllByText('Measured').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Estimated').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', {
            name: 'Inspect metric: Active work orders',
        }));
        expect(onSelectMetric).toHaveBeenCalledWith(
            'active_work_orders',
            pulse.active_work_orders,
        );
    });
});

describe('OperatingLoopHealth', () => {
    it('renders all six ordered stages and emits the selected wire stage', () => {
        const onSelectStage = vi.fn();

        render(
            <OperatingLoopHealth
                stages={[...operatingLoop].reverse()}
                copy={loopCopy}
                valueCopy={valueCopy}
                selectedStage="diagnosis"
                onSelectStage={onSelectStage}
            />,
        );

        expect(screen.getAllByRole('listitem')).toHaveLength(6);
        expect(screen.getAllByText('No transition ledger')).toHaveLength(6);
        const stageButtons = screen.getAllByRole('button');
        expect(stageButtons[0]).toHaveAccessibleName('Filter stage: Intake');
        expect(screen.getByRole('button', {
            name: 'Filter stage: Diagnosis',
        })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(screen.getByRole('button', {
            name: 'Filter stage: Dispatch',
        }));
        expect(onSelectStage).toHaveBeenCalledWith('dispatch', operatingLoop[3]);
    });
});

describe('StrategicDimensions', () => {
    it('keeps a missing score and missing trend visibly unavailable', () => {
        const onSelectDimension = vi.fn();
        const dimension = {
            id: 'tam' as const,
            score: metric(null, 'score_10', 'unavailable', 'No validated research run'),
            confidence: 'unavailable' as const,
            formula_version: 'tam-v1',
            evidence_metric_ids: [],
        };

        render(
            <StrategicDimensions
                dimensions={[dimension]}
                copy={strategicCopy}
                valueCopy={valueCopy}
                onSelectDimension={onSelectDimension}
            />,
        );

        expect(screen.getByText('No validated research run')).toBeInTheDocument();
        expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('tam-v1')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: 'Inspect dimension: TAM',
        }));
        expect(onSelectDimension).toHaveBeenCalledWith('tam', dimension);
    });
});

describe('StrategyAlerts', () => {
    it('renders rule evidence and delegates detail and acknowledgement actions', () => {
        const alert = {
            id: 'quality-1',
            severity: 'warning' as const,
            owner: 'quality' as const,
            stage: 'diagnosis' as const,
            metric_id: 'diagnosis_accuracy_pct',
            metric: metric(81, 'percent'),
            threshold: 85,
            comparator: 'lt' as const,
            recommendation_code: 'review_quality',
            requires_human_approval: true,
            generated_at: '2026-07-26T08:00:00.000Z',
        };
        const onSelectAlert = vi.fn();
        const onAcknowledgeAlert = vi.fn();

        render(
            <StrategyAlerts
                alerts={[alert]}
                copy={alertsCopy}
                valueCopy={valueCopy}
                onSelectAlert={onSelectAlert}
                onAcknowledgeAlert={onAcknowledgeAlert}
            />,
        );

        expect(screen.getByText('81%')).toBeInTheDocument();
        expect(screen.getByText(/Threshold:/)).toHaveTextContent('Threshold: < 85%');
        expect(screen.getByText('Human approval required')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open alert: quality-1' }));
        fireEvent.click(screen.getByRole('button', {
            name: 'Acknowledge alert: quality-1',
        }));
        expect(onSelectAlert).toHaveBeenCalledWith(alert);
        expect(onAcknowledgeAlert).toHaveBeenCalledWith(alert);
    });
});

describe('AgentOperations', () => {
    it('renders a contained accessible table and delegates agent inspection', () => {
        const onSelectAgent = vi.fn();

        render(
            <AgentOperations
                agents={[agent]}
                copy={agentCopy}
                valueCopy={valueCopy}
                onSelectAgent={onSelectAgent}
            />,
        );

        const table = screen.getByRole('table', { name: 'Agent status records' });
        expect(within(table).getByText('DIAG-01')).toBeInTheDocument();
        expect(within(table).getByText('No p95 samples')).toBeInTheDocument();
        expect(within(table).getByText('Online')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: 'Inspect agent: DIAG-01',
        }));
        expect(onSelectAgent).toHaveBeenCalledWith(agent);
    });
});

describe('SystemLoad', () => {
    it('renders a table equivalent for the supplied trend and labels null samples unavailable', () => {
        const { container } = render(
            <SystemLoad
                data={systemLoad}
                copy={systemLoadCopy}
                valueCopy={valueCopy}
            />,
        );

        const table = screen.getByRole('table', { name: 'System load samples' });
        expect(within(table).getAllByRole('row')).toHaveLength(3);
        expect(within(table).getAllByText('Unavailable').length).toBeGreaterThan(0);
        expect(container.querySelectorAll('.eam-load-column')).toHaveLength(2);
        expect(container.querySelector('[class*="map"]')).not.toBeInTheDocument();
    });
});

describe('MarketIntelligence', () => {
    it('is controlled and never runs research during render', () => {
        const onRun = vi.fn();
        const onSectorChange = vi.fn();
        const onFocusChange = vi.fn();

        render(
            <MarketIntelligence
                intelligence={{
                    latest: null,
                    measurement: 'unavailable',
                    reason: 'No durable research history',
                }}
                sector="Property services"
                focus="Automation demand"
                costEstimate={metric(18, 'cny', 'estimated')}
                budgetState={{
                    state: 'within_budget',
                    measurement: 'measured',
                }}
                canRun
                copy={marketCopy}
                valueCopy={valueCopy}
                onSectorChange={onSectorChange}
                onFocusChange={onFocusChange}
                onRun={onRun}
            />,
        );

        expect(onRun).not.toHaveBeenCalled();
        expect(screen.getByText('No durable research history')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Sector'), {
            target: { value: 'Facilities' },
        });
        fireEvent.change(screen.getByLabelText('Focus'), {
            target: { value: 'Dispatch' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Run research' }));

        expect(onSectorChange).toHaveBeenCalledWith('Facilities');
        expect(onFocusChange).toHaveBeenCalledWith('Dispatch');
        expect(onRun).toHaveBeenCalledTimes(1);
    });

    it('renders only supplied latest-run evidence and validation values', () => {
        render(
            <MarketIntelligence
                intelligence={{
                    latest: null,
                    measurement: 'unavailable',
                    reason: 'No durable research history',
                }}
                latestRun={{
                    id: 'research-1',
                    sector: 'Property services',
                    focus: 'Automation demand',
                    generated_at: '2026-07-26T08:00:00.000Z',
                    measurement: 'estimated',
                    verdict: 'GO',
                    executive_summary: 'Supplied research summary.',
                    evidence_count: metric(3),
                    run_duration: metric(9200, 'milliseconds'),
                    validation: [
                        {
                            id: 'data',
                            status: 'passed',
                            measurement: 'measured',
                        },
                        {
                            id: 'social',
                            status: 'passed',
                            measurement: 'measured',
                        },
                        {
                            id: 'simulation',
                            status: 'pending',
                            measurement: 'unavailable',
                        },
                    ],
                }}
                sector="Property services"
                focus="Automation demand"
                costEstimate={metric(18, 'cny', 'estimated')}
                budgetState={{
                    state: 'within_budget',
                    measurement: 'measured',
                }}
                canRun={false}
                copy={marketCopy}
                valueCopy={valueCopy}
            />,
        );

        expect(screen.getByText('Supplied research summary.')).toBeInTheDocument();
        expect(screen.getByText('Go')).toBeInTheDocument();
        expect(screen.getAllByText('Passed')).toHaveLength(2);
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });
});

describe('EfficiencyTopology', () => {
    it('renders supplied shares without correcting or inventing values', () => {
        const data: EfficiencyMetric = {
            ai_compute_share_pct: metric(50, 'percent'),
            coordination_share_pct: metric(30, 'percent'),
            idle_share_pct: metric(20, 'percent', 'estimated'),
            cost_optimization_pct: metric(8, 'percent', 'estimated'),
        };
        const onOpenEvidence = vi.fn();

        render(
            <EfficiencyTopology
                data={data}
                copy={efficiencyCopy}
                valueCopy={valueCopy}
                baseline={{
                    model: 'baseline-model-v1',
                    period: '2026-Q2',
                    measurement: 'measured',
                }}
                onOpenEvidence={onOpenEvidence}
            />,
        );

        expect(screen.getByRole('img', {
            name: 'Measured efficiency composition',
        })).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
        expect(screen.getByText('baseline-model-v1')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: 'Open efficiency evidence',
        }));
        expect(onOpenEvidence).toHaveBeenCalledTimes(1);
    });

    it('withholds the composition graphic when any category is unavailable', () => {
        const data: EfficiencyMetric = {
            ai_compute_share_pct: metric(60, 'percent'),
            coordination_share_pct: metric(
                null,
                'percent',
                'unavailable',
                'No coordination timing',
            ),
            idle_share_pct: metric(40, 'percent'),
            cost_optimization_pct: metric(
                null,
                'percent',
                'unavailable',
                'No baseline',
            ),
        };

        render(
            <EfficiencyTopology
                data={data}
                copy={efficiencyCopy}
                valueCopy={valueCopy}
            />,
        );

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('Composition unavailable')).toBeInTheDocument();
        expect(screen.getByText('No coordination timing')).toBeInTheDocument();
        expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });
});
