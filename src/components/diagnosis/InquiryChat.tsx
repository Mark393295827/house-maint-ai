import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { inquiryChat } from '../../services/ai';
import Analytics from '../../services/analytics';
import type { DemandData } from './DemandSummary';

/* ─── Types ─── */
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    questions?: string[];
    quickReplies?: string[];
    progress?: number;
    imageUrl?: string;        // for user-sent photos
    timestamp?: string;
}

interface InquiryChatProps {
    onComplete: (summary: DemandData, imageBase64?: string | null, imageUrl?: string | null) => void;
    onBack: () => void;
}

/* ─── Category Cards ─── */
const CATEGORIES_ZH = [
    { id: 'plumbing', icon: 'plumbing', label: '水管/管道', color: 'from-blue-500 to-cyan-500' },
    { id: 'electrical', icon: 'bolt', label: '电气/线路', color: 'from-amber-400 to-orange-500' },
    { id: 'hvac', icon: 'ac_unit', label: '暖通空调', color: 'from-sky-400 to-indigo-500' },
    { id: 'structural', icon: 'home_work', label: '墙面/结构', color: 'from-stone-400 to-slate-600' },
    { id: 'painting', icon: 'format_paint', label: '粉刷/装饰', color: 'from-pink-400 to-rose-500' },
    { id: 'other', icon: 'handyman', label: '其他问题', color: 'from-gray-400 to-gray-600' },
];
const CATEGORIES_EN = [
    { id: 'plumbing', icon: 'plumbing', label: 'Plumbing', color: 'from-blue-500 to-cyan-500' },
    { id: 'electrical', icon: 'bolt', label: 'Electrical', color: 'from-amber-400 to-orange-500' },
    { id: 'hvac', icon: 'ac_unit', label: 'HVAC', color: 'from-sky-400 to-indigo-500' },
    { id: 'structural', icon: 'home_work', label: 'Structural', color: 'from-stone-400 to-slate-600' },
    { id: 'painting', icon: 'format_paint', label: 'Painting', color: 'from-pink-400 to-rose-500' },
    { id: 'other', icon: 'handyman', label: 'Other', color: 'from-gray-400 to-gray-600' },
];

const getTimeStr = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

