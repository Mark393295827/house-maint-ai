import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../i18n/LanguageContext';
import BottomNav from '../components/BottomNav';

vi.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({ t: (k: string) => k, locale: 'en', setLocale: vi.fn() }),
    LanguageProvider: ({ children }: any) => children
}));

// Helper to render with Router + LanguageProvider
function renderBottomNav() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <LanguageProvider>
                <BrowserRouter>
                    <BottomNav />
                </BrowserRouter>
            </LanguageProvider>
        </QueryClientProvider>
    );
}

describe('BottomNav', () => {
    beforeEach(() => {
        renderBottomNav();
    });

    it('renders all navigation links', () => {
        const links = screen.getAllByRole('menuitem');
        expect(links).toHaveLength(5);
    });

    it('renders correct navigation paths', () => {
        const links = screen.getAllByRole('menuitem');
        // React Router Link components render paths without the basename
        expect(links[0]).toHaveAttribute('href', '/');
        expect(links[1]).toHaveAttribute('href', '/cases');
        expect(links[2]).toHaveAttribute('href', '/diagnosis');
        expect(links[3]).toHaveAttribute('href', '/library');
        expect(links[4]).toHaveAttribute('href', '/profile');
    });

    it('contains material icons', () => {
        const icons = document.querySelectorAll('.material-symbols-outlined');
        expect(icons.length).toBe(5);
    });
});
