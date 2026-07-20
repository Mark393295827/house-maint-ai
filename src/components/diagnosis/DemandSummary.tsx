import React, { useState } from 'react';
import OperatingLoopProgress from './OperatingLoopProgress';
import type { ProblemSolvingLoop } from '../../services/ai';

export interface DemandData {
    projectType: string;
    area: string;
    scope: string;
    budget: string;
    timeline: string;
    severity: 'critical' | 'moderate' | 'low';
    specialRequirements: string;
    hasPhoto: boolean;
}

interface DemandSummaryProps {
    data: DemandData;
    locale: string;
    imageUrl?: string | null;
    problemSolvingPlan?: ProblemSolvingLoop | null;
    problemSolvingLoading?: boolean;
    problemSolvingError?: string | null;
    onDispatch: () => void;
    onBack: () => void;
}

const SEVERITY_INFO: Record<string, { color: string; bg: string; border: string; label: Record<string, string> }> = {
    critical: { 
        color: '#ff3b30', 
        bg: 'rgba(255, 59, 48, 0.05)', 
        border: 'rgba(255, 59, 48, 0.1)', 
        label: { zh: '紧急', en: 'Critical' } 
    },
    moderate: { 
        color: '#ff9500', 
        bg: 'rgba(255, 149, 0, 0.05)', 
        border: 'rgba(255, 149, 0, 0.1)', 
        label: { zh: '中等', en: 'Moderate' } 
    },
    low: { 
        color: '#34c759', 
        bg: 'rgba(52, 199, 89, 0.05)', 
        border: 'rgba(52, 199, 89, 0.1)', 
        label: { zh: '轻微', en: 'Low' } 
    },
};

const formatCost = (plan: ProblemSolvingLoop) => {
    const symbol = plan.dispatch.estimatedCost.currency === 'CNY' ? '¥' : '$';
    return `${symbol}${plan.dispatch.estimatedCost.min}-${plan.dispatch.estimatedCost.max}`;
};

