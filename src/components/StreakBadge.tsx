import { useLanguage } from '../i18n/LanguageContext';

const StreakBadge = () => {
    const { locale } = useLanguage();

    // Simulated streak — in production from localStorage/API
    const streakDays = 12;

    if (streakDays <= 0) return null;

    return (
        <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">
            <span className="flame-pulse text-base">🔥</span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-300">
                {streakDays}{locale === 'zh' ? '天连续' : 'd streak'}
            </span>
        </div>
    );
};

export default StreakBadge;
