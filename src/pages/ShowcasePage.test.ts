// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ShowcasePage from './ShowcasePage';
import { LanguageProvider } from '../i18n/LanguageContext';

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

    it('renders the benchmarked landing sections', () => {
        renderShowcase();

        expect(screen.getByText(/Manage 3x more doors/i)).toBeInTheDocument();
        expect(screen.getByText('From report to verification, AI handles the repetitive coordination.')).toBeInTheDocument();
        expect(screen.getByText('Not a reminder bot. An agent that keeps pushing the job forward.')).toBeInTheDocument();
        expect(screen.getByText('Enter portfolio size and estimate the time your team gets back.')).toBeInTheDocument();
        expect(screen.getByText('Request a Sanya property pilot')).toBeInTheDocument();
    });

    it('updates ROI output when portfolio inputs change', () => {
        renderShowcase();

        const annualValue = screen.getByText('Annual value released').previousElementSibling;
        const initialValue = annualValue?.textContent;
        const doorsSlider = screen.getByLabelText(/Doors under management/i);

        fireEvent.change(doorsSlider, { target: { value: '1000' } });

        expect(annualValue?.textContent).not.toEqual(initialValue);
    });

    it('confirms pilot interest submission in local demo state', () => {
        renderShowcase();

        fireEvent.click(screen.getByRole('button', { name: /Submit pilot interest/i }));

        expect(screen.getByText('Pilot interest captured in local demo state.')).toBeInTheDocument();
    });
});