/* ─── Component ─── */
const InquiryChat: React.FC<InquiryChatProps> = ({ onComplete, onBack }) => {
    const { locale } = useLanguage();
    const isZh = locale === 'zh';
    const categories = isZh ? CATEGORIES_ZH : CATEGORIES_EN;

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showWelcome, setShowWelcome] = useState(true);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [showInputMenu, setShowInputMenu] = useState(false);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
            }, 50);
        }
    }, [messages, isThinking]);

    // Greeting + track start
    useEffect(() => {
        Analytics.track('inquiry_started', { locale, timestamp: new Date().toISOString() });
        setMessages([{
            role: 'assistant',
            content: isZh
                ? '👋 您好！我是您的智能家居维修顾问。\n\n请选择您需要的服务类型，也可以直接拍照或描述您的问题：'
                : '👋 Hello! I\'m your smart home maintenance advisor.\n\nSelect a service type, or take a photo / describe your issue:',
            progress: 0,
            timestamp: getTimeStr(),
        }]);
    }, []);

    // Camera management
    const openCamera = useCallback(async () => {
        setShowCamera(true);
        setCameraError(null);
        setCameraReady(false);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => setCameraReady(true);
            }
        } catch (e: any) {
            setCameraError(
                e.name === 'NotAllowedError'
                    ? (isZh ? '请允许摄像头权限' : 'Camera permission required')
                    : (isZh ? '无法访问摄像头' : 'Camera unavailable')
            );
        }
    }, [isZh]);

    const closeCamera = useCallback(() => {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
        setShowCamera(false);
        setCameraReady(false);
    }, [stream]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current, c = canvasRef.current, ctx = c.getContext('2d');
        if (!ctx) return;
        c.width = v.videoWidth; c.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const base64 = c.toDataURL('image/jpeg', 0.85).split(',')[1];
        c.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            setImageBase64(base64);
            setImageUrl(url);

            // Add photo as user message in chat
            const photoMsg: ChatMessage = {
                role: 'user',
                content: isZh ? '📷 已拍摄照片' : '📷 Photo taken',
                imageUrl: url,
                timestamp: getTimeStr(),
            };
            setMessages(prev => [...prev, photoMsg]);
            setShowWelcome(false);
            Analytics.track('inquiry_photo_taken', { method: 'camera', progress });

            // Send to AI with the photo context
            const newHistory = [...history, { role: 'user' as const, content: isZh ? '我拍了一张家居问题的照片' : 'I took a photo of the home issue' }];
            setHistory(newHistory);
            sendToAI(isZh ? '我拍了一张照片' : 'I took a photo', newHistory, base64);

            closeCamera();
        }, 'image/jpeg', 0.85);
    }, [history, isZh, closeCamera]);

    // File import
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        const reader = new FileReader();
        reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1];
            setImageBase64(b64);

            const photoMsg: ChatMessage = {
                role: 'user',
                content: isZh ? '📷 已上传照片' : '📷 Photo uploaded',
                imageUrl: url,
                timestamp: getTimeStr(),
            };
            setMessages(prev => [...prev, photoMsg]);
            setShowWelcome(false);

            const newHistory = [...history, { role: 'user' as const, content: isZh ? '我上传了一张问题照片' : 'I uploaded a photo of the issue' }];
            setHistory(newHistory);
            sendToAI(isZh ? '我上传了照片' : 'I uploaded a photo', newHistory, b64);
        };
        reader.readAsDataURL(file);
        setShowInputMenu(false);
    };

    // AI communication
    const sendToAI = useCallback(async (_userText: string, newHistory: typeof history, imgB64?: string) => {
        setIsThinking(true);
        try {
            const response = await inquiryChat(newHistory, imgB64 || imageBase64 || undefined, undefined, locale);
            const aiMsg: ChatMessage = {
                role: 'assistant',
                content: response.message,
                questions: response.questions,
                quickReplies: response.quickReplies,
                progress: response.progress,
                timestamp: getTimeStr(),
            };
            setMessages(prev => [...prev, aiMsg]);
            setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);
            setProgress(response.progress || 0);

            if (response.type === 'summary' && response.demandSummary) {
                Analytics.track('inquiry_completed', { ...response.demandSummary, rounds: newHistory.filter((m: any) => m.role === 'user').length });
                setTimeout(() => onComplete(response.demandSummary, imgB64 || imageBase64, imageUrl), 1500);
            }
        } catch (error) {
            console.error('Inquiry error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isZh ? '抱歉，系统暂时遇到问题。请重试。' : 'Sorry, the system encountered an issue. Please try again.',
                timestamp: getTimeStr(),
            }]);
        } finally {
            setIsThinking(false);
        }
    }, [imageBase64, imageUrl, locale, onComplete, isZh]);

    const handleSend = useCallback((text: string) => {
        if (!text.trim() || isThinking) return;
        setShowWelcome(false);
        setShowInputMenu(false);
        Analytics.track('inquiry_message_sent', { progress, messageCount: history.length + 1 });

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: getTimeStr() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        const newHistory = [...history, { role: 'user' as const, content: text }];
        setHistory(newHistory);
        sendToAI(text, newHistory);
    }, [isThinking, history, sendToAI]);

    const handleCategoryPick = useCallback((label: string) => { Analytics.track('inquiry_category_selected', { category: label }); handleSend(label); }, [handleSend]);
    const handleQuickReply = useCallback((reply: string) => { Analytics.track('inquiry_quick_reply_used', { reply, progress }); handleSend(reply); }, [handleSend, progress]);

    /* ─── Camera Overlay ─── */
    const renderCameraOverlay = () => {
        if (!showCamera) return null;
        return (
            <div className="absolute inset-0 z-[100] bg-black flex flex-col">
                {/* Camera header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
                    <button onClick={closeCamera} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                        <span className="material-symbols-outlined text-white text-xl">close</span>
                    </button>
                    <span className="text-white/70 text-sm font-medium">{isZh ? '拍摄问题照片' : 'Take Issue Photo'}</span>
                    <div className="w-10" />
                </div>

                {/* Viewfinder */}
                <div className="flex-1 relative">
                    {cameraError ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
                            <span className="material-symbols-outlined text-5xl text-white/30">no_photography</span>
                            <p className="text-white/50 text-center text-sm">{cameraError}</p>
                            <button onClick={() => { closeCamera(); fileRef.current?.click(); }}
                                className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold text-sm">
                                {isZh ? '改为上传照片' : 'Upload Instead'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted
                                className="absolute inset-0 w-full h-full object-cover" />
                            {/* Corner brackets */}
                            <div className="absolute inset-8 pointer-events-none">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
                            </div>
                            {/* Scanning line animation */}
                            {cameraReady && (
                                <div className="absolute inset-x-8 top-8 bottom-8 overflow-hidden pointer-events-none">
                                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-[scan_2s_infinite]"
                                        style={{ animation: 'scan 2.5s ease-in-out infinite' }} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Capture button */}
                <div className="flex items-center justify-center gap-8 pb-10 pt-6 bg-gradient-to-t from-black/80 to-transparent">
                    <button onClick={() => { closeCamera(); fileRef.current?.click(); }}
                        className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/70">photo_library</span>
                    </button>

                    <button onClick={capturePhoto} disabled={!cameraReady}
                        className="relative w-[72px] h-[72px] disabled:opacity-30">
                        <div className="absolute inset-0 border-[3px] border-white/80 rounded-full" />
                        <div className="absolute inset-[6px] bg-white rounded-full active:scale-90 transition-transform" />
                    </button>

                    <div className="w-12 h-12" /> {/* spacer */}
                </div>
            </div>
        );
    };

    /* ─── Main Render ─── */
    return (
        <div className="flex flex-col h-full bg-[#0b0d1a] text-white relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

            {/* Camera overlay */}
            {renderCameraOverlay()}
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileImport} className="hidden" />

            {/* ─── Header ─── */}
            <div className="relative z-20 px-4 pt-4 pb-3 bg-[#0b0d1a]/90 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-1 hover:bg-white/10 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-xl text-white/60">arrow_back</span>
                    </button>

                    {/* AI avatar */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0b0d1a]" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-white/95 truncate">{isZh ? 'AI 需求顾问' : 'AI Demand Advisor'}</h2>
                        <p className="text-[11px] text-emerald-400/80">{isThinking ? (isZh ? '正在分析...' : 'Analyzing...') : (isZh ? '在线' : 'Online')}</p>
                    </div>

                    {/* Progress pill */}
                    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-white/50 tabular-nums">{progress}%</span>
                    </div>
                </div>

                {/* Progress segments */}
                <div className="flex gap-1 mt-3">
                    {(isZh ? ['类型', '区域', '详情', '预算', '完成'] : ['Type', 'Area', 'Details', 'Budget', 'Done']).map((seg, i) => {
                        const thresholds = [20, 40, 60, 80, 100];
                        const done = progress >= thresholds[i];
                        const active = progress >= (thresholds[i - 1] || 0) && progress < thresholds[i];
                        return (
                            <div key={seg} className="flex-1">
                                <div className={`h-1 rounded-full transition-all duration-500 ${done ? 'bg-violet-500' : active ? 'bg-violet-500/50' : 'bg-white/15'}`} />
                                <p className={`text-[9px] mt-1 text-center font-bold uppercase tracking-wider ${done ? 'text-violet-400' : active ? 'text-violet-400/60' : 'text-white/30'}`}>{seg}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Chat Area ─── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, index) => (
                    <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
                        {/* Message row */}
                        <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar (assistant only) */}
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/80 to-indigo-600/80 flex items-center justify-center flex-shrink-0 mb-4">
                                    <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                                </div>
                            )}

                            <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                                {/* Photo attachment */}
                                {msg.imageUrl && (
                                    <div className={`mb-1 rounded-2xl overflow-hidden shadow-lg ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                                        <img src={msg.imageUrl} alt="Attached" className="w-48 h-36 object-cover" />
                                    </div>
                                )}

                                {/* Bubble */}
                                <div className={`rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                                    ? 'bg-violet-600 rounded-br-md shadow-lg shadow-violet-600/20'
                                    : 'bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-bl-md'
                                    }`}>
                                    <p className={`text-[13px] whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-white/85'}`}>
                                        {msg.content}
                                    </p>

                                    {/* Questions */}
                                    {msg.questions && msg.questions.length > 0 && (
                                        <div className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2.5">
                                            {msg.questions.map((q, qi) => (
                                                <div key={qi} className="flex items-start gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-[9px] font-bold text-violet-400">{qi + 1}</span>
                                                    </div>
                                                    <p className="text-[13px] text-white/70">{q}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Timestamp */}
                                <span className={`text-[10px] text-white/20 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                                    {msg.timestamp || ''}
                                    {msg.role === 'user' && <span className="ml-1 text-violet-400/40">✓✓</span>}
                                </span>
                            </div>
                        </div>

                        {/* Quick replies */}
                        {msg.quickReplies && msg.quickReplies.length > 0 && index === messages.length - 1 && !isThinking && (
                            <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                                {msg.quickReplies.map((reply, ri) => (
                                    <button key={ri} onClick={() => handleQuickReply(reply)}
                                        className="px-3.5 py-1.5 text-[12px] font-medium text-violet-300 bg-violet-500/8 border border-violet-500/15 rounded-full hover:bg-violet-500/15 hover:border-violet-500/30 transition-all active:scale-95">
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Welcome category cards */}
                {showWelcome && !isThinking && messages.length === 1 && (
                    <div className="grid grid-cols-3 gap-2 mt-1 ml-9">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => handleCategoryPick(cat.label)}
                                className={`bg-gradient-to-br ${cat.color} rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-black/20`}>
                                <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                                <span className="text-[10px] font-bold text-white/90">{cat.label}</span>
                            </button>
                        ))}

                        {/* Camera card */}
                        <button onClick={openCamera}
                            className="col-span-3 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 backdrop-blur-sm border border-violet-500/20 rounded-2xl p-3 flex items-center justify-center gap-2 hover:border-violet-500/40 active:scale-[0.98] transition-all mt-1">
                            <span className="material-symbols-outlined text-violet-400 text-xl">photo_camera</span>
                            <span className="text-sm font-bold text-violet-300">{isZh ? '拍照描述问题' : 'Take Photo of Issue'}</span>
                        </button>
                    </div>
                )}

                {/* Typing indicator */}
                {isThinking && (
                    <div className="flex items-end gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/80 to-indigo-600/80 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                        </div>
                        <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Input Bar ─── */}
            <div className="relative z-20 px-3 py-3 bg-[#0b0d1a]/95 backdrop-blur-xl border-t border-white/5">
                {/* Attachment menu popup */}
                {showInputMenu && (
                    <div className="absolute bottom-full left-3 mb-2 bg-[#1a1d2e] border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 animate-fade-in-up">
                        <button onClick={() => { openCamera(); setShowInputMenu(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 rounded-xl transition-colors">
                            <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-violet-400 text-lg">photo_camera</span>
                            </div>
                            <span className="text-sm text-white/80 font-medium">{isZh ? '拍照' : 'Camera'}</span>
                        </button>
                        <button onClick={() => { fileRef.current?.click(); setShowInputMenu(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 rounded-xl transition-colors">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400 text-lg">photo_library</span>
                            </div>
                            <span className="text-sm text-white/80 font-medium">{isZh ? '相册' : 'Gallery'}</span>
                        </button>
                    </div>
                )}

                {/* Photo preview strip */}
                {imageUrl && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="relative">
                            <img src={imageUrl} alt="Attached" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                            <button onClick={() => { setImageUrl(null); setImageBase64(null); }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                                <span className="material-symbols-outlined text-white text-[11px]">close</span>
                            </button>
                        </div>
                        <span className="text-[11px] text-white/30">{isZh ? '已附带照片' : 'Photo attached'}</span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Plus menu button */}
                    <button onClick={() => setShowInputMenu(!showInputMenu)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${showInputMenu ? 'bg-violet-600 rotate-45' : 'bg-white/[0.06] hover:bg-white/10'}`}>
                        <span className="material-symbols-outlined text-white/60 text-xl transition-transform">add</span>
                    </button>

                    {/* Text input */}
                    <div className="flex-1 relative">
                        <input ref={inputRef} type="text" value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                            onFocus={() => setShowInputMenu(false)}
                            placeholder={isZh ? '输入消息...' : 'Type a message...'}
                            disabled={isThinking}
                            className="w-full h-10 pl-4 pr-10 bg-white/[0.06] border border-white/[0.08] rounded-full text-white placeholder-white/25 text-[13px] focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.08] disabled:opacity-40 transition-all" />
                    </div>

                    {/* Send button */}
                    <button onClick={() => handleSend(inputValue)} disabled={!inputValue.trim() || isThinking}
                        className="w-10 h-10 bg-violet-600 disabled:bg-white/[0.06] rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-violet-600/20 disabled:shadow-none">
                        <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isThinking ? 'hourglass_top' : 'send'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Scan animation keyframe */}
            <style>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(calc(100% - 2px)); }
                }
            `}</style>
        </div>
    );
};

export default InquiryChat;
