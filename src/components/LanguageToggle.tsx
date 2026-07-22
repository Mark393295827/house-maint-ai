import { useLanguage } from '../i18n/LanguageContext';

const LanguageToggle = () => {
    const { locale, setLocale, t } = useLanguage();

    return (
        <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="language-toggle"
            aria-label={t('language.switch')}
            title={t('language.switch')}
        >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">language</span>
            <span>{locale === 'en' ? 'EN' : '中'}</span>
        </button>
    );
};

export default LanguageToggle;
