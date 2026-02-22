import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const HomeHealthScore = () => {
    const { locale } = useLanguage();
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [displayScore, setDisplayScore] = useState(0);
    const hasAnimated = useRef(false);

    const score = 82;
    const breakdown = [
        { label: locale === 'zh' ? '定期检查' : 'Regular checks', value: 90, icon: 'checklist', gradient: 'from-indigo-500 to-violet-500' },
        { label: locale === 'zh' ? '维修完成' : 'Repairs done', value: 85, icon: 'build', gradient: 'from-cyan-500 to-teal-500' },
        { label: locale === 'zh' ? '季节保养' : 'Seasonal care', value: 70, icon: 'eco', gradient: 'from-amber-500 to-orange-500' },
    ];

    const circumference = 283;
    const offset = circumference - (score / 100) * circumference;

    // Animated count-up
    useEffect(() => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;
        let current = 0;
        const step = score / 40;
        const interval = setInterval(() => {
            current += step;
            if (current >= score) {
                setDisplayScore(score);
                clearInterval(interval);
            } else {
                setDisplayScore(Math.round(current));
            }
        }, 25);
        return () => clearInterval(interval);
    }, [score]);

    return (
        <section className="px-5 page-enter" style={{ animationDelay: '100ms' }}>
            <div
                className="relative overflow-hidden rounded-3xl p-5 cursor-pointer press-scale transition-all duration-300 glass dark:glass-dark hover:shadow-lg hover:shadow-primary/10"
                onClick={() => setShowBreakdown(!showBreakdown)}
            >
                {/* Ambient glow behind the card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />

                <div className="relative flex items-center gap-5">
                    {/* Score Ring with glow */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-125 glow-pulse" />
                        <svg width="80" height="80" viewBox="0 0 100 100" className="-rotate-90 relative z-10">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="7"
                                className="text-gray-100 dark:text-white/5" />
                            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                className="transition-all duration-1000"
                                style={{
                                    stroke: 'url(#scoreGradient)',
                                    animation: 'scoreRingFill 1.5s cubic-bezier(0.16, 1, 0.3, 1) both'
                                }}
                            />
                            <defs>
                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <span className="text-2xl font-extrabold gradient-text">{displayScore}</span>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-extrabold text-text-main-light dark:text-text-main-dark font-display">
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
                            <span className="material-symbols-outlined text-[14px] text-primary">
                                {showBreakdown ? 'expand_less' : 'expand_more'}
                            </span>
                            <span className="text-xs text-primary font-medium">
                                {locale === 'zh' ? '查看详情' : 'View details'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Breakdown */}
                {showBreakdown && (
                    <div className="relative mt-4 pt-4 border-t border-white/10 dark:border-white/5 flex flex-col gap-3 page-enter">
                        {breakdown.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                                    <span className="material-symbols-outlined text-white text-[14px]">{item.icon}</span>
                                </div>
                                <span className="flex-1 text-sm font-medium">{item.label}</span>
                                <div className="w-24 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-700`}
                                        style={{ width: `${item.value}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold w-8 text-right gradient-text">{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HomeHealthScore;
