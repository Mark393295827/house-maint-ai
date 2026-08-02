import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { useReports } from '../hooks/useReports';
import MyCasesPage from './MyCasesPage';

vi.mock('../hooks/useReports', () => ({
    useReports: vi.fn(),
}));

vi.mock('../components/BottomNav', () => ({
    default: () => null,
}));

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: () => ({
        getTotalSize: () => 0,
        getVirtualItems: () => [],
    }),
}));

describe('MyCasesPage resilience', () => {
    beforeEach(() => {
        localStorage.setItem('app_locale', 'en');
        vi.clearAllMocks();
    });

    it('does not represent an API failure as an empty case list', () => {
        const refetch = vi.fn();
        vi.mocked(useReports).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            refetch,
        } as unknown as ReturnType<typeof useReports>);

        render(
            <LanguageProvider>
                <MemoryRouter>
                    <MyCasesPage />
                </MemoryRouter>
            </LanguageProvider>,
        );

        expect(screen.getByText('Unable to load cases')).toBeInTheDocument();
        expect(screen.queryByText('No cases yet')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(refetch).toHaveBeenCalledOnce();
    });
});
