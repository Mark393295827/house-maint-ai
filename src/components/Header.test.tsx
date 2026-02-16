import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';
import { IMAGES } from '../constants/images';
import Header from '../components/Header';

// Helper to render with required providers
function renderHeader() {
    return render(
        <LanguageProvider>
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        </LanguageProvider>
    );
}

describe('Header', () => {
    it('renders location and greeting text', () => {
        renderHeader();
        // The i18n system defaults to 'en' locale; greeting is now time-aware
        expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
        expect(screen.getByText(/San Francisco, CA/i)).toBeInTheDocument();
    });

    it('renders user avatar', () => {
        const { container } = renderHeader();
        const avatar = container.querySelector(`[style*="${IMAGES.USER_AVATAR}"]`);
        expect(avatar).toBeInTheDocument();
    });

    it('has ARIA label for avatar', () => {
        const { container } = renderHeader();
        const avatar = container.querySelector('[aria-label="User profile portrait smiling"]');
        expect(avatar).toBeInTheDocument();
    });
});
