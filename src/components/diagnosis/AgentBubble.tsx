import React from 'react';

interface AgentBubbleProps {
    text?: string;
    loading?: boolean;
    locale?: string;
}

const AgentBubble: React.FC<AgentBubbleProps> = ({ text, loading, locale = 'en' }) => {
    return (
        <div className="bg-white/80 apple-glass rounded-[28px] p-6 shadow-2xl shadow-black/5 ring-1 ring-black/5 border border-white/40 animate-fade-in-up selection:bg-[#0071e3]/10">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-[14px] bg-[#1d1d1f] flex items-center justify-center shrink-0 shadow-lg shadow-black/20">
                    <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
                <div>
                    <h3 className="text-[#1d1d1f] font-black text-lg tracking-tight">
                        {locale === 'zh' ? '智能家居顾问' : 'AI Home Advisor'}
                    </h3>
                    <div className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#28cd41]" />
                         <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{locale === 'zh' ? '正在运行' : 'System Engine Active'}</span>
                    </div>
                </div>
            </div>

            <div className="pl-1 space-y-4">
                {text && <p className="text-[#1d1d1f] text-[15px] font-bold leading-relaxed">{text}</p>}

                {loading && (
                    <div className="flex gap-2 items-center px-1">
                        <div className="w-2 h-2 rounded-full bg-[#1d1d1f] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-[#1d1d1f] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-[#1d1d1f] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentBubble;
