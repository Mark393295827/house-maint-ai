import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';
import {
    getAiEconomics,
    getCompanyAnalyticsOverview,
    getMarketResearchPreflight,
    runMarketResearch,
    type AiEconomicsMetrics,
    type CompanyAnalyticsMetric,
    type CompanyAnalyticsOverview,
    type MarketResearchPreflight,
    type MarketResearchReport,
} from '../services/api';
import MetricsDashboard from './MetricsDashboard';

vi.mock('../services/api', () => ({
    getAiEconomics: vi.fn(),
    getCompanyAnalyticsOverview: vi.fn(),
    getMarketResearchPreflight: vi.fn(),
    runMarketResearch: vi.fn(),
}));

const metric = (
    value: number | null,
    unit: CompanyAnalyticsMetric['unit'],
    measurement: CompanyAnalyticsMetric['measurement'] = value === null
        ? 'unavailable'
        : 'measured',
    reason: string | null = value === null ? 'No verified observation.' : null,
): CompanyAnalyticsMetric => ({
    value,
    unit,
    measurement,
    sample_size: value === null ? 0 : 12,
    source: 'test_fixture',
    reason,
});

const overviewFixture: CompanyAnalyticsOverview = {
    meta: {
        range: '30d',
        since: '2026-06-27T00:00:00.000Z',
        until: '2026-07-26T12:00:00.000Z',
        generated_at: '2026-07-26T12:00:00.000Z',
        formula_version: 'company-analytics-v1',
        freshness: 'partial',
        access_issues: [{
            source: 'sla_policy',
            message: 'No durable SLA policy ledger is available.',
        }],
    },
    pulse: {
        active_work_orders: metric(8, 'count'),
        available_workers: metric(3, 'count'),
        satisfaction: metric(4.6, 'ratio'),
        sla_attainment_pct: metric(null, 'percent'),
        deflection_rate_pct: metric(25, 'percent'),
        first_time_fix_rate_pct: metric(82, 'percent'),
        diagnosis_accuracy_pct: metric(88, 'percent'),
        revenue_cny: metric(1200, 'cny'),
        gross_margin_pct: metric(96, 'percent'),
    },
    operating_loop: ([
        ['intake', 1, 2],
        ['diagnosis', 2, 1],
        ['deflection', 3, 3],
        ['dispatch', 4, 4],
        ['verification', 5, 2],
        ['reporting', 6, 12],
    ] as const).map(([stage, order, value]) => ({
        stage,
        order,
        current_volume: metric(value, 'count'),
        conversion_to_next_pct: metric(null, 'percent'),
        median_cycle_hours: metric(null, 'hours'),
        exception_count: metric(stage === 'diagnosis' ? 1 : 0, 'count'),
    })) as CompanyAnalyticsOverview['operating_loop'],
    strategic_dimensions: [
        {
            id: 'tam',
            score: metric(null, 'score_10'),
            confidence: 'unavailable',
            formula_version: 'tam-v1',
            evidence_metric_ids: [],
        },
        {
            id: 'ten_x',
            score: metric(8.1, 'score_10', 'estimated'),
            confidence: 'medium',
            formula_version: 'ten-x-v1',
            evidence_metric_ids: ['deflection_rate_pct', 'diagnosis_accuracy_pct'],
        },
        {
            id: 'team',
            score: metric(7.8, 'score_10', 'estimated'),
            confidence: 'medium',
            formula_version: 'team-v1',
            evidence_metric_ids: ['first_time_fix_rate_pct'],
        },
        {
            id: 'financials',
            score: metric(9.4, 'score_10', 'estimated'),
            confidence: 'medium',
            formula_version: 'financials-v1',
            evidence_metric_ids: ['gross_margin_pct'],
        },
    ],
    alerts: [{
        id: 'workforce-capacity',
        severity: 'warning',
        owner: 'workforce',
        stage: 'dispatch',
        metric_id: 'work_orders_per_available_worker',
        metric: metric(4, 'ratio'),
        threshold: 3,
        comparator: 'gt',
        recommendation_code: 'review_workforce_capacity',
        requires_human_approval: true,
        generated_at: '2026-07-26T12:00:00.000Z',
    }],
    agent_operations: [{
        id: 'diagnosis-agent',
        display_code: 'Diagnosis Agent',
        workflow_stage: 'diagnosis',
        status: 'online',
        models: ['gemini-1.5-flash'],
        calls: metric(12, 'count'),
        input_tokens: metric(600, 'count'),
        output_tokens: metric(400, 'count'),
        total_tokens: metric(1000, 'count'),
        cost_cny: metric(0.72, 'cny'),
        average_latency_ms: metric(840, 'milliseconds'),
        p95_latency_ms: metric(null, 'milliseconds'),
        success_rate_pct: metric(null, 'percent'),
        last_active_at: '2026-07-26T11:58:00.000Z',
    }],
    system_load: {
        observation_started_at: '2026-07-26T08:00:00.000Z',
        throughput_per_minute: metric(2.5, 'requests_per_minute'),
        success_rate_pct: metric(99, 'percent'),
        average_latency_ms: metric(42, 'milliseconds'),
        p95_latency_ms: metric(null, 'milliseconds'),
        active_agents: metric(1, 'count'),
        utilization_pct: metric(null, 'percent'),
        samples: [],
    },
    efficiency: {
        ai_compute_share_pct: metric(null, 'percent'),
        coordination_share_pct: metric(null, 'percent'),
        idle_share_pct: metric(null, 'percent'),
        cost_optimization_pct: metric(null, 'percent'),
    },
    intelligence: {
        latest: null,
        measurement: 'unavailable',
        reason: 'No durable research history.',
    },
};

