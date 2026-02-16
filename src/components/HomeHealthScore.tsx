import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const HomeHealthScore = () => {
    const { t, locale } = useLanguage();
    const [showBreakdown, setShowBreakdown] = useState(false);

    // Simulated score data — in production this would come from API/context
    const score = 82;
    const breakdown = [
        { label: locale === 'zh' ? '定期检查' : 'Regular checks', value: 90, icon: 'checklist' },
        { label: locale === 'zh' ? '维修完成' : 'Repairs done', value: 85, icon: 'build' },
        { label: locale === 'zh' ? '季节保养' : 'Seasonal care', value: 70, icon: 'eco' },
    ];

    const circumference = 283; // 2 * π * 45
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 80 ? '#2bb673' : score >= 60 ? '#FF9500' : '#FF3B30';

    return (
        <section className="px-5 page-enter" style={{ animationDelay: '100ms' }}>
            <div
                className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer press-scale"
                onClick={() => setShowBreakdown(!showBreakdown)}
            >
                <div className="flex items-center gap-5">
                    {/* Score Ring */}
                    <div className="relative shrink-0">
                        <svg width="80" height="80" viewBox="0 0 100 100" className="-rotate-90">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                                className="text-gray-100 dark:text-gray-700" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                style={{ animation: 'scoreRingFill 1.2s ease-out both' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-extrabold" style={{ color: scoreColor }}>{score}</span>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                            {locale === 'zh' ? '房屋健康指数' : 'Home Health'}
                        </h3>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-0.5">
                            {score >= 80
                                ? (locale === 'zh' ? '你的房屋状态良好 🏠' : 'Your home is in great shape 🏠')
                                : score >= 60
                                    ? (locale === 'zh' ? '有一些事项需要关注' : 'Some items need attention')
                                    : (locale === 'zh' ? '需要尽快处理!' : 'Needs immediate attention!')}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                            <span className="material-symbols-outlined text-[14px] text-text-sub-light dark:text-text-sub-dark">
                                {showBreakdown ? 'expand_less' : 'expand_more'}
                            </span>
                            <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                {locale === 'zh' ? '查看详情' : 'View details'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Breakdown */}
                {showBreakdown && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 page-enter">
                        {breakdown.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-[20px]">{item.icon}</span>
                                <span className="flex-1 text-sm font-medium">{item.label}</span>
                                <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${item.value}%`,
                                            backgroundColor: item.value >= 80 ? '#2bb673' : item.value >= 60 ? '#FF9500' : '#FF3B30'
                                        }}
                                    />
                                </div>
                                <span className="text-xs font-bold w-8 text-right">{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HomeHealthScore;
