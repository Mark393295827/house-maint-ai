import React, { useState } from 'react';

interface StepPDCAProps {
    tasks: any[];
    locale: string;
    onNext: () => void;
}

const StepPDCA: React.FC<StepPDCAProps> = ({ tasks, locale, onNext }) => {
    const [toggles, setToggles] = useState<Record<string, boolean>>({});
    const toggle = (phase: string, idx: number) => setToggles(prev => ({ ...prev, [`${phase}-${idx}`]: !prev[`${phase}-${idx}`] }));

    return (
        <div className="p-4 space-y-4 pb-24">
            <div className="text-center">
                <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? '📋 PDCA 任务分配' : '📋 PDCA Task Assignment'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '按照 Plan→Do→Check→Act 执行' : 'Execute in Plan→Do→Check→Act order'}</p>
            </div>
            {tasks.map((phase: any) => (
                <div key={phase.phase} className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className={`w-8 h-8 rounded-lg ${phase.color} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{phase.icon}</span>
                        </div>
                        <span className="font-bold text-sm text-text-main-light dark:text-text-main-dark">{phase.phase}</span>
                        <span className="text-xs text-gray-400 ml-auto">{phase.items.filter((_: any, i: number) => toggles[`${phase.phase}-${i}`] || _.done).length}/{phase.items.length}</span>
                    </div>
                    <div className="px-4 py-2 space-y-1">
                        {phase.items.map((item: any, i: number) => {
                            const checked = toggles[`${phase.phase}-${i}`] || item.done;
                            return (
                                <button key={i} onClick={() => toggle(phase.phase, i)} className="flex items-center gap-3 py-2 w-full text-left">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {checked && <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                                    </div>
                                    <span className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-text-main-light dark:text-text-main-dark'}`}>{item.text}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <button onClick={onNext} className="w-full h-12 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all">
                {locale === 'zh' ? '设置回访验收 →' : 'Schedule Follow-up →'}
            </button>
        </div>
    );
};

export default StepPDCA;
