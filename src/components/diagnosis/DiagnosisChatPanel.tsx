import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { chatWithDiagnosis } from '../../services/ai';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'follow_up' | 'solution';
    questions?: string[];
    quickReplies?: string[];
    solution?: any;
}

interface DiagnosisChatPanelProps {
    initialDiagnosis: any; // The raw diagnosis result from initial analysis
    capturedImageBase64: string | null;
    capturedImageUrl: string | null;
    onReset: () => void;
}

const DiagnosisChatPanel: React.FC<DiagnosisChatPanelProps> = ({
    initialDiagnosis,
    capturedImageBase64,
    capturedImageUrl,
    onReset,
}) => {
    const { t, locale } = useLanguage();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [finalSolution, setFinalSolution] = useState<any>(null);

    // Initialize conversation with initial diagnosis
    useEffect(() => {
        const initConversation = async () => {
            // Build the initial system message from diagnosis
            const diagDesc = initialDiagnosis?.description || initialDiagnosis?.raw_response?.diagnosis?.diagnosis_summary || '';
            const issueName = initialDiagnosis?.issue_name || initialDiagnosis?.raw_response?.diagnosis?.issue_type || '';

            const initialAssistantMsg: ChatMessage = {
                role: 'assistant',
                content: locale === 'zh'
                    ? `📸 已接收到照片。初步诊断结果：**${issueName}**\n\n${diagDesc}\n\n为了给您提供更精准的解决方案，我需要了解一些额外信息：`
                    : `📸 Photo received. Initial diagnosis: **${issueName}**\n\n${diagDesc}\n\nTo provide you with a more accurate solution, I need some additional information:`,
                type: 'text'
            };

            setMessages([initialAssistantMsg]);
            setIsThinking(true);

            try {
                // Ask Gemini for follow-up questions based on the initial diagnosis
                const history = [
                    {
                        role: 'user' as const,
                        content: locale === 'zh'
                            ? `我拍了一张家居问题的照片。初步诊断是：${issueName} - ${diagDesc}。请问我一些跟进问题来帮助更深入的分析。`
                            : `I took a photo of a home issue. Initial diagnosis: ${issueName} - ${diagDesc}. Please ask me follow-up questions for deeper analysis.`
                    }
                ];

                const response = await chatWithDiagnosis(capturedImageBase64, 'image/jpeg', history);

                if (response.type === 'follow_up') {
                    const followUpMsg: ChatMessage = {
                        role: 'assistant',
                        content: response.message,
                        type: 'follow_up',
                        questions: response.questions,
                        quickReplies: response.quick_replies
                    };
                    setMessages(prev => [...prev, followUpMsg]);
                }
            } catch (error) {
                console.error('Failed to get follow-up questions:', error);
                // Fallback follow-up questions
                const fallbackMsg: ChatMessage = {
                    role: 'assistant',
                    content: locale === 'zh'
                        ? '为了更准确地诊断，请回答以下问题：'
                        : 'To diagnose more accurately, please answer these questions:',
                    type: 'follow_up',
                    questions: locale === 'zh'
                        ? ['这个问题是什么时候开始出现的？', '问题是否在恶化？', '您之前尝试过什么修复措施？']
                        : ['When did this issue first appear?', 'Is the problem getting worse?', 'Have you tried any fixes?'],
                    quickReplies: locale === 'zh'
                        ? ['最近发现', '已经很久了', '在恶化']
                        : ['Recently noticed', "It's been a while", 'Getting worse']
                };
                setMessages(prev => [...prev, fallbackMsg]);
            } finally {
                setIsThinking(false);
            }
        };

        if (initialDiagnosis) {
            initConversation();
        }
    }, [initialDiagnosis]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    // Send user message
    const sendMessage = async (text: string) => {
        if (!text.trim() || isThinking) return;

        const userMsg: ChatMessage = { role: 'user', content: text, type: 'text' };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputValue('');
        setIsThinking(true);

        try {
            // Build history for the API
            const history = updatedMessages
                .filter(m => m.type !== 'follow_up' || m.role === 'user') // Include all user messages
                .map(m => ({
                    role: m.role,
                    content: m.content + (m.questions ? '\n\nQuestions: ' + m.questions.join(', ') : '')
                }));

            const response = await chatWithDiagnosis(capturedImageBase64, 'image/jpeg', history);

            if (response.type === 'follow_up') {
                const followUpMsg: ChatMessage = {
                    role: 'assistant',
                    content: response.message,
                    type: 'follow_up',
                    questions: response.questions,
                    quickReplies: response.quick_replies
                };
                setMessages(prev => [...prev, followUpMsg]);
            } else if (response.type === 'solution') {
                const solutionMsg: ChatMessage = {
                    role: 'assistant',
                    content: response.message,
                    type: 'solution',
                    solution: response.solution
                };
                setMessages(prev => [...prev, solutionMsg]);
                setFinalSolution(response.solution);
                setShowSolution(true);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: ChatMessage = {
                role: 'assistant',
                content: locale === 'zh' ? '抱歉，分析时遇到问题。请重试。' : 'Sorry, there was an issue with the analysis. Please try again.',
                type: 'text'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    // Handle quick reply click
    const handleQuickReply = (reply: string) => {
        sendMessage(reply);
    };

    return (
        <div className="absolute inset-0 z-30 flex flex-col bg-background-light dark:bg-background-dark">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md">
                <button onClick={onReset} className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                    <span className="text-sm font-medium">{t('diagnosis.result.retry')}</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">
                        {locale === 'zh' ? 'AI 诊断助手' : 'AI Diagnosis'}
                    </span>
                </div>
                <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* Captured image thumbnail */}
            {capturedImageUrl && (
                <div className="px-4 pt-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg">
                        <img src={capturedImageUrl} alt="Captured" className="w-full h-full object-cover" />
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index}>
                        {/* Message bubble */}
                        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                    <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        smart_toy
                                    </span>
                                </div>
                            )}
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : 'bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 text-text-main-light dark:text-text-main-dark rounded-bl-sm'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                                {/* Questions list */}
                                {msg.questions && msg.questions.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {msg.questions.map((q, qi) => (
                                            <div key={qi} className="flex items-start gap-2">
                                                <span className="text-primary dark:text-primary-light font-bold text-sm mt-0.5">{qi + 1}.</span>
                                                <p className="text-sm text-text-main-light dark:text-text-main-dark">{q}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick reply chips */}
                        {msg.quickReplies && msg.quickReplies.length > 0 && index === messages.length - 1 && !isThinking && (
                            <div className="flex flex-wrap gap-2 mt-3 ml-10">
                                {msg.quickReplies.map((reply, ri) => (
                                    <button
                                        key={ri}
                                        onClick={() => handleQuickReply(reply)}
                                        className="px-4 py-2 text-sm font-medium text-primary dark:text-primary-light bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all active:scale-95"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && (
                    <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                smart_toy
                            </span>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Solution Card */}
                {showSolution && finalSolution && (
                    <SolutionCard solution={finalSolution} locale={locale} navigate={navigate} />
                )}
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                        placeholder={locale === 'zh' ? '描述您的情况...' : 'Describe your situation...'}
                        disabled={isThinking}
                        className="flex-1 h-12 px-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-all"
                    />
                    <button
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim() || isThinking}
                        className="w-12 h-12 bg-primary disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:shadow-none"
                    >
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            send
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Solution Card Component ─── */
const SolutionCard: React.FC<{ solution: any; locale: string; navigate: any }> = ({ solution, locale, navigate }) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="ml-10 mt-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl overflow-hidden shadow-lg">
            {/* Solution Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                    </span>
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                        {locale === 'zh' ? '✅ 完整解决方案' : '✅ Complete Solution'}
                    </h4>
                </div>
                <span className={`material-symbols-outlined text-emerald-600 dark:text-emerald-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </div>

            {expanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Issue & Severity */}
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                            {solution.issue_name}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${solution.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                solution.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {solution.severity}
                        </span>
                    </div>

                    {/* Root cause */}
                    {solution.root_cause && (
                        <div className="bg-white/60 dark:bg-white/5 rounded-xl p-3">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {locale === 'zh' ? '根本原因' : 'Root Cause'}
                            </p>
                            <p className="text-sm text-text-main-light dark:text-text-main-dark">{solution.root_cause}</p>
                        </div>
                    )}

                    {/* Steps */}
                    {solution.steps && solution.steps.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {locale === 'zh' ? '修复步骤' : 'Repair Steps'}
                            </p>
                            <div className="space-y-2">
                                {solution.steps.map((step: any, i: number) => (
                                    <div key={i} className="flex gap-3 bg-white/60 dark:bg-white/5 rounded-xl p-3">
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary dark:text-primary-light flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                            {step.step || i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{step.action}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Parts & Tools */}
                    <div className="grid grid-cols-2 gap-3">
                        {solution.tools_needed && solution.tools_needed.length > 0 && (
                            <div className="bg-white/60 dark:bg-white/5 rounded-xl p-3">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">🛠️ {locale === 'zh' ? '所需工具' : 'Tools'}</p>
                                <div className="flex flex-wrap gap-1">
                                    {solution.tools_needed.map((tool: string, i: number) => (
                                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-700 dark:text-gray-300">{tool}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {solution.required_parts && solution.required_parts.length > 0 && (
                            <div className="bg-white/60 dark:bg-white/5 rounded-xl p-3">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">📦 {locale === 'zh' ? '所需材料' : 'Parts'}</p>
                                <div className="space-y-1">
                                    {solution.required_parts.map((part: any, i: number) => (
                                        <p key={i} className="text-xs text-gray-700 dark:text-gray-300">{part.name} <span className="text-gray-400">{part.estimated_price}</span></p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cost & Time summary */}
                    <div className="flex gap-3">
                        {solution.estimated_cost && (
                            <div className="flex-1 text-center bg-white/60 dark:bg-white/5 rounded-xl p-2">
                                <p className="text-xs text-gray-400">{locale === 'zh' ? '预估费用' : 'Est. Cost'}</p>
                                <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{solution.estimated_cost}</p>
                            </div>
                        )}
                        {solution.estimated_time && (
                            <div className="flex-1 text-center bg-white/60 dark:bg-white/5 rounded-xl p-2">
                                <p className="text-xs text-gray-400">{locale === 'zh' ? '预估时间' : 'Est. Time'}</p>
                                <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{solution.estimated_time}</p>
                            </div>
                        )}
                        {solution.diy_difficulty && (
                            <div className="flex-1 text-center bg-white/60 dark:bg-white/5 rounded-xl p-2">
                                <p className="text-xs text-gray-400">{locale === 'zh' ? '难度' : 'Difficulty'}</p>
                                <p className={`text-sm font-bold ${solution.diy_difficulty === 'easy' ? 'text-green-600 dark:text-green-400' :
                                        solution.diy_difficulty === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                    }`}>{solution.diy_difficulty}</p>
                            </div>
                        )}
                    </div>

                    {/* Safety warnings */}
                    {solution.safety_warnings && solution.safety_warnings.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                            <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">⚠️ {locale === 'zh' ? '安全警告' : 'Safety Warnings'}</p>
                            {solution.safety_warnings.map((w: string, i: number) => (
                                <p key={i} className="text-xs text-red-600 dark:text-red-400 mt-1">• {w}</p>
                            ))}
                        </div>
                    )}

                    {/* Prevention tips */}
                    {solution.prevention_tips && solution.prevention_tips.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">💡 {locale === 'zh' ? '预防建议' : 'Prevention Tips'}</p>
                            {solution.prevention_tips.map((tip: string, i: number) => (
                                <p key={i} className="text-xs text-blue-600 dark:text-blue-400 mt-1">• {tip}</p>
                            ))}
                        </div>
                    )}

                    {/* CTA Buttons */}
                    <div className="flex gap-2 pt-2">
                        {!solution.can_diy && (
                            <button
                                onClick={() => navigate('/workers')}
                                className="flex-1 h-11 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">engineering</span>
                                <span>{locale === 'zh' ? '找专业师傅' : 'Find a Pro'}</span>
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/repair/ai-diagnosis')}
                            className={`${solution.can_diy ? 'flex-1' : ''} h-11 ${solution.can_diy ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'} font-bold rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all`}
                        >
                            <span className="material-symbols-outlined text-lg">handyman</span>
                            <span>{locale === 'zh' ? '开始修复' : 'Start Repair'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiagnosisChatPanel;
