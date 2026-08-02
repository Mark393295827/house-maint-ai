import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateReport } from '../../hooks/useReports';
import { solveProblem } from '../../services/ai';
import DiagnosisWizard from './DiagnosisWizard';

const navigate = vi.fn();
const showToast = vi.fn();
const mutateAsync = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigate,
    };
});

vi.mock('../../i18n/LanguageContext', () => ({
    useLanguage: () => ({ locale: 'en' }),
}));

vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ showToast }),
}));

vi.mock('../../hooks/useReports', () => ({
    useCreateReport: vi.fn(),
}));

vi.mock('../../services/ai', () => ({
    solveProblem: vi.fn(),
}));

vi.mock('../../services/analytics', () => ({
    default: { track: vi.fn() },
}));

vi.mock('./InquiryChat', () => ({
    default: ({ onComplete }: { onComplete: (data: any) => void }) => (
        <button
            type="button"
            onClick={() => onComplete({
                projectType: 'plumbing',
                area: 'kitchen',
                scope: 'Leaking kitchen pipe',
                budget: '500-2000',
                timeline: 'today',
                severity: 'moderate',
                specialRequirements: '',
                hasPhoto: false,
            })}
        >
            Complete inquiry
        </button>
    ),
}));

vi.mock('./DemandSummary', () => ({
    default: ({ onDispatch }: { onDispatch: () => void }) => (
        <button type="button" onClick={onDispatch}>Find real workers</button>
    ),
}));

describe('DiagnosisWizard dispatch handoff', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        localStorage.clear();
        vi.mocked(useCreateReport).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof useCreateReport>);
        vi.mocked(solveProblem).mockReturnValue(new Promise(() => {}));
        mutateAsync.mockResolvedValue({ report: { id: 321 } });
    });

    it('persists a report and hands off to API-backed matching without claiming dispatch completion', async () => {
        render(<DiagnosisWizard />);

        fireEvent.click(screen.getByRole('button', { name: 'Complete inquiry' }));
        fireEvent.click(screen.getByRole('button', { name: 'Find real workers' }));

        await waitFor(() => {
            expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Leaking kitchen pipe',
                category: 'plumbing',
                urgency_score: 6,
            }));
            expect(navigate).toHaveBeenCalledWith('/match?report_id=321&category=plumbing');
        });
        expect(sessionStorage.getItem('lastReportId')).toBe('321');
    });
});
