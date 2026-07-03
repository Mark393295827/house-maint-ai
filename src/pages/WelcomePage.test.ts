// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { getOperatingStageCopies } from '../constants/operatingModel';
import WelcomePage from './WelcomePage';

function renderWelcomePage() {
    return render(
        React.createElement(
            LanguageProvider,
            null,
            React.createElement(MemoryRouter, null, React.createElement(WelcomePage))
        )
    );
}

describe('WelcomePage operating narrative', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('app_locale', 'en');
    });

    it('presents every stage from the shared six-stage operating model', () => {
        renderWelcomePage();

        expect(screen.getByText('From report to verified repair in one WeChat-native loop.')).toBeInTheDocument();
        expect(screen.getByText(/AI handles triage, DIY deflection, worker dispatch, repair verification, and owner reporting/i)).toBeInTheDocument();

        for (const stage of getOperatingStageCopies('en')) {
            expect(screen.getByText(stage.title)).toBeInTheDocument();
        }

        expect(screen.queryByText(/8-step|eight-step|step 8/i)).not.toBeInTheDocument();
    });
});
