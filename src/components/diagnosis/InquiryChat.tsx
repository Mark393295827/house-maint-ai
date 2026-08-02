import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { diagnosePhoto, inquiryChat, type PhotoDiagnosis } from '../../services/ai';
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
    photoDiagnosis?: PhotoDiagnosis;
}

interface InquiryChatProps {
    onComplete: (summary: DemandData, imageBase64?: string | null, imageUrl?: string | null) => void;
    onBack: () => void;
}

/* ─── Category Cards (Apple Style) ─── */
const CATEGORIES_ZH = [
    { id: 'plumbing', icon: 'plumbing', label: '水管/管道', gradient: 'from-[#1a73e8] to-[#32ade6]' },
    { id: 'electrical', icon: 'bolt', label: '电气/线路', gradient: 'from-[#ff9500] to-[#ffcc00]' },
    { id: 'hvac', icon: 'ac_unit', label: '暖通空调', gradient: 'from-[#34a853] to-[#34c759]' },
    { id: 'structural', icon: 'home_work', label: '墙面/结构', gradient: 'from-[#a142f4] to-[#af52de]' },
    { id: 'painting', icon: 'format_paint', label: '粉刷/装饰', gradient: 'from-[#ff2d55] to-[#ff375f]' },
    { id: 'other', icon: 'handyman', label: '其他/通用', gradient: 'from-[#86868b] to-[#d2d2d7]' },
];
const CATEGORIES_EN = [
    { id: 'plumbing', icon: 'plumbing', label: 'Plumbing', gradient: 'from-[#1a73e8] to-[#32ade6]' },
    { id: 'electrical', icon: 'bolt', label: 'Electrical', gradient: 'from-[#ff9500] to-[#ffcc00]' },
    { id: 'hvac', icon: 'ac_unit', label: 'HVAC', gradient: 'from-[#34a853] to-[#34c759]' },
    { id: 'structural', icon: 'home_work', label: 'Structural', gradient: 'from-[#a142f4] to-[#af52de]' },
    { id: 'painting', icon: 'format_paint', label: 'Painting', gradient: 'from-[#ff2d55] to-[#ff375f]' },
    { id: 'other', icon: 'handyman', label: 'General', gradient: 'from-[#86868b] to-[#d2d2d7]' },
];