const DemandSummary: React.FC<DemandSummaryProps> = ({
    data,
    locale,
    imageUrl,
    problemSolvingPlan,
    problemSolvingLoading = false,
    problemSolvingError = null,
    onDispatch,
    onBack,
}) => {
    const [copied, setCopied] = useState(false);
    const isZh = locale === 'zh';
    
    const effectiveSeverity = problemSolvingPlan?.diagnosis.severity ?? data.severity;
    const sevInfo = SEVERITY_INFO[effectiveSeverity] || SEVERITY_INFO.moderate;
    const sevLabel = sevInfo.label[locale] || sevInfo.label.en;

    const fields = [
        {
            icon: 'category',
            label: isZh ? '项目类型' : 'Project Type',
            value: data.projectType,
        },
        {
            icon: 'location_on',
            label: isZh ? '区域/房间' : 'Area / Room',
            value: data.area,
        },
        {
            icon: 'description',
            label: isZh ? '问题描述' : 'Problem Description',
            value: data.scope,
        },
        {
            icon: 'payments',
            label: isZh ? '预算范围' : 'Budget Range',
            value: data.budget || (isZh ? '未指定' : 'Not specified'),
        },
        {
            icon: 'schedule',
            label: isZh ? '时间要求' : 'Timeline',
            value: data.timeline || (isZh ? '灵活' : 'Flexible'),
            highlight: true
        },
        {
            icon: 'note_alt',
            label: isZh ? '特殊要求' : 'Special Requirements',
            value: data.specialRequirements || (isZh ? '无' : 'None'),
        },
    ];

    const shareText = fields.map(f => `${f.label}: ${f.value}`).join('\n');
    const isDeflectionCandidate = problemSolvingPlan?.deflection.eligible ?? effectiveSeverity === 'low';

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#fbfbfd] text-[#1d1d1f] page-enter">
            {/* Header: Apple Setup Style */}
            <div className="px-8 pt-12 pb-8 flex flex-col items-center text-center stagger-item">
                <div className="w-16 h-16 bg-[#1d1d1f] rounded-[22px] flex items-center justify-center shadow-2xl shadow-black/10 mb-6">
                    <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                </div>
                <h1 className="text-3xl font-black tracking-tighter mb-2">
                    {isZh ? '最终确认' : 'Identity Summary'}
                </h1>
                <p className="text-[15px] font-bold text-[#86868b] leading-tight max-w-[280px]">
                    {isZh ? '先完成责任判断和 DIY 分流检查，再决定是否派单。' : 'Review the diagnosis, liability gate, and DIY deflection check before dispatch.'}
                </p>
            </div>

            <OperatingLoopProgress locale={locale} activeStageId="deflection" compact className="mb-4" />

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-4 no-scrollbar">
                {/* Severity Status Row */}
                <div className="stagger-item" style={{ animationDelay: '100ms' }}>
                    <div 
                        className="p-1 rounded-[22px] apple-glass shadow-sm border"
                        style={{ borderColor: sevInfo.border, backgroundColor: 'white' }}
                    >
                        <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black" style={{ backgroundColor: sevInfo.bg, color: sevInfo.color }}>
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                </div>
                                <span className="text-[11px] font-black text-[#86868b] uppercase tracking-widest">{isZh ? '风险评估' : 'RISK ASSESSMENT'}</span>
                            </div>
                            <span className="text-[14px] font-black uppercase tracking-tight" style={{ color: sevInfo.color }}>{sevLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Deflection Gate */}
                <div className="stagger-item" style={{ animationDelay: '175ms' }}>
                    <div className="aegis-card bg-white p-5 shadow-sm ring-1 ring-black/5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#28cd41]/10 text-[#28cd41]">
                                    <span className="material-symbols-outlined text-[19px]">self_improvement</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                        {isZh ? '分流门控' : 'DEFLECTION GATE'}
                                    </p>
                                    <h2 className="text-[15px] font-black tracking-tight">
                                        {isZh ? 'DIY 分流检查' : 'DIY deflection check'}
                                    </h2>
                                </div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${isDeflectionCandidate ? 'bg-[#28cd41]/10 text-[#28cd41]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>
                                {isDeflectionCandidate ? (isZh ? '可尝试' : 'Eligible') : (isZh ? '需派单' : 'Dispatch')}
                            </span>
                        </div>
                        <p className="text-[13px] font-bold leading-relaxed text-[#86868b]">
                            {problemSolvingPlan?.deflection.safetyGate
                                || (isDeflectionCandidate
                                    ? (isZh
                                        ? '低风险工单会先进行安全自助检查；若租客无法确认修复，再继续派单。'
                                        : 'Low-risk cases receive a safe self-serve check before dispatch; failed attempts continue to provider matching.')
                                    : (isZh
                                        ? '该工单不适合自助关闭，系统会保留诊断证据并进入师傅派单。'
                                        : 'This case is not suitable for self-serve closure, so the evidence pack moves into provider dispatch.'))}
                        </p>
                    </div>
                </div>

                {/* Problem-Solving Loop */}
                <div className="stagger-item" style={{ animationDelay: '190ms' }}>
                    <div className="aegis-card bg-white p-5 shadow-sm ring-1 ring-black/5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
                                    <span className="material-symbols-outlined text-[19px]">psychology</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                        {isZh ? '问题解决闭环' : 'PROBLEM-SOLVING LOOP'}
                                    </p>
                                    <h2 className="text-[15px] font-black tracking-tight">
                                        {isZh ? '六阶段解决方案' : 'Six-stage solution plan'}
                                    </h2>
                                </div>
                            </div>
                            {problemSolvingPlan && (
                                <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                                    {problemSolvingPlan.provider === 'openai-responses' ? 'OPENAI' : 'DEMO'}
                                </span>
                            )}
                        </div>

                        {problemSolvingLoading && (
                            <div className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3">
                                <span className="material-symbols-outlined animate-spin text-[18px] text-[#0071e3]">progress_activity</span>
                                <p className="text-[12px] font-black text-[#86868b]">
                                    {isZh ? '正在生成完整解决方案、造价和验收标准...' : 'Generating the full solution plan, cost range, and verification criteria...'}
                                </p>
                            </div>
                        )}

                        {problemSolvingError && !problemSolvingLoading && (
                            <div className="rounded-2xl bg-[#ff3b30]/5 px-4 py-3 text-[12px] font-bold text-[#ff3b30]">
                                {problemSolvingError}
                            </div>
                        )}

                        {problemSolvingPlan && !problemSolvingLoading && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                        {isZh ? '根因和风险' : 'ROOT CAUSE & RISK'}
                                    </p>
                                    <p className="mt-1 text-[13px] font-bold leading-relaxed text-[#1d1d1f]">
                                        {problemSolvingPlan.diagnosis.rootCauseSummary}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-[#f5f5f7] p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                            {isZh ? '造价区间' : 'COST RANGE'}
                                        </p>
                                        <p className="mt-1 text-xl font-black tracking-tight text-[#0071e3]">{formatCost(problemSolvingPlan)}</p>
                                        <p className="mt-1 text-[11px] font-bold leading-relaxed text-[#86868b]">{problemSolvingPlan.dispatch.estimatedCost.basis}</p>
                                    </div>
                                    <div className="rounded-2xl bg-[#f5f5f7] p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                            {isZh ? '推荐工种' : 'RECOMMENDED SKILL'}
                                        </p>
                                        <p className="mt-1 text-[14px] font-black tracking-tight text-[#1d1d1f]">{problemSolvingPlan.dispatch.recommendedSkill}</p>
                                        <p className="mt-1 text-[11px] font-bold leading-relaxed text-[#86868b]">{problemSolvingPlan.dispatch.sla}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                            {isZh ? '下一步' : 'NEXT ACTIONS'}
                                        </p>
                                        <ul className="space-y-2">
                                            {problemSolvingPlan.nextActions.slice(0, 3).map((action) => (
                                                <li key={action} className="flex gap-2 text-[12px] font-bold leading-relaxed text-[#1d1d1f]">
                                                    <span className="material-symbols-outlined mt-0.5 text-[15px] text-[#28cd41]">check_circle</span>
                                                    <span>{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#86868b]">
                                            {isZh ? '验收/报表' : 'VERIFY & REPORT'}
                                        </p>
                                        <ul className="space-y-2">
                                            {problemSolvingPlan.verification.checklist.slice(0, 3).map((item) => (
                                                <li key={item} className="flex gap-2 text-[12px] font-bold leading-relaxed text-[#1d1d1f]">
                                                    <span className="material-symbols-outlined mt-0.5 text-[15px] text-[#0071e3]">fact_check</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Photo Preview if exists */}
                {imageUrl && (
                    <div className="stagger-item" style={{ animationDelay: '150ms' }}>
                        <div className="aegis-card p-2 bg-white ring-1 ring-black/5 shadow-sm">
                             <img src={imageUrl} alt="Attached Context" className="w-full h-48 object-cover rounded-2xl" />
                             <div className="px-3 py-2 flex items-center justify-between">
                                 <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{isZh ? '环境实拍' : 'PHOTO CONTEXT'}</span>
                                 <span className="material-symbols-outlined text-[16px] text-[#86868b]">image</span>
                             </div>
                        </div>
                    </div>
                )}

                {/* Information Grid (Apple List Style) */}
                <div className="stagger-item space-y-3" style={{ animationDelay: '200ms' }}>
                    <div className="grid grid-cols-1 gap-3">
                        {fields.map((f, i) => (
                            <div key={i} className={`aegis-card p-5 bg-white shadow-sm ring-1 ring-black/5 hover:ring-[#0071e3]/20 transition-all ${f.highlight ? 'ring-[#0071e3]/20' : ''}`}>
                                <div className="flex items-center gap-3 mb-2">
                                     <span className="material-symbols-outlined text-[18px] text-[#86868b] font-medium">{f.icon}</span>
                                     <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{f.label}</span>
                                </div>
                                <p className="text-[14px] font-bold leading-relaxed">{f.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="relative z-30 p-6 flex flex-col gap-3 apple-glass border-t border-black/5 mt-auto">
                <button
                    onClick={onDispatch}
                    className="w-full h-14 bg-[#1d1d1f] hover:bg-black text-white rounded-2xl text-[14px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-black/20 press-scale transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">flash_on</span>
                    {isZh ? '立即匹配服务商' : 'Match Provider Now'}
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onBack}
                        className="h-12 bg-white border border-black/10 rounded-2xl text-[12px] font-bold text-[#1d1d1f] flex items-center justify-center gap-2 press-scale hover:bg-[#f5f5f7] transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        {isZh ? '修改内容' : 'Edit Request'}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="h-12 bg-white border border-black/10 rounded-2xl text-[12px] font-bold text-[#1d1d1f] flex items-center justify-center gap-2 press-scale hover:bg-[#f5f5f7] transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">{copied ? 'done' : 'content_copy'}</span>
                        {copied ? (isZh ? '已复制' : 'Copied!') : (isZh ? '复制详情' : 'Copy Summary')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DemandSummary;
