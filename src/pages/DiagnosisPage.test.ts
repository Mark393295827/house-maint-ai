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
    solveProblem: vi.fn(),
    mutateAsync: vi.fn(),
    submitAiFeedback: vi.fn(),
    navigate: vi.fn(),
    showToast: vi.fn(),
}));

vi.mock('../services/ai', () => ({
    inquiryChat: mocks.inquiryChat,
    solveProblem: mocks.solveProblem,
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

vi.mock('../services/api', () => ({
    submitAiFeedback: mocks.submitAiFeedback,
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

const problemSolvingLoop = {
    loopVersion: 'codex-six-stage-v1',
    provider: 'mock-codex-loop',
    modelName: 'gpt-5.5-mock',
    stages: getOperatingStageCopies('en').map((stage) => ({
        stageId: stage.id,
        title: stage.title,
        status: 'ready',
        ownerAgentId: stage.ownerAgentId,
        gate: stage.gate,
        summary: stage.description,
        touchpoints: stage.details,
        evidenceRequired: ['Photo evidence'],
    })),
    diagnosis: {
        issueType: 'Under-sink leak',
        category: 'plumbing',
        severity: 'low',
        confidence: 0.82,
        responsibility: 'undetermined',
        rootCauseSummary: 'Likely a loose or worn seal that should be verified before dispatch.',
        urgencyScore: 3,
        safetyWarnings: [],
    },
    deflection: {
        eligible: true,
        safetyGate: 'Try only if there is no electrical, gas, or major water risk.',
        selfServeSteps: ['Take photos', 'Dry the area', 'Check whether the leak stops'],
        escalationTriggers: ['Persistent water', 'Relapse within 24 hours'],
    },
    dispatch: {
        recommendedSkill: 'plumber',
        requiredTools: ['Flashlight'],
        requiredParts: ['Confirm on site'],
        estimatedCost: {
            min: 120,
            max: 200,
            currency: 'CNY',
            basis: 'User-stated budget range',
        },
        sla: 'Same-day or this-week booking',
        acceptanceCriteria: ['Issue fixed', 'Photos archived'],
    },
    verification: {
        checklist: ['Completion photos captured', 'Tenant confirms normal use'],
        photoRequirements: ['Before', 'After'],
        followUpWindow: '24-72 hours',
    },
    reporting: {
        ownerSummary: 'Owner-ready loop summary for the leak.',
        metrics: ['Final cost', 'Response time'],
        archiveTags: ['plumbing', 'low'],
    },
    nextActions: ['Run DIY safety check first', 'Dispatch if it fails'],
} as const;

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
        mocks.solveProblem.mockReset();
        mocks.mutateAsync.mockReset();
        mocks.submitAiFeedback.mockReset();
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
        mocks.submitAiFeedback.mockResolvedValue({ message: 'Feedback submitted successfully' });
        mocks.solveProblem.mockResolvedValue(problemSolvingLoop);
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
        expect(screen.getByText(/Try only if there is no electrical, gas, or major water risk/i)).toBeInTheDocument();
        expect(await screen.findByText('Six-stage solution plan')).toBeInTheDocument();
        expect(screen.getByText('¥120-200')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /match provider now/i })).toBeInTheDocument();
    });

    it('creates a real report and hands off to API-backed matching', async () => {
        await completeInquiry({
            ...demandSummary,
            severity: 'moderate',
            specialRequirements: 'Escalate if leak worsens.',
        });

        fireEvent.click(screen.getByRole('button', { name: /match provider now/i }));

        await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
        expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
            category: 'plumbing',
            urgency_score: 3,
        }));
        expect(mocks.navigate).toHaveBeenCalledWith('/match?report_id=42&category=plumbing');
        expect(screen.queryByText('Repair verification queued')).not.toBeInTheDocument();
        expect(screen.queryByText('Owner reporting prepared')).not.toBeInTheDocument();
        expect(screen.queryByText(/8-step|step 8/i)).not.toBeInTheDocument();
    });

    it('uses the AI plan severity as the visible risk assessment', async () => {
        mocks.solveProblem.mockResolvedValueOnce({
            ...problemSolvingLoop,
            diagnosis: {
                ...problemSolvingLoop.diagnosis,
                severity: 'critical',
                urgencyScore: 10,
            },
        });

        await completeInquiry({ ...demandSummary, severity: 'low' });

        expect(await screen.findByText('Critical')).toBeInTheDocument();
        expect(screen.queryByText('Low')).not.toBeInTheDocument();
    });

    it('does not duplicate a created report when local metrics are malformed', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem('inquiry_metrics', '{malformed');
        await completeInquiry();

        fireEvent.click(screen.getByRole('button', { name: /match provider now/i }));

        await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
        expect(mocks.navigate).toHaveBeenCalledWith('/match?report_id=42&category=plumbing');
        expect(mocks.showToast).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('surfaces report creation failures and permits a retry', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mocks.mutateAsync
            .mockRejectedValueOnce(new Error('Report service unavailable'))
            .mockResolvedValueOnce({ report: { id: 42 } });
        await completeInquiry();

        fireEvent.click(screen.getByRole('button', { name: /match provider now/i }));

        await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('Report service unavailable', 'error'));
        expect(mocks.navigate).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /match provider now/i }));
        await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(2));
        expect(mocks.navigate).toHaveBeenCalledWith('/match?report_id=42&category=plumbing');
        spy.mockRestore();
    });
});