const getTimeStr = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const PhotoDiagnosisCard: React.FC<{ diagnosis: PhotoDiagnosis; isZh: boolean }> = ({ diagnosis, isZh }) => {
    const severityLabel = diagnosis.severity === 'critical'
        ? (isZh ? '紧急' : 'Urgent')
        : diagnosis.severity === 'moderate'
            ? (isZh ? '中等' : 'Moderate')
            : (isZh ? '轻微' : 'Low');
    const severityClass = diagnosis.severity === 'critical'
        ? 'bg-[#fef2f2] text-[#c5221f]'
        : diagnosis.severity === 'moderate'
            ? 'bg-[#fff7e6] text-[#b06000]'
            : 'bg-[#eef7ee] text-[#188038]';

    if (!diagnosis.detected) {
        return (
            <section
                aria-label={isZh ? '照片分析结果' : 'Photo analysis result'}
                className="mt-3 w-full max-w-[560px] rounded-[24px] border border-[#f2c94c]/30 bg-[#fffbeb] p-5 text-[#202124]"
            >
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[#b06000]" aria-hidden="true">center_focus_weak</span>
                    <div>
                        <h3 className="text-[15px] font-black">
                            {isZh ? '未识别到明确的维修问题' : 'No clear maintenance issue detected'}
                        </h3>
                        <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">
                            {diagnosis.summary || (isZh
                                ? '请重新拍摄故障部位，而不是人物或整个房间。'
                                : 'Retake the damaged fixture rather than a person or the whole room.')}
                        </p>
                    </div>
                </div>
                <div className="mt-4 rounded-2xl bg-white/80 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#86868b]">
                        {isZh ? '建议重拍方式' : 'How to retake'}
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] leading-5 text-[#3c4043]">
                        <li>{isZh ? '先拍摄设备或受损区域的整体位置。' : 'Show the full fixture or damaged area.'}</li>
                        <li>{isZh ? '再拍一张漏水、裂缝或损坏细节的近照。' : 'Add a close-up of the leak, crack, or damage.'}</li>
                        <li>{isZh ? '保持光线充足、画面清晰，并避免拍到人脸。' : 'Use good light, keep it sharp, and avoid faces.'}</li>
                    </ol>
                </div>
            </section>
        );
    }

    return (
        <section
            aria-label={isZh ? '照片初步诊断' : 'Preliminary photo diagnosis'}
            className="mt-3 w-full max-w-[560px] rounded-[24px] border border-black/5 bg-[#f8f9fa] p-5 text-[#202124]"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#86868b]">
                        {isZh ? 'AI 照片初步诊断' : 'AI preliminary photo diagnosis'}
                    </p>
                    <h3 className="mt-1 text-[17px] font-black tracking-tight">{diagnosis.issueName}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${severityClass}`}>{severityLabel}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#5f6368]">
                        {Math.round(diagnosis.confidence * 100)}%
                    </span>
                </div>
            </div>

            <div className="mt-4">
                <p className="text-[11px] font-black text-[#86868b]">{isZh ? '观察与判断' : 'Observation'}</p>
                <p className="mt-1 text-[13px] leading-6 text-[#3c4043]">{diagnosis.summary}</p>
            </div>

            {diagnosis.safetyWarning && (
                <div className="mt-4 flex gap-2 rounded-2xl bg-[#fef2f2] p-3 text-[#a50e0e]">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>
                    <p className="text-[12px] font-bold leading-5">{diagnosis.safetyWarning}</p>
                </div>
            )}

            {diagnosis.steps.length > 0 && (
                <div className="mt-4">
                    <p className="text-[11px] font-black text-[#86868b]">{isZh ? '建议下一步' : 'Recommended next steps'}</p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[12px] leading-5 text-[#3c4043]">
                        {diagnosis.steps.slice(0, 4).map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
                    </ol>
                </div>
            )}

            <p className="mt-4 border-t border-black/5 pt-3 text-[10px] leading-4 text-[#86868b]">
                {isZh
                    ? '以上仅为基于照片的初步判断。请补充发生位置和症状，系统会继续核实。'
                    : 'This is a photo-based preliminary assessment. Add the location and symptoms so the system can verify it.'}
            </p>
        </section>
    );
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
    const [cameraError, setCameraError] = useState<string | null>(null);
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
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            setStream(mediaStream);
        } catch (e) {
            console.error('Camera error', e);
            setCameraError(isZh
                ? '无法使用摄像头。请允许摄像头权限，或改用相册上传。'
                : 'The camera is unavailable. Allow camera access or upload from the gallery.');
        }
    }, [isZh]);

    useEffect(() => {
        const video = videoRef.current;
        if (!showCamera || !stream || !video) return;

        video.srcObject = stream;
        if (video.readyState >= 1) {
            setCameraReady(true);
        }

        return () => {
            if (video.srcObject === stream) {
                video.srcObject = null;
            }
        };
    }, [showCamera, stream]);

    const closeCamera = useCallback(() => {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
        setShowCamera(false);
        setCameraReady(false);
    }, [stream]);

    useEffect(() => () => {
        stream?.getTracks().forEach(track => track.stop());
    }, [stream]);

    const analyzeCapturedPhoto = useCallback(async (
        base64: string,
        url: string,
        source: 'camera' | 'gallery',
        mimeType = 'image/jpeg'
    ) => {
        setImageBase64(base64);
        setImageUrl(url);
        setShowWelcome(false);

        const userText = source === 'camera'
            ? (isZh ? '我拍了一张需要诊断的照片' : 'I took a photo for diagnosis')
            : (isZh ? '我上传了一张需要诊断的照片' : 'I uploaded a photo for diagnosis');
        const photoMsg: ChatMessage = {
            role: 'user',
            content: source === 'camera'
                ? (isZh ? '📷 已拍摄照片' : '📷 Photo taken')
                : (isZh ? '📷 已上传照片' : '📷 Photo uploaded'),
            imageUrl: url,
            timestamp: getTimeStr(),
        };
        const newHistory = [...history, { role: 'user' as const, content: userText }];

        setMessages(prev => [...prev, photoMsg]);
        setHistory(newHistory);
        setIsThinking(true);

        try {
            const diagnosis = await diagnosePhoto(
                base64,
                mimeType,
                isZh
                    ? '请直接分析照片中可见的房屋维修问题；如果没有清晰展示故障，请明确说明并给出重拍建议。请使用中文。'
                    : 'Directly analyze the visible home-maintenance issue. If no fault is clearly shown, say so and explain how to retake the photo. Respond in English.'
            );
            const assistantText = diagnosis.detected
                ? (isZh
                    ? `照片初步判断：${diagnosis.issueName}。请继续告诉我问题发生在哪个房间或区域。`
                    : `Preliminary photo finding: ${diagnosis.issueName}. Tell me which room or area this is in.`)
                : (isZh
                    ? '这张照片没有清晰展示维修故障。请按照下方建议重新拍摄。'
                    : 'This photo does not clearly show a maintenance problem. Please retake it using the guidance below.');
            const aiMsg: ChatMessage = {
                role: 'assistant',
                content: assistantText,
                photoDiagnosis: diagnosis,
                quickReplies: diagnosis.detected
                    ? (isZh
                        ? ['厨房', '卫生间', '卧室', '客厅', '阳台', '外墙']
                        : ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Balcony', 'Exterior'])
                    : undefined,
                progress: diagnosis.detected ? 35 : 10,
                timestamp: getTimeStr(),
            };

            setMessages(prev => [...prev, aiMsg]);
            setHistory([...newHistory, { role: 'assistant', content: `${assistantText}\n${diagnosis.summary}` }]);
            setProgress(aiMsg.progress || 0);
            Analytics.track('photo_diagnosis_completed', {
                source,
                detected: diagnosis.detected,
                category: diagnosis.category,
                severity: diagnosis.severity,
                confidence: diagnosis.confidence,
            });
        } catch (error) {
            console.error('Photo diagnosis error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isZh
                    ? '照片已保留，但 AI 分析失败。请确认后端服务正在运行后重试，或重新拍摄一张更清晰的故障照片。'
                    : 'Your photo was kept, but AI analysis failed. Check that the backend is running, then retry or take a clearer photo.',
                timestamp: getTimeStr(),
            }]);
            Analytics.track('photo_diagnosis_failed', { source });
        } finally {
            setIsThinking(false);
        }
    }, [history, isZh]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current, c = canvasRef.current, ctx = c.getContext('2d');
        if (!ctx) return;
        if (!v.videoWidth || !v.videoHeight) {
            setCameraError(isZh ? '摄像头尚未准备好，请稍候重试。' : 'The camera is not ready yet. Please try again.');
            return;
        }
        c.width = v.videoWidth; c.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const base64 = c.toDataURL('image/jpeg', 0.85).split(',')[1];
        c.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            closeCamera();
            void analyzeCapturedPhoto(base64, url, 'camera', 'image/jpeg');
        }, 'image/jpeg', 0.85);
    }, [analyzeCapturedPhoto, closeCamera, isZh]);

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        const reader = new FileReader();
        reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1];
            void analyzeCapturedPhoto(b64, url, 'gallery', file.type || 'image/jpeg');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
        setShowInputMenu(false);
    };

    useEffect(() => () => {
        if (imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
        }
    }, [imageUrl]);

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
        <div className="flex flex-col h-full bg-[#ffffff] text-[#202124] relative overflow-hidden">
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
                             <div className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-[#ff9500] animate-pulse' : 'bg-[#34a853]'}`} />
                             <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">{isThinking ? (isZh ? '正在诊断' : 'Analyzing') : (isZh ? '专家在线' : 'Advisor Online')}</span>
                        </div>
                    </div>
                </div>

                {/* Circular Progress (Minimal) */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="3" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#202124" strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - progress} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <span className="text-[9px] font-black tabular-nums">{progress}%</span>
                </div>
            </div>

            <OperatingLoopProgress locale={locale} activeStageId="intake" compact className="mt-4" />

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 flex flex-col no-scrollbar selection:bg-[#1a73e8]/20">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} stagger-item`}>
                         <div className={`max-w-[85%] lg:max-w-[60%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.imageUrl && (
                                <div className="mb-2 rounded-2xl overflow-hidden shadow-2xl shadow-black/5 ring-1 ring-black/5">
                                    <img src={msg.imageUrl} alt="Context" className="w-[280px] h-[210px] object-cover" />
                                </div>
                            )}
                            <div className={`p-5 rounded-[22px] ${msg.role === 'user' ? 'bg-[#202124] text-white rounded-tr-sm shadow-xl shadow-black/10' : 'bg-white apple-glass rounded-tl-sm shadow-sm border border-black/5'}`}>
                                <p className="text-[14px] font-medium leading-[1.5] whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.photoDiagnosis && (
                                <PhotoDiagnosisCard diagnosis={msg.photoDiagnosis} isZh={isZh} />
                            )}
                            <span className="mt-1.5 text-[10px] font-black text-[#86868b] uppercase tracking-wide opacity-40 px-2">{msg.timestamp}</span>
                         </div>

                         {/* Quick Replies for Assistant */}
                         {msg.quickReplies && msg.quickReplies.length > 0 && index === messages.length - 1 && !isThinking && (
                            <div className="flex flex-wrap gap-2 mt-4 stagger-item">
                                {msg.quickReplies.map((reply, ri) => (
                                    <button key={ri} onClick={() => handleQuickReply(reply)}
                                        className="px-5 py-2.5 bg-white border border-black/5 rounded-full text-[12px] font-bold text-[#202124] shadow-sm hover:shadow-md hover:bg-[#f8f9fa] transition-all press-scale">
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
                                className="aegis-card p-5 bg-white hover:bg-[#f8f9fa] flex flex-col items-center gap-3 transition-all">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}>
                                    <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                                </div>
                                <span className="text-[11px] font-black text-[#202124] uppercase tracking-wider">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isThinking && (
                    <div className="flex gap-2.5 items-center px-2">
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#202124] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#202124] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#202124] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar: Floating Style */}
            <div className="relative z-30 p-6 flex flex-col items-center">
                <div className="w-full max-w-3xl apple-glass shadow-2xl p-2 rounded-3xl flex items-center gap-2 border border-black/5 ring-1 ring-white/20">
                    <button onClick={() => setShowInputMenu(!showInputMenu)} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${showInputMenu ? 'bg-[#202124] text-white rotate-45' : 'bg-black/5 hover:bg-black/10 text-[#86868b]'}`}>
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
                        className="w-12 h-12 flex items-center justify-center bg-[#1a73e8] disabled:opacity-30 text-white rounded-2xl shadow-lg shadow-[#1a73e8]/30 transition-all press-scale">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                    </button>
                </div>

                {/* Sub Menu */}
                {showInputMenu && (
                    <div className="flex gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         <button onClick={() => { openCamera(); setShowInputMenu(false); }} className="px-6 py-2.5 bg-white border border-black/5 rounded-2xl text-[12px] font-black text-[#202124] flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                             <span className="material-symbols-outlined text-lg">photo_camera</span> CAMERA
                         </button>
                         <button onClick={() => { fileRef.current?.click(); setShowInputMenu(false); }} className="px-6 py-2.5 bg-white border border-black/5 rounded-2xl text-[12px] font-black text-[#202124] flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
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
                        {cameraError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
                                <span className="material-symbols-outlined text-5xl text-white/60" aria-hidden="true">no_photography</span>
                                <p role="alert" className="mt-4 max-w-md text-[14px] font-bold leading-6">{cameraError}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        closeCamera();
                                        fileRef.current?.click();
                                    }}
                                    className="mt-6 rounded-2xl bg-white px-5 py-3 text-[12px] font-black text-[#202124]"
                                >
                                    {isZh ? '从相册选择' : 'Choose from gallery'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadedMetadata={() => setCameraReady(true)}
                                    onCanPlay={() => setCameraReady(true)}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-12 top-24 bottom-24 border border-white/20 rounded-3xl pointer-events-none" />
                            </>
                        )}
                    </div>
                    <div className="p-10 flex flex-col items-center gap-8 bg-gradient-to-t from-black to-transparent">
                         <button
                             onClick={capturePhoto}
                             disabled={!cameraReady || !!cameraError || isThinking}
                             aria-label={isZh ? '拍摄并分析照片' : 'Capture and analyze photo'}
                             className="w-20 h-20 rounded-full border-4 border-white/30 p-1 active:scale-90 transition-transform disabled:opacity-30"
                         >
                             <div className="w-full h-full bg-white rounded-full shadow-2xl" />
                         </button>
                         <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                             {isZh ? '对准故障区域，拍照后立即分析' : 'Frame the issue for immediate analysis'}
                         </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InquiryChat;
