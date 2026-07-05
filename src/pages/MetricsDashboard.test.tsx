import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MetricsDashboard from './MetricsDashboard';
import { LanguageProvider } from '../i18n/LanguageContext';

const renderMetricsDashboard = () => {
    return render(
        <LanguageProvider>
            <BrowserRouter>
                <MetricsDashboard />
            </BrowserRouter>
        </LanguageProvider>
    );
};

const seedOperationalMetrics = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('inquiry_metrics', JSON.stringify([
        { caseId: 'case-1', projectType: 'Plumbing', area: 'Kitchen', severity: 'high', hasPhoto: true, timestamp: `${today}T08:00:00.000Z` },
        { caseId: 'case-2', projectType: 'Electrical', area: 'Garage', severity: 'medium', hasPhoto: false, timestamp: `${today}T09:00:00.000Z` },
        { caseId: 'case-3', projectType: 'Plumbing', area: 'Kitchen', severity: 'low', hasPhoto: true, timestamp: `${today}T10:00:00.000Z` },
    ]));
    localStorage.setItem('inquiry_feedback', JSON.stringify([
        { caseId: 'case-1', rating: 4, demandAccuracy: 5, tags: ['clear'], timestamp: `${today}T11:00:00.000Z` },
        { caseId: 'case-2', rating: 5, demandAccuracy: null, tags: ['fast'], timestamp: `${today}T12:00:00.000Z` },
    ]));
};

describe('MetricsDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('app_locale', 'en');

        // Mock window.matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the operational dashboard shell', () => {
        renderMetricsDashboard();

        expect(screen.getByText('Metrics Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
        expect(screen.getByText('System Live')).toBeInTheDocument();
    });

    it('renders empty-state guidance when no inquiry data exists', () => {
        renderMetricsDashboard();

        expect(screen.getByText('Intelligence Gap')).toBeInTheDocument();
        expect(screen.getByText('Initiate Data Collection')).toBeInTheDocument();
    });

    it('renders local inquiry and feedback summary metrics', () => {
        seedOperationalMetrics();
        renderMetricsDashboard();

        expect(screen.getByText('Inquiries')).toBeInTheDocument();
        expect(screen.getByText('Conversion')).toBeInTheDocument();
        expect(screen.getByText('Photo Rate')).toBeInTheDocument();
        expect(screen.getByText('Feedbacks')).toBeInTheDocument();
        expect(screen.getAllByText('67%')).toHaveLength(2);
        expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('renders service quality gauges from collected feedback', () => {
        seedOperationalMetrics();
        renderMetricsDashboard();

        expect(screen.getByText('Service Quality')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    it('renders workload and regional distributions', () => {
        seedOperationalMetrics();
        renderMetricsDashboard();

        expect(screen.getByText('Workload Categorization')).toBeInTheDocument();
        expect(screen.getByText('Regional Density')).toBeInTheDocument();
        expect(screen.getByText('Plumbing')).toBeInTheDocument();
        expect(screen.getByText('Electrical')).toBeInTheDocument();
        expect(screen.getByText('Kitchen')).toBeInTheDocument();
        expect(screen.getByText('Garage')).toBeInTheDocument();
    });
});
