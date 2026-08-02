import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageContext';
import WeekSelector from './WeekSelector';

describe('WeekSelector', () => {
    beforeEach(() => {
        localStorage.setItem('app_locale', 'en');
    });

    it('formats both endpoints when a week crosses a month boundary', () => {
        render(
            <LanguageProvider>
                <WeekSelector
                    startDate={new Date(2026, 6, 29)}
                    endDate={new Date(2026, 7, 4)}
                />
            </LanguageProvider>,
        );

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Jul 29 – Aug 4, 2026');
    });
});
