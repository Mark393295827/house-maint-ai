// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ShowcasePage from './ShowcasePage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { getOperatingStageCopies } from '../constants/operatingModel';

vi.mock('../services/analytics', () => ({
    default: {
        track: vi.fn(),
    },
}));

const renderShowcase = () =>
    render(
        React.createElement(
            LanguageProvider,
            null,
            React.createElement(MemoryRouter, null, React.createElement(ShowcasePage))
        )
    );

describe('ShowcasePage', () => {
    beforeEach(() => {
        localStorage.setItem('app_locale', 'en');
    });

    it('renders the six-stage operating narrative', () => {
        renderShowcase();

        expect(screen.getByRole('heading', { name: /Your Home.*Maintained/i })).toBeInTheDocument();
        expect(screen.getByText(/six-stage operating loop/i)).toBeInTheDocument();
        expect(screen.getByText('Operating loop')).toBeInTheDocument();

        for (const stage of getOperatingStageCopies('en')) {
            expect(screen.getByRole('heading', { level: 3, name: stage.title })).toBeInTheDocument();
        }

        expect(screen.queryByText(/8-step|eight-step|step 8/i)).not.toBeInTheDocument();
    });

    it('does not mount the temporarily disabled firefly and click-effect canvas', () => {
        const { container } = renderShowcase();

        expect(container.querySelector('.gravity-meteor-canvas')).not.toBeInTheDocument();
    });

    it('lets the embedded demo switch to the diagnosis flow', () => {
        renderShowcase();

        const dashboardTab = screen.getByRole('tab', { name: /Dashboard/i });
        const diagnosisTab = screen.getByRole('tab', { name: /AI Diagnosis/i });
        expect(dashboardTab).toHaveAttribute('aria-selected', 'true');

        fireEvent.click(diagnosisTab);

        expect(dashboardTab).toHaveAttribute('aria-selected', 'false');
        expect(diagnosisTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'true');

        const iframe = screen.getByTitle('Live Demo');
        expect(iframe).toHaveAttribute('src', expect.stringContaining('/diagnosis'));
        fireEvent.load(iframe);

        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false');
    });

    it('supports keyboard navigation across embedded demo routes', async () => {
        renderShowcase();

        const dashboardTab = screen.getByRole('tab', { name: /Dashboard/i });
        const welcomeTab = screen.getByRole('tab', { name: /Welcome/i });
        fireEvent.keyDown(dashboardTab, { key: 'ArrowRight' });

        expect(dashboardTab).toHaveAttribute('aria-selected', 'false');
        expect(dashboardTab).toHaveAttribute('tabindex', '-1');
        expect(welcomeTab).toHaveAttribute('aria-selected', 'true');
        expect(welcomeTab).toHaveAttribute('tabindex', '0');
        expect(screen.getByTitle('Live Demo')).toHaveAttribute('src', expect.stringContaining('/welcome'));

        // Keep the environment alive until the intent-triggered route preload settles.
        await import('./WelcomePage');
    });
});
