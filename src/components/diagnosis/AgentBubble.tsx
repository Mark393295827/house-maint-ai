import React from 'react';

interface AgentBubbleProps {
    text?: string;
    loading?: boolean;
    locale?: string;
}

const AgentBubble: React.FC<AgentBubbleProps> = ({ text, loading, locale = 'en' }) => {
    return (
        <div className="bg-white rounded-3xl p-5 shadow-lg max-w-[85%] animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shrink-0 shadow-md">
                    <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
                </div>
                <span className="font-bold text-gray-900 text-lg">
                    {locale === 'zh' ? '智能助手' : 'Quaala AI'}
                </span>
            </div>

            <div className="pl-13">
                {text && <p className="text-gray-700 text-base leading-relaxed mb-3">{text}</p>}

                {loading && (
                    <div className="flex gap-1.5 items-center mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentBubble;
