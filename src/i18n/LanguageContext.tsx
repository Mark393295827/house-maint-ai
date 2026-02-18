import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './en.json';
import zh from './zh.json';

type Locale = 'en' | 'zh';

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Flatten nested keys for easier access (e.g., "nav.home")
const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj) || path;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>('en');

    useEffect(() => {
        // 1. Check localStorage
        const savedLocale = localStorage.getItem('app_locale') as Locale;
        if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
            setLocale(savedLocale);
            return;
        }

        // 2. Check browser language
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('zh')) {
            setLocale('zh');
        }
    }, []);

    const handleSetLocale = (newLocale: Locale) => {
        setLocale(newLocale);
        localStorage.setItem('app_locale', newLocale);

        // Update html lang attribute
        document.documentElement.lang = newLocale;
    };

    const t = (key: string, params?: Record<string, string | number>): string => {
        const translations = locale === 'zh' ? zh : en;
        let value = getNestedValue(translations, key);

        if (params && value) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
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
