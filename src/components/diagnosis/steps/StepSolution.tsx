import React from 'react';
import { LoadingDots, InfoChip } from '../WizardUI';
import { NavigateFunction } from 'react-router-dom';

interface StepSolutionProps {
    solution: any;
    loading: boolean;
    locale: string;
    navigate: NavigateFunction;
    onNext: () => void;
}

const StepSolution: React.FC<StepSolutionProps> = ({ solution, loading, locale, navigate, onNext }) => (
    <div className="p-4 space-y-4 pb-24">
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '✅ 完整解决方案' : '✅ Complete Solution'}
            </h2>
        </div>
        {loading && <LoadingDots />}
        {solution && (
            <>
                {/* Issue header */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <div>
                        <p className="font-bold text-lg text-text-main-light dark:text-text-main-dark">{solution.issue_name}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${solution.severity === 'critical' ? 'bg-red-100 text-red-700' : solution.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{solution.severity}</span>
                    </div>
                </div>

                {/* Root cause */}
                <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 mb-1">{locale === 'zh' ? '根本原因' : 'Root Cause'}</p>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">{solution.root_cause}</p>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 px-1">{locale === 'zh' ? '修复步骤' : 'Repair Steps'}</p>
                    {solution.steps?.map((s: any) => (
                        <div key={s.step} className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">{s.step}</div>
                            <div>
                                <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{s.action}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cost / Time / Difficulty */}
                <div className="grid grid-cols-3 gap-2">
                    {solution.estimated_cost && <InfoChip label={locale === 'zh' ? '费用' : 'Cost'} value={solution.estimated_cost} />}
                    {solution.estimated_time && <InfoChip label={locale === 'zh' ? '时间' : 'Time'} value={solution.estimated_time} />}
                    {solution.diy_difficulty && <InfoChip label={locale === 'zh' ? '难度' : 'Level'} value={solution.diy_difficulty} color={solution.diy_difficulty === 'easy' ? 'text-green-600' : solution.diy_difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'} />}
                </div>

                {/* Tools + Parts */}
                <div className="grid grid-cols-2 gap-3">
                    {solution.tools_needed?.length > 0 && (
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-2">🛠️ {locale === 'zh' ? '工具' : 'Tools'}</p>
                            <div className="flex flex-wrap gap-1">{solution.tools_needed.map((t: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{t}</span>)}</div>
                        </div>
                    )}
                    {solution.required_parts?.length > 0 && (
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-2">📦 {locale === 'zh' ? '材料' : 'Parts'}</p>
                            {solution.required_parts.map((p: any, i: number) => <p key={i} className="text-[10px] text-gray-600 dark:text-gray-300">{p.name} <span className="text-gray-400">{p.estimated_price}</span></p>)}
                        </div>
                    )}
                </div>

                {/* Safety + Prevention */}
                {solution.safety_warnings?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">⚠️ {locale === 'zh' ? '安全警告' : 'Safety'}</p>
                        {solution.safety_warnings.map((w: string, i: number) => <p key={i} className="text-xs text-red-600 dark:text-red-400">• {w}</p>)}
                    </div>
                )}
                {solution.prevention_tips?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">💡 {locale === 'zh' ? '预防建议' : 'Prevention'}</p>
                        {solution.prevention_tips.map((tip: string, i: number) => <p key={i} className="text-xs text-blue-600 dark:text-blue-400">• {tip}</p>)}
                    </div>
                )}

                {/* CTAs */}
                <div className="flex gap-2 pt-2">
                    {!solution.can_diy && (
                        <button onClick={() => navigate('/workers')} className="flex-1 h-12 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined">engineering</span>
                            {locale === 'zh' ? '找专业师傅' : 'Find a Pro'}
                        </button>
                    )}
                    <button onClick={onNext} className="flex-1 h-12 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                        <span className="material-symbols-outlined">assignment</span>
                        {locale === 'zh' ? 'PDCA 任务分配 →' : 'PDCA Tasks →'}
                    </button>
                </div>
            </>
        )}
    </div>
);

export default StepSolution;