const economicsFixture: AiEconomicsMetrics = {
    period: {
        range: '30d',
        since: '2026-06-27T00:00:00.000Z',
        generated_at: '2026-07-26T12:00:00.000Z',
    },
    totals: {
        key: 'all',
        calls: 12,
        input_tokens: 600,
        output_tokens: 400,
        total_tokens: 1000,
        output_share_pct: 40,
        total_to_output_ratio: 2.5,
        cost_usd: 0.1,
        cost_cny: 0.72,
        estimated_business_value_cny: 720,
        avg_duration_ms: 840,
        return_on_inference: 1000,
        inference_to_value_pct: 0.1,
        tier: 'excellent',
        zero_cost_usage: false,
    },
    by_model: [{
        key: 'gemini-1.5-flash',
        calls: 12,
        input_tokens: 600,
        output_tokens: 400,
        total_tokens: 1000,
        output_share_pct: 40,
        total_to_output_ratio: 2.5,
        cost_usd: 0.1,
        cost_cny: 0.72,
        estimated_business_value_cny: 720,
        avg_duration_ms: 840,
    }],
    by_endpoint: [{
        key: '/api/ai/diagnose',
        calls: 12,
        input_tokens: 600,
        output_tokens: 400,
        total_tokens: 1000,
        output_share_pct: 40,
        total_to_output_ratio: 2.5,
        cost_usd: 0.1,
        cost_cny: 0.72,
        estimated_business_value_cny: 720,
        avg_duration_ms: 840,
    }],
    daily: [{
        date: '2026-07-26',
        input_tokens: 600,
        output_tokens: 400,
        total_tokens: 1000,
        cost_usd: 0.1,
    }],
};

