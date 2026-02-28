import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { addCase, generateCaseId, type CaseRecord } from '../../store/cases';

// Shared UI
import { SkeletonCard as _SkeletonCard } from './WizardUI';

// Wizard Steps
import StepInput from './steps/StepInput';
import StepDispatch from './steps/StepDispatch';

/* ─── Types ─── */
interface WizardState {
    step: number;
    imageUrl: string | null;
    imageBase64: string | null;
    initialDiagnosis: any;
    meceResult: any;
    selectedCategory: string;
    hypotheses: any;
    selectedHypothesis: string;
    checklist: any;
    checklistAnswers: Record<string, any>;
    fiveWhyHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    fiveWhyResult: any;
    rootCause: string;
    solution: any;
    pdcaTasks: any[];
    followUpDate: string;
    archived: boolean;
}

const STEP_LABELS_ZH = ['录入', 'MECE', '假设', '收集', '5-Why', '方案', 'PDCA', '验收'];
const STEP_LABELS_EN = ['Input', 'MECE', 'Hypo.', 'Check', '5-Why', 'Solution', 'PDCA', 'Done'];
const DRAFT_KEY = 'wizard_draft';

const DEFAULT_STATE: WizardState = {
    step: 1, imageUrl: null, imageBase64: null, initialDiagnosis: null,
    meceResult: null, selectedCategory: '', hypotheses: null, selectedHypothesis: '',
    checklist: null, checklistAnswers: {}, fiveWhyHistory: [], fiveWhyResult: null,
    rootCause: '', solution: null, pdcaTasks: [], followUpDate: '', archived: false
};

const DiagnosisWizard: React.FC = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const labels = locale === 'zh' ? STEP_LABELS_ZH : STEP_LABELS_EN;

    const [state, setState] = useState<WizardState>(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as WizardState;
                if (parsed.step > 1) return { ...DEFAULT_STATE, ...parsed, imageUrl: null };
            }
        } catch { /* ignore */ }
        return DEFAULT_STATE;
    });

    const [error, setError] = useState<string | null>(null);
    const [_hasDraft] = useState(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) { const p = JSON.parse(raw); return p.step > 1; }
        } catch { /* ignore */ }
        return false;
    });

    console.log('[Wizard] Init with draft status:', _hasDraft);

    const directionRef = useRef<'fwd' | 'back'>('fwd');
    const [animKey, setAnimKey] = useState(0);
    const retryRef = useRef<(() => void) | null>(null);

    const update = (partial: Partial<WizardState>) => setState(prev => ({ ...prev, ...partial }));

    const advanceStep = (toStep: number, partial: Partial<WizardState> = {}) => {
        directionRef.current = toStep > state.step ? 'fwd' : 'back';
        setAnimKey(k => k + 1);
        setState(prev => ({ ...prev, ...partial, step: toStep }));
    };

    useEffect(() => {
        if (state.step > 1 || state.imageBase64) {
            const { imageUrl, ...saveable } = state;
            localStorage.setItem(DRAFT_KEY, JSON.stringify(saveable));
        }
    }, [state]);

    const handleBack = () => {
        if (state.step > 1) {
            const msg = locale === 'zh' ? '离开诊断？进度已自动保存为草稿。' : 'Leave diagnosis? Progress saved as draft.';
            if (window.confirm(msg)) navigate(-1);
        } else {
            localStorage.removeItem(DRAFT_KEY);
            navigate(-1);
        }
    };

    // --- References & Logic (Camera, Network Calls) ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.onloadedmetadata = () => setCameraReady(true);
                }
            } catch (e: any) {
                setCameraError(e.name === 'NotAllowedError' ? (locale === 'zh' ? '请允许摄像头权限' : 'Camera permission required') : (locale === 'zh' ? '无法访问摄像头' : 'Camera unavailable'));
            }
        };
        init();
        return () => { stream?.getTracks().forEach(t => t.stop()); };
    }, []);

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
            update({ imageUrl: url, imageBase64: base64 });
            proceedToAnalysis(base64);
        }, 'image/jpeg', 0.85);
    }, []);

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        update({ imageUrl: url });
        const reader = new FileReader();
        reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1];
            update({ imageBase64: b64 });
            proceedToAnalysis(b64);
        };
        reader.readAsDataURL(file);
    };

    const proceedToAnalysis = async (base64: string) => {
        // Step 2 is now Dispatch. The AI analysis happens during the "searching" state.
        advanceStep(2); setError(null);

        // Use the combined analyzeImage API from ai.ts which provides severity/cost/issue
        import('../../services/ai').then(async ({ analyzeImage }) => {
            try {
                const diagnosis = await analyzeImage(base64, 'image/jpeg');
                update({ initialDiagnosis: diagnosis });
            } catch (e: any) {
                setError(e.message);
            }
        });
    };

    const handleDispatch = (worker: any) => {
        sessionStorage.setItem('selectedWorker', JSON.stringify(worker));

        // Save case 
        const newCase: CaseRecord = {
            id: generateCaseId(),
            title: state.initialDiagnosis?.issue_name || (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
            titleEn: state.initialDiagnosis?.issue_name_en || 'New Diagnosis',
            status: 'active',
            step: 2,
            severity: state.initialDiagnosis?.severity || 'moderate',
            date: new Date().toISOString().split('T')[0],
            category: state.initialDiagnosis?.raw_response?.diagnosis?.category || 'other',
            rootCause: state.initialDiagnosis?.description || '',
            solution: '',
        };
        addCase(newCase);
        localStorage.removeItem(DRAFT_KEY);

        // Transition to match/calendar
        navigate('/calendar');
    };

    return (
        <div className="flex flex-col h-screen bg-[#1a1c29] text-white overflow-hidden">
            {/* Minimal Header */}
            <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 flex items-center justify-between pointer-events-none">
                <button onClick={handleBack} className="pointer-events-auto p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full active:scale-90 transition-transform text-white/80">
                    <span className="material-symbols-outlined text-xl block">close</span>
                </button>
                <div className="flex gap-1.5 w-1/3 max-w-[120px]">
                    {labels.map((_, i) => (
                        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/20">
                            {i <= state.step - 1 && (
                                <div className="h-full w-full bg-white opacity-80" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Error banner */}
            {error && (
                <div className="mx-4 mt-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <span className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</span>
                    <div className="flex gap-2 flex-shrink-0">
                        {retryRef.current && (
                            <button onClick={() => { setError(null); retryRef.current?.(); }} className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-lg">
                                {locale === 'zh' ? '重试' : 'Retry'}
                            </button>
                        )}
                        <button onClick={() => setError(null)} className="text-xs text-red-400 underline">
                            {locale === 'zh' ? '关闭' : 'Dismiss'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step Body */}
            <div className="flex-1 overflow-y-auto">
                <div key={animKey} className={directionRef.current === 'fwd' ? 'step-slide-fwd' : 'step-slide-back'}>
                    {state.step === 1 && <StepInput videoRef={videoRef} cameraReady={cameraReady} cameraError={cameraError} imageUrl={state.imageUrl} onCapture={capturePhoto} onUpload={() => fileRef.current?.click()} locale={locale} />}
                    {state.step === 2 && <StepDispatch diagnosis={state.initialDiagnosis} locale={locale} imageUrl={state.imageUrl || ''} onDispatch={handleDispatch} />}
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileImport} className="hidden" />
        </div>
    );
};

export default DiagnosisWizard;
