import React from 'react';
import {
    getOperatingStageCopies,
    type OperatingStage,
    type SupportedLocale,
} from '../../constants/operatingModel';

type StageId = OperatingStage['id'];

interface OperatingLoopProgressProps {
    locale: string;
    activeStageId: StageId;
    className?: string;
    compact?: boolean;
}

const normalizeLocale = (locale: string): SupportedLocale => (locale === 'zh' ? 'zh' : 'en');

const OperatingLoopProgress: React.FC<OperatingLoopProgressProps> = ({
    locale,
    activeStageId,
    className = '',
    compact = false,
}) => {
    const normalizedLocale = normalizeLocale(locale);
    const isZh = normalizedLocale === 'zh';
    const stages = getOperatingStageCopies(normalizedLocale);
    const activeIndex = Math.max(0, stages.findIndex((stage) => stage.id === activeStageId));
    const activeStage = stages[activeIndex] || stages[0];

    return (
        <section
            aria-label={isZh ? '六阶段运营闭环进度' : 'Six-stage operating loop progress'}
            className={`mx-6 rounded-[26px] border border-black/5 bg-white/80 p-4 shadow-sm ring-1 ring-white/50 apple-glass ${className}`}
        >
            <div className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#86868b]">
                        {isZh ? '运营闭环' : 'Operating loop'}
                    </p>
                    <h3 className="mt-1 text-[15px] font-black tracking-tight text-[#1d1d1f]">
                        {activeStage.title}
                    </h3>
                    {!compact && (
                        <p className="mt-1 text-[12px] font-bold leading-relaxed text-[#86868b]">
                            {activeStage.description}
                        </p>
                    )}
                </div>
                <div className="shrink-0 rounded-full bg-[#1d1d1f] px-3 py-1 text-[11px] font-black text-white">
                    {activeIndex + 1}/{stages.length}
                </div>
            </div>

            <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {stages.map((stage, index) => {
                    const isActive = index === activeIndex;
                    const isComplete = index < activeIndex;

                    return (
                        <li key={stage.id}>
                            <div
                                aria-current={isActive ? 'step' : undefined}
                                data-testid={`operating-stage-${stage.id}`}
                                className={`flex h-full min-h-[70px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors ${
                                    isActive
                                        ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white shadow-lg shadow-black/10'
                                        : isComplete
                                            ? 'border-[#28cd41]/20 bg-[#28cd41]/10 text-[#1d1d1f]'
                                            : 'border-black/5 bg-[#f5f5f7] text-[#86868b]'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{isComplete ? 'check' : stage.icon}</span>
                                <span className="line-clamp-2 text-[10px] font-black leading-tight tracking-tight">
                                    {stage.title}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default OperatingLoopProgress;