const researchFixture: MarketResearchReport = {
    sector: 'Local property maintenance',
    generated_at: '2026-07-26T12:30:00.000Z',
    pain_points: {
        sector: 'Local property maintenance',
        top_complaints: [{
            keyword: 'slow response',
            frequency_score: 8,
            source: 'research sample',
            implication: 'Coordination opportunity',
        }],
        pain_density_score: 70,
        primary_bottleneck: 'scheduling',
        ai_intervention_point: 'Dispatch coordination',
    },
    digital_vacuum: {
        sector: 'Local property maintenance',
        manual_hours_per_day: 6,
        total_operational_hours: 8,
        vacuum_ratio: 0.75,
        vacuum_grade: 'A',
        key_manual_processes: ['dispatch'],
        automation_feasibility: 80,
    },
    tam_expansion: {
        sector: 'Local property maintenance',
        current_tam_cny: 100000,
        ai_cost_reduction_pct: 30,
        suppressed_demand_multiplier: 1.5,
        expanded_tam_cny: 250000,
        long_tail_segments: ['small landlords'],
        timeline_to_capture: '12 months',
    },
    go_no_go: {
        incremental_demand: { pass: true, evidence: 'Demand evidence found.' },
        tenx_possibility: { pass: true, evidence: 'Automation leverage found.' },
        competitive_moat: { pass: false, evidence: 'More evidence is required.' },
        overall_verdict: 'NEEDS_MORE_DATA',
    },
    executive_summary: 'Validate the dispatch wedge before expanding.',
    confidence_score: 72,
};

const researchPreflightFixture: MarketResearchPreflight = {
    state: 'available',
    allowed: true,
    measurement: 'measured',
    period: '2026-07-26',
    budget_cny: 10,
    reserved_cny: 0,
    spent_cny: 1,
    remaining_cny: 9,
    estimated_run_cost_cny: 0.5,
    reason_code: null,
};

const renderDashboard = () => render(
    <LanguageProvider>
        <MemoryRouter initialEntries={['/enterprise/analytics']}>
            <MetricsDashboard />
        </MemoryRouter>
    </LanguageProvider>,
);

