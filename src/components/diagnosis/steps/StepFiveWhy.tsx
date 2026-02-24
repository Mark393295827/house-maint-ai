import React, { useState, useRef, useEffect } from 'react';
import { LoadingDots } from '../WizardUI';

interface StepFiveWhyProps {
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    result: any;
    loading: boolean;
    onAnswer: (answer: string) => void;
    locale: string;
}

const StepFiveWhy: React.FC<StepFiveWhyProps> = ({ history, result, loading, onAnswer, locale }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [history, loading]);

    const handleSend = () => {
        if (input.trim() && !loading) {
            onAnswer(input);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-center px-4 pt-4">
                <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? '🔬 5-Why 深度分析' : '🔬 5-Why Deep Analysis'}
                </h2>
                {result?.why_number && (
                    <div className="flex justify-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${n <= (result.why_number || 0) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                W{n}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {history.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-bl-sm text-text-main-light dark:text-text-main-dark'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                        </div>
                        <LoadingDots />
                    </div>
                )}
            </div>
            {/* Quick replies */}
            {result?.quick_replies && !loading && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {result.quick_replies.map((r: string, i: number) => (
                        <button key={i} onClick={() => onAnswer(r)} className="px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-full hover:bg-primary/10 active:scale-95 transition-all">
                            {r}
                        </button>
                    ))}
                </div>
            )}
            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} disabled={loading} placeholder={locale === 'zh' ? '输入您的回答...' : 'Type your answer...'} className="flex-1 h-11 px-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50" />
                <button onClick={handleSend} disabled={!input.trim() || loading} className="w-11 h-11 bg-primary disabled:bg-gray-300 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
            </div>
        </div>
    );
};

export default StepFiveWhy;
