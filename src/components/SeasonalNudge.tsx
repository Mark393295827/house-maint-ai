import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const SeasonalNudge = () => {
    const { locale } = useLanguage();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const month = new Date().getMonth();
    let icon: string, message: string, messageZh: string, gradient: string;

    if (month >= 2 && month <= 4) {
        icon = '🌱'; message = 'Spring check: inspect roof & gutters after winter'; messageZh = '春季检查：冬后屋顶和排水沟'; gradient = 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20';
    } else if (month >= 5 && month <= 7) {
        icon = '☀️'; message = 'AC filter check recommended this month'; messageZh = '本月建议检查空调滤网'; gradient = 'from-amber-500/10 to-orange-500/10 border-amber-500/20';
    } else if (month >= 8 && month <= 10) {
        icon = '🍂'; message = 'Fall prep: clean gutters & check heating'; messageZh = '秋季准备：清理排水沟和检查暖气'; gradient = 'from-orange-500/10 to-red-500/10 border-orange-500/20';
    } else {
        icon = '❄️'; message = 'Time to check pipe insulation'; messageZh = '检查管道保温的时候到了'; gradient = 'from-blue-500/10 to-cyan-500/10 border-blue-500/20';
    }

    return (
        <div className="px-5 nudge-enter">
            <div className={`flex items-center gap-3 bg-gradient-to-r ${gradient} rounded-2xl px-4 py-3.5 border backdrop-blur-sm`}>
                <span className="text-xl shrink-0">{icon}</span>
                <p className="flex-1 text-sm font-medium text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? messageZh : message}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-xs font-bold text-white bg-gradient-to-r from-primary to-accent px-3.5 py-1.5 rounded-xl shadow-sm transition-all press-scale"
                    >
                        {locale === 'zh' ? '完成' : 'Done'}
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-text-sub-light dark:text-text-sub-dark hover:text-text-main-light transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeasonalNudge;
