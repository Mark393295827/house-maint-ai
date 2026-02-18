import { useLanguage } from '../i18n/LanguageContext';


const LanguageToggle = () => {
    const { locale, setLocale } = useLanguage();

    const toggle = () => {
        setLocale(locale === 'en' ? 'zh' : 'en');
    };

    return (
        <button
            onClick={toggle}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
            aria-label="Switch Language"
        >
            <span className="material-symbols-outlined text-[18px] text-gray-600 dark:text-gray-400">language</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-5 text-center">
                {locale === 'en' ? 'EN' : '中'}
            </span>
        </button>
    );
};

export default LanguageToggle;
