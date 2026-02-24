import React, { useState } from 'react';
import { LoadingDots } from '../WizardUI';

interface StepChecklistProps {
    checklist: any;
    loading: boolean;
    onSubmit: (answers: Record<string, any>) => void;
    locale: string;
}

const StepChecklist: React.FC<StepChecklistProps> = ({ checklist, loading, onSubmit, locale }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});

    const setAnswer = (id: string, val: any) => setAnswers(prev => ({ ...prev, [id]: val }));
    const allAnswered = checklist?.checklist?.every((item: any) => answers[item.id] !== undefined) ?? false;

    return (
        <div className="p-4 space-y-4">
            <div className="text-center">
                <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? '📋 数据收集' : '📋 Data Collection'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '请逐项确认以下观察项目' : 'Please verify each observation below'}</p>
            </div>
            {loading && <LoadingDots />}
            {checklist?.checklist && (
                <div className="space-y-3">
                    {checklist.checklist.map((item: any) => (
                        <div key={item.id} className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                                <span className="material-symbols-outlined text-primary text-xl mt-0.5">{item.icon || 'check_circle'}</span>
                                <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{item.question}</p>
                            </div>
                            {item.type === 'boolean' ? (
                                <div className="flex gap-2 ml-9">
                                    <button onClick={() => setAnswer(item.id, true)} className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${answers[item.id] === true ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                        {locale === 'zh' ? '是' : 'Yes'}
                                    </button>
                                    <button onClick={() => setAnswer(item.id, false)} className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${answers[item.id] === false ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                        {locale === 'zh' ? '否' : 'No'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2 ml-9">
                                    {item.options?.map((opt: string, i: number) => (
                                        <button key={i} onClick={() => setAnswer(item.id, opt)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${answers[item.id] === opt ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {allAnswered && (
                <button onClick={() => onSubmit(answers)} className="w-full h-12 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all">
                    {locale === 'zh' ? '开始 5-Why 分析 →' : 'Start 5-Why Analysis →'}
                </button>
            )}
        </div>
    );
};

export default StepChecklist;
