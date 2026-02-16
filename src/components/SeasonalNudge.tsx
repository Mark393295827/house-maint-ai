import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const SeasonalNudge = () => {
    const { locale } = useLanguage();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    // Determine season based on current month
    const month = new Date().getMonth(); // 0-indexed
    let icon: string, message: string, messageZh: string;

    if (month >= 2 && month <= 4) {
        // Spring (Mar-May)
        icon = '🌱';
        message = 'Spring check: inspect roof & gutters after winter';
        messageZh = '春季检查：冬后屋顶和排水沟';
    } else if (month >= 5 && month <= 7) {
        // Summer (Jun-Aug)
        icon = '☀️';
        message = 'AC filter check recommended this month';
        messageZh = '本月建议检查空调滤网';
    } else if (month >= 8 && month <= 10) {
        // Fall (Sep-Nov)
        icon = '🍂';
        message = 'Fall prep: clean gutters & check heating';
        messageZh = '秋季准备：清理排水沟和检查暖气';
    } else {
        // Winter (Dec-Feb)
        icon = '❄️';
        message = 'Time to check pipe insulation';
        messageZh = '检查管道保温的时候到了';
    }

    return (
        <div className="px-5 nudge-enter">
            <div className="flex items-center gap-3 bg-primary/10 dark:bg-primary/20 rounded-xl px-4 py-3 border border-primary/20">
                <span className="text-xl shrink-0">{icon}</span>
                <p className="flex-1 text-sm font-medium text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? messageZh : message}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors press-scale"
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
