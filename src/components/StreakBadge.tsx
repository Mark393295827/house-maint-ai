import { useLanguage } from '../i18n/LanguageContext';

const StreakBadge = () => {
    const { locale } = useLanguage();
    const streakDays = 12;

    if (streakDays <= 0) return null;

    return (
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/15 dark:to-orange-500/15 px-3 py-1.5 rounded-xl border border-amber-500/20 press-scale cursor-pointer">
            <span className="flame-pulse text-base leading-none">🔥</span>
            <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                {streakDays}{locale === 'zh' ? '天连续' : 'd streak'}
            </span>
        </div>
    );
};

export default StreakBadge;
