import React from 'react';
import AgentBubble from '../AgentBubble';

interface StepMECEProps {
    result: any;
    loading: boolean;
    onSelect: (categoryId: string) => void;
    locale: string;
    imageUrl: string | null;
}

const StepMECE: React.FC<StepMECEProps> = ({ result, loading, onSelect, locale, imageUrl }) => (
    <div className="relative h-full w-full">
        {imageUrl && (
            <div className="absolute inset-0 z-0">
                <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a1c29]/20 via-[#1a1c29]/60 to-[#1a1c29] backdrop-blur-sm" />
            </div>
        )}

        <div className="relative z-10 w-full h-full flex flex-col p-6 pt-20">
            {/* Agent Bubble section */}
            <div className="mb-6 flex justify-start">
                <AgentBubble
                    text={loading
                        ? (locale === 'zh' ? '正在分析照片内容...' : "I can see your photo. Let me diagnose...")
                        : (result?.summary || (locale === 'zh' ? '发现了一些问题。' : 'I found some issues.'))}
                    loading={loading}
                    locale={locale}
                />
            </div>

            {/* Options section */}
            <div className="flex-1 overflow-y-auto w-full pt-4 max-h-[60vh] transition-all transform animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                {result?.categories && !loading && (
                    <div className="space-y-4 w-full">
                        {result.categories.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => onSelect(cat.id)}
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 flex items-center gap-4 hover:bg-white/15 active:scale-[0.98] transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-white text-2xl group-hover:scale-110 transition-transform">{cat.icon || 'category'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-lg truncate">{cat.name}</h3>
                                    <p className="text-white/60 text-sm truncate">{cat.description}</p>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1 px-2">
                                    <span className="text-white/80 font-bold text-sm">{Math.round(cat.confidence * 100)}%</span>
                                    <div className="w-12 h-1 rounded-full bg-white/20">
                                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${cat.confidence * 100}%` }} />
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-violet-500 transition-colors">
                                    <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);

export default StepMECE;
