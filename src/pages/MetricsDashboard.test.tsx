import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MetricsDashboard from './MetricsDashboard';
import { LanguageProvider } from '../i18n/LanguageContext';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', async () => {
    const actual = await vi.importActual('../services/api');
    return {
        ...actual,
        getMetrics: vi.fn(),
        getMetricsHealth: vi.fn(),
    };
});

const mockMetrics = {
    system: { uptime_ms: 3600000, uptime_human: '1h 0m 0s' },
    requests: { total: 1000, success: 950, error: 50, success_rate: '95.0%' },
    response_time: { avg_ms: '120.5', min_ms: 10.2, max_ms: 500.8 },
    sda_cycles: { total: 10, simulate_passes: 8, deploys: 5, augments: 3 },
    agents: { total_invocations: 150, by_agent: { 'Diagnostics': 100, 'Vendor': 50 } },
};

const mockHealth = {
    memory: { rss_mb: 256, heap_used_mb: 128, heap_total_mb: 512, external_mb: 32 },
    cpu: { user_ms: 1000, system_ms: 500 },
    node_version: 'v20.0.0',
    platform: 'linux',
    pid: 1234,
};

const renderMetricsDashboard = () => {
    return render(
        <LanguageProvider>
            <MetricsDashboard />
        </LanguageProvider>
    );
};

describe('MetricsDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.getMetrics as any).mockResolvedValue(mockMetrics);
        (api.getMetricsHealth as any).mockResolvedValue(mockHealth);

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

    it('should render metrics data after loading', async () => {
        renderMetricsDashboard();

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('95.0%')).toBeInTheDocument();
            expect(screen.getByText('1,000')).toBeInTheDocument();
        }, { timeout: 10000 });
    });

    it('should display SDA cycles', async () => {
        renderMetricsDashboard();

        await waitFor(() => {
            expect(screen.getByText('8')).toBeInTheDocument(); // simulate_passes
            expect(screen.getByText('5')).toBeInTheDocument(); // deploys
            expect(screen.getByText('3')).toBeInTheDocument(); // augments
        });
    });

    it('should show error state on fetch failure', async () => {
        (api.getMetrics as any).mockRejectedValue(new Error('Fetch failed'));
        renderMetricsDashboard();

        await waitFor(() => {
            expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
            expect(screen.getByText('Fetch failed')).toBeInTheDocument();
        });
    });

    it('should refresh data on interval', async () => {
        vi.useFakeTimers();
        renderMetricsDashboard();

        // Initial fetch call
        await vi.waitUntil(() => vi.mocked(api.getMetrics).mock.calls.length > 0);

        expect(api.getMetrics).toHaveBeenCalledTimes(1);

        // Fast-forward 5.1 seconds to trigger the interval
        await act(async () => {
            vi.advanceTimersByTime(5100);
        });

        expect(api.getMetrics).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it('should display agent activity', async () => {
        renderMetricsDashboard();

        await waitFor(() => {
            expect(screen.getByText('Diagnostics')).toBeInTheDocument();
            expect(screen.getByText('Vendor')).toBeInTheDocument();
            // Using getAllByText since 50 might appear in other metrics (like errors)
            const fiftyElements = screen.getAllByText('50');
            expect(fiftyElements.length).toBeGreaterThanOrEqual(1);
        });
    });
});
