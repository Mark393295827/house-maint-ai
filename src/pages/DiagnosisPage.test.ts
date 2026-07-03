// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { getOperatingStageCopies } from '../constants/operatingModel';
import DiagnosisPage from './DiagnosisPage';
import type { DemandData } from '../components/diagnosis/DemandSummary';

const mocks = vi.hoisted(() => ({
    inquiryChat: vi.fn(),
    mutateAsync: vi.fn(),
    navigate: vi.fn(),
    showToast: vi.fn(),
}));

vi.mock('../services/ai', () => ({
    inquiryChat: mocks.inquiryChat,
}));

vi.mock('../services/analytics', () => ({
    default: {
        track: vi.fn(),
    },
}));

vi.mock('../hooks/useReports', () => ({
    useCreateReport: () => ({
        mutateAsync: mocks.mutateAsync,
    }),
}));

vi.mock('../contexts/ToastContext', () => ({
    useToast: () => ({
        showToast: mocks.showToast,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
    };
});

const demandSummary: DemandData = {
    projectType: 'plumbing',
    area: 'Kitchen',
    scope: 'Water is dripping under the sink.',
    budget: 'RMB120-200',
    timeline: 'Today',
    severity: 'low',
    specialRequirements: 'Tenant can try a simple reset first.',
    hasPhoto: false,
};

function renderDiagnosisPage() {
    return render(
        React.createElement(
            LanguageProvider,
            null,
            React.createElement(MemoryRouter, null, React.createElement(DiagnosisPage))
        )
    );
}

async function completeInquiry(summary = demandSummary) {
    mocks.inquiryChat.mockResolvedValueOnce({
        type: 'summary',
        message: 'I have enough context to summarize the request.',
        questions: [],
        quickReplies: [],
        progress: 68,
        demandSummary: summary,
    });

    renderDiagnosisPage();

    fireEvent.click(await screen.findByRole('button', { name: /plumbing/i }));

    await waitFor(() => expect(mocks.inquiryChat).toHaveBeenCalledTimes(1));

    await screen.findByText('Identity Summary', {}, { timeout: 2500 });
}

describe('DiagnosisPage operating loop', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('app_locale', 'en');
        mocks.inquiryChat.mockReset();
        mocks.mutateAsync.mockReset();
        mocks.navigate.mockReset();
        mocks.showToast.mockReset();
        mocks.mutateAsync.mockResolvedValue({
            report: {
                id: 42,
                user_id: 1,
                title: 'Kitchen leak',
                description: 'Water is dripping under the sink.',
                status: 'matched',
                created_at: new Date('2026-07-03T00:00:00.000Z').toISOString(),
            },
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('starts with the shared six-stage operating loop instead of stale 8-step framing', async () => {
        renderDiagnosisPage();

        expect(await screen.findByText('Diagnosis Assistant')).toBeInTheDocument();
        expect(screen.getByText('Operating loop')).toBeInTheDocument();
        expect(screen.getByText('1/6')).toBeInTheDocument();

        for (const stage of getOperatingStageCopies('en')) {
            expect(screen.getAllByText(stage.title).length).toBeGreaterThan(0);
        }

        expect(screen.queryByText(/8-step|step 1\/8|8 steps/i)).not.toBeInTheDocument();
    });

    it('surfaces the DIY deflection gate before dispatch', async () => {
        await completeInquiry();

        expect(screen.getByText('3/6')).toBeInTheDocument();
        expect(screen.getAllByText('DIY deflection').length).toBeGreaterThan(0);
        expect(screen.getByText('DIY deflection check')).toBeInTheDocument();
        expect(screen.getByText(/Low-risk cases receive a safe self-serve check before dispatch/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /match provider now/i })).toBeInTheDocument();
    });

    it('continues from dispatch into verification and reporting touchpoints', async () => {
        await completeInquiry({
            ...demandSummary,
            severity: 'moderate',
            specialRequirements: 'Escalate if leak worsens.',
        });

        fireEvent.click(screen.getByRole('button', { name: /match provider now/i }));

        expect(screen.getByText('4/6')).toBeInTheDocument();
        expect(screen.getAllByText('Geo-ranked worker dispatch').length).toBeGreaterThan(0);

        fireEvent.click(await screen.findByRole('button', { name: /confirm dispatch/i }, { timeout: 4500 }));

        await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));

        expect(await screen.findByText('5/6')).toBeInTheDocument();
        expect(screen.getByText('Repair verification queued')).toBeInTheDocument();
        expect(screen.getByText('Owner reporting prepared')).toBeInTheDocument();
        expect(screen.queryByText(/8-step|step 8/i)).not.toBeInTheDocument();
    });
});
