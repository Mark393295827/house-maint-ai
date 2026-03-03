import React, { useState } from 'react';

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
    onDispatch: () => void;
    onBack: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'from-red-500 to-rose-600',
    moderate: 'from-amber-400 to-orange-500',
    low: 'from-emerald-400 to-green-500',
};

const SEVERITY_LABELS: Record<string, Record<string, string>> = {
    zh: { critical: '紧急', moderate: '中等', low: '轻微' },
    en: { critical: 'Critical', moderate: 'Moderate', low: 'Low' },
};

const DemandSummary: React.FC<DemandSummaryProps> = ({ data, locale, imageUrl, onDispatch, onBack }) => {
    const [copied, setCopied] = useState(false);

    const isZh = locale === 'zh';
    const sevColor = SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.moderate;
    const sevLabel = (SEVERITY_LABELS[locale] || SEVERITY_LABELS.en)[data.severity] || data.severity;

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
        },
        {
            icon: 'note_alt',
            label: isZh ? '特殊要求' : 'Special Requirements',
            value: data.specialRequirements || (isZh ? '无' : 'None'),
        },
    ];

    const shareText = fields.map(f => `${f.label}: ${f.value}`).join('\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0f1120] text-white animate-fade-in-up">
            {/* Header */}
            <div className="px-5 pt-16 pb-4">
                <button onClick={onBack} className="mb-4 p-2 bg-white/10 hover:bg-white/20 rounded-full active:scale-90 transition-transform">
                    <span className="material-symbols-outlined text-xl block text-white/80">arrow_back</span>
                </button>
                <div className="flex items-center gap-3 mb-1">
                    <span className="material-symbols-outlined text-2xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                    <h1 className="text-xl font-bold">{isZh ? '需求清单' : 'Demand Summary'}</h1>
                </div>
                <p className="text-white/50 text-sm ml-10">{isZh ? '以下信息可直接发送给服务商' : 'Ready for professional service providers'}</p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
                {/* Severity Badge */}
                <div className={`bg-gradient-to-r ${sevColor} rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg`}>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-white/90 text-lg">warning</span>
                        <span className="font-bold text-sm">{isZh ? '严重程度' : 'Severity'}</span>
                    </div>
                    <span className="font-black text-lg tracking-wide uppercase">{sevLabel}</span>
                </div>

                {/* Photo thumbnail */}
                {imageUrl && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-violet-400 text-sm">photo_camera</span>
                            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{isZh ? '附带照片' : 'Attached Photo'}</span>
                        </div>
                        <div className="w-full h-32 rounded-xl overflow-hidden">
                            <img src={imageUrl} alt="Issue" className="w-full h-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Field cards */}
                {fields.map((field, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-violet-400 text-sm">{field.icon}</span>
                            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{field.label}</span>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed">{field.value}</p>
                    </div>
                ))}
            </div>

            {/* Bottom actions */}
            <div className="px-5 pb-8 pt-3 bg-gradient-to-t from-[#0f1120] via-[#0f1120] to-transparent space-y-3">
                <button
                    onClick={onDispatch}
                    className="w-full bg-violet-600 hover:bg-violet-700 active:scale-[0.97] transition-all text-white font-bold text-lg rounded-2xl py-4 shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined rotate-[-45deg]">send</span>
                    {isZh ? '立即派单' : 'Dispatch Now'}
                </button>
                <button
                    onClick={handleCopy}
                    className="w-full bg-white/10 hover:bg-white/15 active:scale-[0.97] transition-all text-white/80 font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">{copied ? 'check' : 'content_copy'}</span>
                    {copied ? (isZh ? '已复制' : 'Copied!') : (isZh ? '复制需求清单' : 'Copy Demand List')}
                </button>
            </div>
        </div>
    );
};

export default DemandSummary;
