import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';
import BottomNav from '../components/BottomNav';

vi.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({ t: (k: string) => k, locale: 'en', setLocale: vi.fn() }),
    LanguageProvider: ({ children }: any) => children
}));

// Helper to render with Router + LanguageProvider
function renderBottomNav() {
    return render(
        <LanguageProvider>
            <BrowserRouter>
                <BottomNav />
            </BrowserRouter>
        </LanguageProvider>
    );
}

describe('BottomNav', () => {
    beforeEach(() => {
        renderBottomNav();
    });

    it('renders all navigation links', () => {
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(5);
    });

    it('renders correct navigation paths', () => {
        const links = screen.getAllByRole('link');
        // React Router Link components render paths without the basename
        expect(links[0]).toHaveAttribute('href', '/');
        expect(links[1]).toHaveAttribute('href', '/diagnosis');
        expect(links[2]).toHaveAttribute('href', '/calendar');
        expect(links[3]).toHaveAttribute('href', '/community');
        expect(links[4]).toHaveAttribute('href', '/profile');
    });

    it('contains material icons', () => {
        const icons = document.querySelectorAll('.material-symbols-outlined');
        expect(icons.length).toBe(5);
    });
});
