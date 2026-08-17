// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';
import WorkerDashboardPage from './WorkerDashboardPage';
import {
    acceptJob,
    getAvailableOrders,
    getMyWorkerJobs,
    getWorkerDashboard,
    updateWorkerAvailability,
} from '../services/api';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 2, name: 'Zhang Pro', role: 'worker' },
    }),
}));

vi.mock('../services/api', () => ({
    acceptJob: vi.fn(),
    getAvailableOrders: vi.fn(),
    getMyWorkerJobs: vi.fn(),
    getWorkerDashboard: vi.fn(),
    updateWorkerAvailability: vi.fn(),
}));

const mockGetAvailableOrders = vi.mocked(getAvailableOrders);
const mockGetMyWorkerJobs = vi.mocked(getMyWorkerJobs);
const mockGetWorkerDashboard = vi.mocked(getWorkerDashboard);
const mockUpdateWorkerAvailability = vi.mocked(updateWorkerAvailability);
const mockAcceptJob = vi.mocked(acceptJob);

const availableOrder = {
    id: 101,
    title: 'Kitchen sink leak',
    description: 'Water is dripping under the cabinet.',
    category: 'plumbing',
    urgency_score: 6,
    distance_km: 2.4,
    user_name: 'Alex Chen',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
};

const workerJob = {
    id: 202,
    title: 'AC tune up',
    description: 'Clean filters and inspect condenser.',
    status: 'in_progress',
    user_name: 'Taylor Lee',
    created_at: new Date().toISOString(),
};

const renderPage = () => render(
    React.createElement(
        LanguageProvider,
        null,
        React.createElement(
            MemoryRouter,
            null,
            React.createElement(WorkerDashboardPage)
        )
    )
);

describe('WorkerDashboardPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        navigateMock.mockClear();

        mockGetAvailableOrders.mockResolvedValue({ orders: [availableOrder] });
        mockGetMyWorkerJobs.mockResolvedValue({ jobs: [workerJob] });
        mockGetWorkerDashboard.mockResolvedValue({
            worker: { id: 7, available: true },
            stats: {
                earnings: 680,
                jobsCompleted: 12,
                activeJobs: 1,
                rating: 4.8,
            },
        } as any);
        mockUpdateWorkerAvailability.mockResolvedValue({ message: 'ok' });
        mockAcceptJob.mockResolvedValue({ report: { id: 101 } } as any);
    });

    it('renders worker dashboard text in Chinese and switches the page chrome to English', async () => {
        localStorage.setItem('app_locale', 'zh');

        renderPage();

        expect(await screen.findByText('工人工作台')).toBeInTheDocument();
        expect(screen.getByText('正在接收订单')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '接单：Kitchen sink leak' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '切换语言' }));

        expect(await screen.findByText('Worker Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Receiving leads')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Claim lead: Kitchen sink leak' })).toBeInTheDocument();
    });

    it('refreshes dashboard data and toggles worker availability through the API', async () => {
        renderPage();

        const refreshButton = await screen.findByRole('button', { name: 'Refresh dashboard' });
        fireEvent.click(refreshButton);

        await waitFor(() => expect(mockGetAvailableOrders).toHaveBeenCalledTimes(2));
        expect(screen.getByText('Dashboard refreshed.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Go offline' }));

        await waitFor(() => {
            expect(mockUpdateWorkerAvailability).toHaveBeenCalledWith(7, false);
        });
        expect(screen.getByRole('button', { name: 'Go online' })).toBeInTheDocument();
        expect(screen.getByText('You are offline. New leads are paused.')).toBeInTheDocument();
    });

    it('rolls back the availability button when the API update fails', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockUpdateWorkerAvailability.mockRejectedValueOnce(new Error('network down'));

        renderPage();

        fireEvent.click(await screen.findByRole('button', { name: 'Go offline' }));

        await waitFor(() => {
            expect(mockUpdateWorkerAvailability).toHaveBeenCalledWith(7, false);
        });
        expect(await screen.findByRole('button', { name: 'Go offline' })).toBeInTheDocument();
        expect(screen.getByText('Could not update availability.')).toBeInTheDocument();
        spy.mockRestore();
    });

    it('accepts an available order and moves the worker into the jobs tab', async () => {
        renderPage();

        fireEvent.click(await screen.findByRole('button', { name: 'Claim lead: Kitchen sink leak' }));

        await waitFor(() => expect(mockAcceptJob).toHaveBeenCalledWith('101'));
        expect(await screen.findByText('Order accepted. Moving it to your jobs.')).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Open ticket #202' })).toBeInTheDocument();
    });

    it('wires tab buttons and bottom navigation to the expected views and routes', async () => {
        renderPage();

        await screen.findByRole('button', { name: 'Claim lead: Kitchen sink leak' });

        fireEvent.click(screen.getByRole('button', { name: /Jobs \(1\)/i }));
        const ticketButton = await screen.findByRole('button', { name: 'Open ticket #202' });

        fireEvent.click(ticketButton);
        expect(navigateMock).toHaveBeenCalledWith('/worker/job/202');

        fireEvent.click(screen.getByRole('button', { name: 'Open leads' }));
        expect(screen.getByRole('button', { name: 'Claim lead: Kitchen sink leak' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open job history' }));
        expect(await screen.findByRole('button', { name: 'Open ticket #202' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open alerts' }));
        expect(navigateMock).toHaveBeenCalledWith('/notifications');

        fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
        expect(navigateMock).toHaveBeenCalledWith('/profile');
    });
});
