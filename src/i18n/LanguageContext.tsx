import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './en.json';
import zh from './zh.json';

type Locale = 'en' | 'zh';
type TranslationParams = Record<string, string | number | undefined>;

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: TranslationParams & { defaultValue?: string }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Flatten nested keys for easier access (e.g., "nav.home")
const getNestedValue = (obj: unknown, path: string): unknown => {
    return path.split('.').reduce<unknown>((prev, curr) => {
        if (!prev || typeof prev !== 'object') return undefined;
        return (prev as Record<string, unknown>)[curr];
    }, obj);
};

const getInitialLocale = (): Locale => {
    if (typeof window === 'undefined') return 'en';

    const savedLocale = localStorage.getItem('app_locale') as Locale | null;
    if (savedLocale === 'en' || savedLocale === 'zh') return savedLocale;

    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>(() => getInitialLocale());

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const handleSetLocale = (newLocale: Locale) => {
        setLocale(newLocale);
        localStorage.setItem('app_locale', newLocale);
    };

    const t = (key: string, params?: TranslationParams & { defaultValue?: string }): string => {
        const translations = locale === 'zh' ? zh : en;
        const fallbackTranslations = locale === 'zh' ? en : zh;
        const translatedValue = getNestedValue(translations, key);
        const fallbackValue = getNestedValue(fallbackTranslations, key);
        let value = typeof translatedValue === 'string'
            ? translatedValue
            : typeof fallbackValue === 'string'
                ? fallbackValue
                : params?.defaultValue || key;

        if (params && value) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                if (paramKey === 'defaultValue' || paramValue === undefined) return;
                value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
            });
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
