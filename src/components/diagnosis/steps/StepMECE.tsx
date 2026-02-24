import React from 'react';
import { SkeletonCard } from '../WizardUI';

interface StepMECEProps {
    result: any;
    loading: boolean;
    onSelect: (categoryId: string) => void;
    locale: string;
    imageUrl: string | null;
}

const StepMECE: React.FC<StepMECEProps> = ({ result, loading, onSelect, locale, imageUrl }) => (
    <div className="p-4 space-y-4">
        {imageUrl && (
            <div className="w-full h-32 rounded-2xl overflow-hidden">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
        )}
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '🔍 MECE 分类分析' : '🔍 MECE Category Analysis'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{result?.summary || (loading ? (locale === 'zh' ? 'AI 正在分析...' : 'AI analyzing...') : '')}</p>
        </div>
        {loading ? <SkeletonCard rows={3} /> : null}
        {result?.categories && (
            <div className="space-y-3">
                {result.categories.map((cat: any) => (
                    <button key={cat.id} onClick={() => onSelect(cat.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl">{cat.icon || 'category'}</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-bold text-text-main-light dark:text-text-main-dark">{cat.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-bold ${cat.confidence > 0.5 ? 'text-primary' : 'text-gray-400'}`}>
                                {Math.round(cat.confidence * 100)}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${cat.confidence * 100}%` }} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default StepMECE;
