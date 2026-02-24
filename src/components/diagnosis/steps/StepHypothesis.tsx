import React from 'react';
import { SkeletonCard } from '../WizardUI';

interface StepHypothesisProps {
    result: any;
    loading: boolean;
    onSelect: (hypothesisTitle: string) => void;
    locale: string;
}

const StepHypothesis: React.FC<StepHypothesisProps> = ({ result, loading, onSelect, locale }) => (
    <div className="p-4 space-y-4">
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '🧪 根因假设' : '🧪 Root Cause Hypotheses'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '选择最可能的原因进行深入分析' : 'Select the most likely cause for deeper analysis'}</p>
        </div>
        {loading ? <SkeletonCard rows={3} /> : null}
        {result?.hypotheses && (
            <div className="space-y-3">
                {result.hypotheses.map((h: any, i: number) => (
                    <button key={h.id} onClick={() => onSelect(h.title)} className="w-full text-left p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-amber-500' : 'bg-gray-400'}`}>
                                {Math.round(h.probability * 100)}%
                            </div>
                            <p className="font-bold text-text-main-light dark:text-text-main-dark flex-1">{h.title}</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{h.reasoning}</p>
                        {h.evidence_needed && (
                            <div className="flex flex-wrap gap-1">
                                {h.evidence_needed.map((e: string, j: number) => (
                                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{e}</span>
                                ))}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default StepHypothesis;
