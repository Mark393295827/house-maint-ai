// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ShowcasePage from './ShowcasePage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { getOperatingStageCopies } from '../constants/operatingModel';

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

        expect(screen.getByRole('heading', { name: /YourHome.*Maintained/i })).toBeInTheDocument();
        expect(screen.getByText(/six-stage operating loop/i)).toBeInTheDocument();
        expect(screen.getByText('Operating loop')).toBeInTheDocument();

        for (const stage of getOperatingStageCopies('en')) {
            expect(screen.getByText(stage.title)).toBeInTheDocument();
        }

        expect(screen.queryByText(/8-step|eight-step|step 8/i)).not.toBeInTheDocument();
    });

    it('lets the embedded demo switch to the diagnosis flow', () => {
        renderShowcase();

        fireEvent.click(screen.getByRole('button', { name: /AI Diagnosis/i }));

        expect(screen.getByTitle('Live Demo')).toHaveAttribute('src', expect.stringContaining('/diagnosis'));
    });
});
