import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { inquiryChat } from '../../services/ai';
import Analytics from '../../services/analytics';
import type { DemandData } from './DemandSummary';
import OperatingLoopProgress from './OperatingLoopProgress';

/* ─── Types ─── */
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    questions?: string[];
    quickReplies?: string[];
    progress?: number;
    imageUrl?: string;        
    timestamp?: string;
}

interface InquiryChatProps {
    onComplete: (summary: DemandData, imageBase64?: string | null, imageUrl?: string | null) => void;
    onBack: () => void;
}

/* ─── Category Cards (Apple Style) ─── */
const CATEGORIES_ZH = [
    { id: 'plumbing', icon: 'plumbing', label: '水管/管道', gradient: 'from-[#007aff] to-[#32ade6]' },
    { id: 'electrical', icon: 'bolt', label: '电气/线路', gradient: 'from-[#ff9500] to-[#ffcc00]' },
    { id: 'hvac', icon: 'ac_unit', label: '暖通空调', gradient: 'from-[#28cd41] to-[#34c759]' },
    { id: 'structural', icon: 'home_work', label: '墙面/结构', gradient: 'from-[#5856d6] to-[#af52de]' },
    { id: 'painting', icon: 'format_paint', label: '粉刷/装饰', gradient: 'from-[#ff2d55] to-[#ff375f]' },
    { id: 'other', icon: 'handyman', label: '其他/通用', gradient: 'from-[#86868b] to-[#d2d2d7]' },
];
const CATEGORIES_EN = [
    { id: 'plumbing', icon: 'plumbing', label: 'Plumbing', gradient: 'from-[#007aff] to-[#32ade6]' },
    { id: 'electrical', icon: 'bolt', label: 'Electrical', gradient: 'from-[#ff9500] to-[#ffcc00]' },
    { id: 'hvac', icon: 'ac_unit', label: 'HVAC', gradient: 'from-[#28cd41] to-[#34c759]' },
    { id: 'structural', icon: 'home_work', label: 'Structural', gradient: 'from-[#5856d6] to-[#af52de]' },
    { id: 'painting', icon: 'format_paint', label: 'Painting', gradient: 'from-[#ff2d55] to-[#ff375f]' },
    { id: 'other', icon: 'handyman', label: 'General', gradient: 'from-[#86868b] to-[#d2d2d7]' },
];

