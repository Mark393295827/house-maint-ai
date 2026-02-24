import React from 'react';

interface StepFollowUpProps {
    locale: string;
    followUpDate: string;
    archived: boolean;
    onDateChange: (date: string) => void;
    onArchive: () => void;
    onHome: () => void;
}

const StepFollowUp: React.FC<StepFollowUpProps> = ({ locale, followUpDate, archived, onDateChange, onArchive, onHome }) => (
    <div className="p-4 space-y-4">
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '🎯 回访验收' : '🎯 Follow-up & Archive'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '安排回访确认修复效果' : 'Schedule follow-up to verify repair'}</p>
        </div>

        {/* Follow-up date */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'zh' ? '回访日期' : 'Follow-up Date'}</p>
            <div className="flex gap-2">
                {[1, 3, 7, 14].map(days => {
                    const label = days === 1 ? (locale === 'zh' ? '明天' : '1 day') : days === 7 ? (locale === 'zh' ? '一周后' : '1 week') : days === 14 ? (locale === 'zh' ? '两周后' : '2 weeks') : (locale === 'zh' ? `${days}天后` : `${days} days`);
                    return (
                        <button key={days} onClick={() => onDateChange(`${days}d`)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${followUpDate === `${days}d` ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Archive */}
        <div className={`p-4 rounded-2xl border transition-all ${archived ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-700'}`}>
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1", color: archived ? '#10b981' : '#9ca3af' }}>
                    {archived ? 'check_circle' : 'archive'}
                </span>
                <div className="flex-1">
                    <p className="font-bold text-sm text-text-main-light dark:text-text-main-dark">
                        {archived ? (locale === 'zh' ? '✅ 已归档到案例库' : '✅ Archived to Case Library') : (locale === 'zh' ? '归档到案例库' : 'Archive to Case Library')}
                    </p>
                    <p className="text-xs text-gray-500">{locale === 'zh' ? '方便将来参考类似问题' : 'For future reference on similar issues'}</p>
                </div>
                {!archived && (
                    <button onClick={onArchive} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all">
                        {locale === 'zh' ? '归档' : 'Archive'}
                    </button>
                )}
            </div>
        </div>

        <button onClick={onHome} className="w-full h-12 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all">
            {locale === 'zh' ? '完成并返回首页' : 'Finish & Go Home'}
        </button>
    </div>
);

export default StepFollowUp;
