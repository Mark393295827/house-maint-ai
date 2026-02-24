import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import aiService from '../services/ai';
import { addCase, generateCaseId } from '../store/cases';
import { useState, useEffect, useRef } from 'react'; // Added useState, useEffect, useRef

const OmnichannelSim = () => {
    const { t, locale } = useLanguage(); // Added locale
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai' | 'system', text: string }>>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isProcessing]);

    const handleSend = async () => {
        if (!message.trim() || isProcessing) return;

        const userMsg = message.trim();
        setMessage('');
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsProcessing(true);

        // 1. Mock "Gateway Routing" delay
        await new Promise(r => setTimeout(r, 1500));
        setChatHistory(prev => [...prev, { role: 'system', text: t('omnichannel.processing') }]);

        try {
            // 2. Real AI call but text-only (using existing aiService)
            const response = await aiService.analyzeImage(undefined, undefined, userMsg);
            const diagnosis = response.raw_response.diagnosis;

            setDiagnosisResult(diagnosis);

            // 3. Mock "AI Response"
            await new Promise(r => setTimeout(r, 1000));
            setChatHistory(prev => [...prev, {
                role: 'ai',
                text: `${t('omnichannel.received')}: ${diagnosis.diagnosis_summary || 'Analysis complete.'}`
            }]);

        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'system', text: "Error: AI pipeline failed." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateTicket = () => {
        if (!diagnosisResult) return;

        const newCase = {
            id: generateCaseId(),
            title: diagnosisResult.issue_type || t('match.report.fallback'),
            titleEn: diagnosisResult.issue_type || 'Maintenance Issue',
            status: 'active' as const,
            step: Math.floor(Math.random() * 3) + 1, // Random start step
            severity: diagnosisResult.severity || 'moderate',
            date: new Date().toISOString().split('T')[0],
            category: diagnosisResult.issue_type,
            rootCause: diagnosisResult.diagnosis_summary
        };

        addCase(newCase);
        navigate('/');
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#F2F4F7] dark:bg-background-dark pb-[20px] overflow-hidden shadow-2xl font-sans">
            {/* Fake OS Header */}
            <div className="px-6 pt-12 pb-4 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
                    </button>
                    <div className="text-center">
                        <h1 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">{t('omnichannel.title')}</h1>
                        <p className="text-[10px] text-gray-500 font-medium">OPENCLAW OMNICHANNEL GATEWAY</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">hub</span>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
            >
                <div className="text-center py-4 px-8">
                    <div className="inline-block px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-[10px] text-gray-500 font-bold uppercase tracking-tighter mb-2">
                        🛡️ Encrypted Simulation Channel
                    </div>
                    <p className="text-xs text-gray-400">{t('omnichannel.subtitle')}</p>
                </div>

                {chatHistory.map((chat, i) => (
                    <div
                        key={i}
                        className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${chat.role === 'user'
                                ? 'bg-primary text-white rounded-tr-none'
                                : chat.role === 'system'
                                    ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 italic text-xs'
                                    : 'bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-200 rounded-tl-none'
                            }`}>
                            {chat.text}
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white dark:bg-surface-dark px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area or Diagnosis Overlay */}
            <div className="p-4 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 space-y-4">
                {diagnosisResult ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                            <h3 className="text-xs font-black text-primary uppercase mb-2 tracking-widest">{t('omnichannel.diagnosis')}</h3>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{diagnosisResult.issue_type}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diagnosisResult.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                                    }`}>
                                    {diagnosisResult.severity?.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                {diagnosisResult.diagnosis_summary}
                            </p>
                            <button
                                onClick={handleCreateTicket}
                                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                {t('omnichannel.createTicket')}
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-2 text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            {t('omnichannel.back')}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder={t('omnichannel.sendPlaceholder')}
                                className="w-full py-3.5 pl-4 pr-12 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!message.trim() || isProcessing}
                                className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all"
                            >
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OmnichannelSim;