describe('MetricsDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('app_locale', 'en');
        localStorage.setItem('inquiry_metrics', JSON.stringify([{
            projectType: 'Browser-only Plumbing',
        }]));
        vi.mocked(getCompanyAnalyticsOverview).mockResolvedValue(overviewFixture);
        vi.mocked(getAiEconomics).mockResolvedValue(economicsFixture);
        vi.mocked(getMarketResearchPreflight).mockResolvedValue(researchPreflightFixture);
        vi.mocked(runMarketResearch).mockResolvedValue(researchFixture);
    });

    it('renders the company operating loop, reference modules, and measured economics without a map', async () => {
        renderDashboard();

        expect(screen.getByRole('heading', {
            name: 'Company Operations Intelligence',
        })).toBeInTheDocument();
        expect((await screen.findAllByText('Active Work Orders')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Intake').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Diagnosis').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Deflection').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Dispatch').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Verification').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Reporting').length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: 'Strategic Outlook' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Agent Swarm Status' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'System Load' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Strategy Control Alerts' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Automated Market Intelligence' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Efficiency Topology' })).toBeInTheDocument();

        const tokenPanel = screen.getByRole('heading', { name: 'Token Efficiency' }).closest('article');
        expect(tokenPanel).not.toBeNull();
        expect(within(tokenPanel as HTMLElement).getByText('2.5 : 1')).toBeInTheDocument();
        expect(within(tokenPanel as HTMLElement).getByText('40%')).toBeInTheDocument();
        expect(screen.getAllByText('gemini-1.5-flash').length).toBeGreaterThan(0);
        expect(screen.getByText('Estimated AI-Created Value')).toBeInTheDocument();
        expect(screen.queryByText('Browser-only Plumbing')).not.toBeInTheDocument();
        expect(screen.queryByText(/technician deployment/i)).not.toBeInTheDocument();
        expect(runMarketResearch).not.toHaveBeenCalled();
    });

    it('visualizes every loaded data domain and preserves unavailable series as empty', async () => {
        const { container } = renderDashboard();

        const atlasHeading = await screen.findByRole('heading', { name: 'Full Data Atlas' });
        const atlas = container.querySelector('#visualizations');
        const stagePerformanceHeading = screen.getByRole('heading', {
            name: 'Stage Conversion and Cycle Time',
        });

        expect(atlasHeading).toBeInTheDocument();
        expect(atlas).not.toBeNull();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Stage Volume and Exceptions',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Company Percentage Metrics',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Strategic Dimension Scores',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Token Volume by Agent',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Agent Calls, Latency, and Token Scale',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'System Load Timeline',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Daily Token and Cost Timeline',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Model Token Mix',
        })).toBeInTheDocument();
        expect(within(atlas as HTMLElement).getByRole('heading', {
            name: 'Endpoint Business Value and Cost',
        })).toBeInTheDocument();
        expect(within(stagePerformanceHeading.closest('article') as HTMLElement).getByText(
            'No verified values are available for this visualization.',
        )).toBeInTheDocument();
    });

    it('keeps the redesigned operating, AI runtime, and intelligence domains structurally distinct', async () => {
        const { container } = renderDashboard();

        await screen.findByRole('heading', { name: 'Company Pulse' });

        const operationsDomain = container.querySelector('#operations');
        const aiDomain = container.querySelector('#ai-agents');
        const intelligenceDomain = container.querySelector('#intelligence');

        expect(container.querySelector('.analytics-google-operations')).not.toBeNull();
        expect(operationsDomain).not.toBeNull();
        expect(aiDomain).not.toBeNull();
        expect(intelligenceDomain).not.toBeNull();
        expect(within(operationsDomain as HTMLElement).getByRole('heading', {
            name: 'Operating Loop Health',
        })).toBeInTheDocument();
        expect(within(operationsDomain as HTMLElement).getByRole('heading', {
            name: 'Strategy Control Alerts',
        })).toBeInTheDocument();
        expect(within(aiDomain as HTMLElement).getByRole('heading', {
            name: 'Agent Swarm Status',
        })).toBeInTheDocument();
        expect(within(aiDomain as HTMLElement).getByRole('heading', {
            name: 'System Load',
        })).toBeInTheDocument();
        expect(within(aiDomain as HTMLElement).getByRole('heading', {
            name: 'Efficiency Topology',
        })).toBeInTheDocument();
        expect(within(intelligenceDomain as HTMLElement).queryByRole('heading', {
            name: 'Efficiency Topology',
        })).not.toBeInTheDocument();
    });

    it('localizes backend diagnostic reasons before rendering them', async () => {
        localStorage.setItem('app_locale', 'zh');
        renderDashboard();

        expect(await screen.findByRole('heading', { name: '公司运营情报' }))
            .toBeInTheDocument();
        expect(screen.queryByText('No verified observation.')).not.toBeInTheDocument();
        expect(screen.queryByText('No durable research history.')).not.toBeInTheDocument();
        expect(screen.getAllByText('无法读取所需数据源。').length).toBeGreaterThan(0);
    });

    it('uses one URL-backed range to refresh company and economics sources', async () => {
        const user = userEvent.setup();
        renderDashboard();

        await waitFor(() => {
            expect(getCompanyAnalyticsOverview).toHaveBeenCalledWith('30d');
            expect(getAiEconomics).toHaveBeenCalledWith('30d');
        });
        await user.click(screen.getByRole('button', { name: 'Last 7 Days' }));

        await waitFor(() => {
            expect(getCompanyAnalyticsOverview).toHaveBeenCalledWith('7d');
            expect(getAiEconomics).toHaveBeenCalledWith('7d');
        });
        expect(screen.getByRole('button', { name: 'Last 7 Days' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('opens source evidence from a company pulse metric', async () => {
        const user = userEvent.setup();
        renderDashboard();

        const metricButton = await screen.findByRole('button', {
            name: 'Open Metric Evidence: Active Work Orders',
        });
        await user.click(metricButton);

        const evidenceHeading = screen.getByRole('heading', {
            name: 'Supporting Evidence · Active Work Orders',
        });
        const evidencePanel = evidenceHeading.closest('article');
        expect(evidencePanel).not.toBeNull();
        expect(within(evidencePanel as HTMLElement).getByText('test_fixture')).toBeInTheDocument();
        expect(within(evidencePanel as HTMLElement).getByText('12')).toBeInTheDocument();
    });

    it('keeps measured economics available when the company overview is unavailable', async () => {
        vi.mocked(getCompanyAnalyticsOverview).mockRejectedValueOnce(new Error('offline'));
        renderDashboard();

        expect(await screen.findByText('Some Sources Are Unavailable')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Token Efficiency' })).toBeInTheDocument();
        expect(await screen.findByText('gemini-1.5-flash')).toBeInTheDocument();
        expect(screen.getByText('Analytics Could Not Be Loaded')).toBeInTheDocument();
    });

    it('renders economics as unavailable instead of synthesizing measured zeroes', async () => {
        vi.mocked(getAiEconomics).mockRejectedValueOnce(new Error('offline'));
        renderDashboard();

        const tokenPanel = await screen.findByRole('heading', {
            name: 'Token Efficiency',
        }).then((heading) => heading.closest('article'));
        expect(tokenPanel).not.toBeNull();
        expect(within(tokenPanel as HTMLElement).getByText('Unavailable')).toBeInTheDocument();
        expect(within(tokenPanel as HTMLElement).getByText(
            'The AI economics ledger could not provide the required value.',
        )).toBeInTheDocument();
        expect(screen.queryByRole('img', {
            name: 'Token usage by period, with output-token share highlighted.',
        })).not.toBeInTheDocument();
    });

    it('marks token ratios unavailable for zero-token calls', async () => {
        vi.mocked(getAiEconomics).mockResolvedValueOnce({
            ...economicsFixture,
            totals: {
                ...economicsFixture.totals,
                calls: 3,
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
                output_share_pct: 0,
                total_to_output_ratio: null,
            },
        });
        renderDashboard();

        const tokenPanel = await screen.findByRole('heading', {
            name: 'Token Efficiency',
        }).then((heading) => heading.closest('article'));
        expect(tokenPanel).not.toBeNull();
        expect(within(tokenPanel as HTMLElement).getAllByText('—').length).toBeGreaterThan(0);
        expect(within(tokenPanel as HTMLElement).getByText(
            'The denominator is zero, so a percentage or ratio cannot be calculated.',
        )).toBeInTheDocument();
    });

    it('runs market intelligence only after an explicit user action', async () => {
        const user = userEvent.setup();
        renderDashboard();

        const runButton = await screen.findByRole('button', {
            name: 'Execute Intelligence Scan',
        });
        expect(runMarketResearch).not.toHaveBeenCalled();
        await user.click(runButton);

        await waitFor(() => expect(runMarketResearch).toHaveBeenCalledWith({
            sector: 'Local property maintenance',
            focusArea: 'Operating efficiency and demand gaps',
            locale: 'en',
        }));
        expect(await screen.findByText(
            'Validate the dispatch wedge before expanding.',
        )).toBeInTheDocument();
        expect(screen.getByText('Incremental Demand')).toBeInTheDocument();
    });

    it('fails closed when the research budget preflight is unavailable', async () => {
        vi.mocked(getMarketResearchPreflight).mockResolvedValueOnce({
            ...researchPreflightFixture,
            state: 'unavailable',
            allowed: false,
            measurement: 'unavailable',
            budget_cny: null,
            reserved_cny: null,
            spent_cny: null,
            remaining_cny: null,
            estimated_run_cost_cny: null,
            reason_code: 'research_budget_settings_missing',
        });
        const user = userEvent.setup();
        renderDashboard();

        const runButton = await screen.findByRole('button', {
            name: 'Execute Intelligence Scan',
        });
        expect(runButton).toBeDisabled();
        await user.click(runButton);
        expect(runMarketResearch).not.toHaveBeenCalled();
    });
});