const getTimeStr = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const InquiryChat: React.FC<InquiryChatProps> = ({ onComplete, onBack }) => {
    const { locale } = useLanguage();
    const isZh = locale === 'zh';
    const categories = isZh ? CATEGORIES_ZH : CATEGORIES_EN;

    const scrollRef = useRef<HTMLDivElement>(null);
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

    const [showCamera, setShowCamera] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [showInputMenu, setShowInputMenu] = useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                if (!scrollRef.current) return;
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        }
    }, [messages, isThinking]);

    useEffect(() => {
        Analytics.track('inquiry_started');
        setMessages([{
            role: 'assistant',
            content: isZh
                ? '👋 您好！我是您的智能家居维修顾问。请选择需要的服务类型，或直接拍照描述您的问题：'
                : '👋 Hello! I\'m your smart home maintenance advisor. Select a service type, or take a photo / describe your issue:',
            progress: 0,
            timestamp: getTimeStr(),
        }]);
    }, []);

    const openCamera = useCallback(async () => {
        setShowCamera(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => setCameraReady(true);
            }
        } catch (e) {
            console.error('Camera error', e);
        }
    }, []);

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
            const photoMsg: ChatMessage = {
                role: 'user',
                content: isZh ? '📷 已拍摄照片' : '📷 Photo taken',
                imageUrl: url,
                timestamp: getTimeStr(),
            };
            setMessages(prev => [...prev, photoMsg]);
            setShowWelcome(false);
            const newHistory = [...history, { role: 'user' as const, content: isZh ? '我拍了一张照片' : 'I took a photo' }];
            setHistory(newHistory);
            sendToAI(isZh ? '我拍了照片' : 'I took a photo', newHistory, base64);
            closeCamera();
        }, 'image/jpeg', 0.85);
    }, [history, isZh, closeCamera]);

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
            const newHistory = [...history, { role: 'user' as const, content: isZh ? '我上传了照片' : 'I uploaded a photo' }];
            setHistory(newHistory);
            sendToAI(isZh ? '我上传了照片' : 'I uploaded a photo', newHistory, b64);
        };
        reader.readAsDataURL(file);
        setShowInputMenu(false);
    };

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
                setTimeout(() => onComplete(response.demandSummary, imgB64 || imageBase64, imageUrl), 1500);
            }
        } catch (error) {
            console.error('Inquiry error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isZh ? '系统暂时不可用。' : 'System error.',
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
        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: getTimeStr() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        const newHistory = [...history, { role: 'user' as const, content: text }];
        setHistory(newHistory);
        sendToAI(text, newHistory);
    }, [isThinking, history, sendToAI]);

    const handleCategoryPick = useCallback((label: string) => handleSend(label), [handleSend]);
    const handleQuickReply = useCallback((reply: string) => handleSend(reply), [handleSend]);

    return (
        <div className="flex flex-col h-full bg-[#fbfbfd] text-[#1d1d1f] relative overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileImport} className="hidden" />

            {/* Header: Setup Assistant Style */}
            <div className="relative z-30 apple-glass border-b border-black/5 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl hover:bg-black/10 transition-all press-scale">
                        <span className="material-symbols-outlined text-[20px] text-[#86868b]">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-[14px] font-black tracking-tight">{isZh ? '需求诊断' : 'Diagnosis Assistant'}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-[#ff9500] animate-pulse' : 'bg-[#28cd41]'}`} />
                             <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">{isThinking ? (isZh ? '正在诊断' : 'Analyzing') : (isZh ? '专家在线' : 'Advisor Online')}</span>
                        </div>
                    </div>
                </div>

                {/* Circular Progress (Minimal) */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="3" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#1d1d1f" strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - progress} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <span className="text-[9px] font-black tabular-nums">{progress}%</span>
                </div>
            </div>

            <OperatingLoopProgress locale={locale} activeStageId="intake" compact className="mt-4" />

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 flex flex-col no-scrollbar selection:bg-[#0071e3]/20">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} stagger-item`}>
                         <div className={`max-w-[85%] lg:max-w-[60%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.imageUrl && (
                                <div className="mb-2 rounded-2xl overflow-hidden shadow-2xl shadow-black/5 ring-1 ring-black/5">
                                    <img src={msg.imageUrl} alt="Context" className="w-[280px] h-[210px] object-cover" />
                                </div>
                            )}
                            <div className={`p-5 rounded-[22px] ${msg.role === 'user' ? 'bg-[#1d1d1f] text-white rounded-tr-sm shadow-xl shadow-black/10' : 'bg-white apple-glass rounded-tl-sm shadow-sm border border-black/5'}`}>
                                <p className="text-[14px] font-medium leading-[1.5] whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <span className="mt-1.5 text-[10px] font-black text-[#86868b] uppercase tracking-wide opacity-40 px-2">{msg.timestamp}</span>
                         </div>

                         {/* Quick Replies for Assistant */}
                         {msg.quickReplies && msg.quickReplies.length > 0 && index === messages.length - 1 && !isThinking && (
                            <div className="flex flex-wrap gap-2 mt-4 stagger-item">
                                {msg.quickReplies.map((reply, ri) => (
                                    <button key={ri} onClick={() => handleQuickReply(reply)}
                                        className="px-5 py-2.5 bg-white border border-black/5 rounded-full text-[12px] font-bold text-[#1d1d1f] shadow-sm hover:shadow-md hover:bg-[#f5f5f7] transition-all press-scale">
                                        {reply}
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>
                ))}

                {/* Initial Category Selection (Apple Grid) */}
                {showWelcome && messages.length === 1 && !isThinking && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl stagger-item">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => handleCategoryPick(cat.label)}
                                className="aegis-card p-5 bg-white hover:bg-[#f5f5f7] flex flex-col items-center gap-3 transition-all">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}>
                                    <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                                </div>
                                <span className="text-[11px] font-black text-[#1d1d1f] uppercase tracking-wider">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isThinking && (
                    <div className="flex gap-2.5 items-center px-2">
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#1d1d1f] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#1d1d1f] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#1d1d1f] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar: Floating Style */}
            <div className="relative z-30 p-6 flex flex-col items-center">
                <div className="w-full max-w-3xl apple-glass shadow-2xl p-2 rounded-3xl flex items-center gap-2 border border-black/5 ring-1 ring-white/20">
                    <button onClick={() => setShowInputMenu(!showInputMenu)} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${showInputMenu ? 'bg-[#1d1d1f] text-white rotate-45' : 'bg-black/5 hover:bg-black/10 text-[#86868b]'}`}>
                        <span className="material-symbols-outlined text-[20px] font-black">add</span>
                    </button>

                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                        placeholder={isZh ? '输入消息，或通过附件上传照片...' : 'Type a message or use "+" to take photo'}
                        className="flex-1 h-12 bg-transparent text-[14px] font-bold px-2 focus:outline-none placeholder:font-medium placeholder:opacity-30"
                    />

                    <button 
                        onClick={() => handleSend(inputValue)} 
                        disabled={!inputValue.trim() || isThinking}
                        className="w-12 h-12 flex items-center justify-center bg-[#0071e3] disabled:opacity-30 text-white rounded-2xl shadow-lg shadow-[#0071e3]/30 transition-all press-scale">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                    </button>
                </div>

                {/* Sub Menu */}
                {showInputMenu && (
                    <div className="flex gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         <button onClick={() => { openCamera(); setShowInputMenu(false); }} className="px-6 py-2.5 bg-white border border-black/5 rounded-2xl text-[12px] font-black text-[#1d1d1f] flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                             <span className="material-symbols-outlined text-lg">photo_camera</span> CAMERA
                         </button>
                         <button onClick={() => { fileRef.current?.click(); setShowInputMenu(false); }} className="px-6 py-2.5 bg-white border border-black/5 rounded-2xl text-[12px] font-black text-[#1d1d1f] flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                             <span className="material-symbols-outlined text-lg">image</span> GALLERY
                         </button>
                    </div>
                )}
            </div>

            {/* Camera Overlay */}
            {showCamera && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <div className="p-6 flex justify-between items-center relative z-20">
                         <button onClick={closeCamera} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-3xl">
                             <span className="material-symbols-outlined">close</span>
                         </button>
                         <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Visual Diagnosis</span>
                         <div className="w-10" />
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-x-12 top-24 bottom-24 border border-white/20 rounded-3xl pointer-events-none" />
                    </div>
                    <div className="p-10 flex flex-col items-center gap-8 bg-gradient-to-t from-black to-transparent">
                         <button onClick={capturePhoto} disabled={!cameraReady} className="w-20 h-20 rounded-full border-4 border-white/30 p-1 active:scale-90 transition-transform disabled:opacity-30">
                             <div className="w-full h-full bg-white rounded-full shadow-2xl" />
                         </button>
                         <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Focusing on the issue</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InquiryChat;
