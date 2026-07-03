import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

const Probe = () => {
    const { t } = useLanguage();

    return (
        <div>
            <span>{t('missing.example', { defaultValue: 'Fallback copy' })}</span>
            <span>{t('repair.step', { step: 3 })}</span>
        </div>
    );
};

describe('LanguageContext', () => {
    it('uses defaultValue for missing keys and interpolates params', () => {
        localStorage.setItem('app_locale', 'en');

        render(
            <LanguageProvider>
                <Probe />
            </LanguageProvider>
        );

        expect(screen.getByText('Fallback copy')).toBeInTheDocument();
        expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
});
