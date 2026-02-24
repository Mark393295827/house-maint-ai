import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { callMECE, callHypothesis, callChecklist, callFiveWhy, callSolution } from '../../services/ai';
import { addCase, generateCaseId, type CaseRecord } from '../../store/cases';

// Shared UI
import { SkeletonCard as _SkeletonCard } from './WizardUI';


// Wizard Steps
import StepInput from './steps/StepInput';
import StepMECE from './steps/StepMECE';
import StepHypothesis from './steps/StepHypothesis';
import StepChecklist from './steps/StepChecklist';
import StepFiveWhy from './steps/StepFiveWhy';
import StepSolution from './steps/StepSolution';
import StepPDCA from './steps/StepPDCA';
import StepFollowUp from './steps/StepFollowUp';

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
const TOTAL_STEPS = 8;
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

    const [loading, setLoading] = useState(false);
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

    const clearDraftAndFinish = () => {
        const newCase: CaseRecord = {
            id: generateCaseId(),
            title: state.selectedCategory
                ? (locale === 'zh' ? `${state.selectedCategory} 问题` : `${state.selectedCategory} Issue`)
                : (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
            titleEn: state.selectedCategory ? `${state.selectedCategory} Issue` : 'New Diagnosis',
            status: 'archived',
            step: 8,
            severity: 'moderate',
            date: new Date().toISOString().split('T')[0],
            category: state.selectedCategory || '',
            rootCause: state.rootCause || '',
            solution: state.solution?.issue_name || '',
        };
        addCase(newCase);
        localStorage.removeItem(DRAFT_KEY);
        navigate('/');
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
            proceedToMECE(base64);
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
            proceedToMECE(b64);
        };
        reader.readAsDataURL(file);
    };

    const proceedToMECE = async (base64: string) => {
        advanceStep(2); setLoading(true); setError(null);
        const doCall = async () => {
            setLoading(true); setError(null);
            try {
                const result = await callMECE(base64, 'image/jpeg', '', locale);
                update({ meceResult: result });
            } catch (e: any) { setError(e.message); retryRef.current = doCall; }
            finally { setLoading(false); }
        };
        await doCall();
    };

    const selectCategory = async (categoryId: string) => {
        advanceStep(3, { selectedCategory: categoryId }); setLoading(true); setError(null);
        const doCall = async () => {
            setLoading(true); setError(null);
            try {
                const result = await callHypothesis(categoryId, state.imageBase64, 'image/jpeg', locale);
                update({ hypotheses: result });
            } catch (e: any) { setError(e.message); retryRef.current = doCall; }
            finally { setLoading(false); }
        };
        await doCall();
    };

    const selectHypothesis = async (hypothesisTitle: string) => {
        advanceStep(4, { selectedHypothesis: hypothesisTitle }); setLoading(true); setError(null);
        const doCall = async () => {
            setLoading(true); setError(null);
            try {
                const result = await callChecklist(hypothesisTitle, state.imageBase64, 'image/jpeg', locale);
                update({ checklist: result });
            } catch (e: any) { setError(e.message); retryRef.current = doCall; }
            finally { setLoading(false); }
        };
        await doCall();
    };

    const submitChecklist = async (answers: Record<string, any>) => {
        const context = { category: state.selectedCategory, hypothesis: state.selectedHypothesis, checklist_answers: answers };
        const summaryText = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('; ');
        const initHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
            { role: 'user', content: locale === 'zh' ? `问题类别：${state.selectedCategory}\n假设：${state.selectedHypothesis}\n观察结果：${summaryText}` : `Category: ${state.selectedCategory}\nHypothesis: ${state.selectedHypothesis}\nObservations: ${summaryText}` }
        ];
        advanceStep(5, { checklistAnswers: answers, fiveWhyHistory: initHistory }); setLoading(true); setError(null);
        const doCall = async () => {
            setLoading(true); setError(null);
            try {
                const result = await callFiveWhy(initHistory, context, state.imageBase64, 'image/jpeg', locale);
                update({ fiveWhyResult: result, fiveWhyHistory: [...initHistory, { role: 'assistant', content: result.question || result.message || '' }] });
            } catch (e: any) { setError(e.message); retryRef.current = doCall; }
            finally { setLoading(false); }
        };
        await doCall();
    };

    const sendFiveWhyAnswer = async (answer: string) => {
        const newHistory = [...state.fiveWhyHistory, { role: 'user' as const, content: answer }];
        update({ fiveWhyHistory: newHistory }); setLoading(true); setError(null);
        try {
            const context = { category: state.selectedCategory, hypothesis: state.selectedHypothesis };
            const result = await callFiveWhy(newHistory, context, state.imageBase64, 'image/jpeg', locale);
            if (result.type === 'root_cause') {
                advanceStep(6, { rootCause: result.root_cause, fiveWhyResult: result, fiveWhyHistory: [...newHistory, { role: 'assistant', content: result.message }] });
                setLoading(true);
                const sol = await callSolution(result.root_cause, context, locale);
                update({ solution: sol });
            } else {
                update({ fiveWhyResult: result, fiveWhyHistory: [...newHistory, { role: 'assistant', content: result.question || result.message }] });
            }
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const generatePDCA = () => {
        if (!state.solution) return;
        const sol = state.solution;
        const tasks = [
            { phase: 'Plan', icon: 'edit_note', color: 'bg-blue-500', items: [{ text: locale === 'zh' ? `确认诊断：${sol.issue_name}` : `Confirm diagnosis: ${sol.issue_name}`, done: true }, { text: locale === 'zh' ? '采购所需材料和工具' : 'Procure required parts and tools', done: false }, { text: locale === 'zh' ? '安排维修时间' : 'Schedule repair time', done: false }] },
            { phase: 'Do', icon: 'construction', color: 'bg-emerald-500', items: sol.steps?.map((s: any) => ({ text: `${s.action}: ${s.detail}`, done: false })) || [] },
            { phase: 'Check', icon: 'fact_check', color: 'bg-amber-500', items: [{ text: locale === 'zh' ? '修复后观察30分钟确认无异常' : 'Observe 30min after repair to confirm no issues', done: false }, { text: locale === 'zh' ? '拍照记录修复结果' : 'Photo-document the repair result', done: false }] },
            { phase: 'Act', icon: 'trending_up', color: 'bg-violet-500', items: (sol.prevention_tips || []).map((tip: string) => ({ text: tip, done: false })) }
        ];
        advanceStep(7, { pdcaTasks: tasks });
    };

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <button onClick={handleBack} className="text-gray-500 dark:text-gray-400 active:scale-90 transition-transform">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark flex-1">
                        {locale === 'zh' ? '智能诊断' : 'Smart Diagnosis'}
                    </h1>
                    <span className="text-xs font-bold text-primary">{state.step}/{TOTAL_STEPS}</span>
                </div>
                <div className="flex gap-1">
                    {labels.map((label, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`h-1.5 w-full rounded-full transition-all ${i + 1 <= state.step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <span className={`text-[9px] font-medium ${i + 1 === state.step ? 'text-primary font-bold' : 'text-gray-400'}`}>{label}</span>
                        </div>
                    ))}
                </div>
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
                    {state.step === 2 && <StepMECE result={state.meceResult} loading={loading} onSelect={selectCategory} locale={locale} imageUrl={state.imageUrl} />}
                    {state.step === 3 && <StepHypothesis result={state.hypotheses} loading={loading} onSelect={selectHypothesis} locale={locale} />}
                    {state.step === 4 && <StepChecklist checklist={state.checklist} loading={loading} onSubmit={submitChecklist} locale={locale} />}
                    {state.step === 5 && <StepFiveWhy history={state.fiveWhyHistory} result={state.fiveWhyResult} loading={loading} onAnswer={sendFiveWhyAnswer} locale={locale} />}
                    {state.step === 6 && <StepSolution solution={state.solution} loading={loading} locale={locale} navigate={navigate} onNext={generatePDCA} />}
                    {state.step === 7 && <StepPDCA tasks={state.pdcaTasks} locale={locale} onNext={() => advanceStep(8)} />}
                    {state.step === 8 && <StepFollowUp locale={locale} followUpDate={state.followUpDate} archived={state.archived} onDateChange={(d: string) => update({ followUpDate: d })} onArchive={() => update({ archived: true })} onHome={clearDraftAndFinish} />}
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileImport} className="hidden" />
        </div>
    );
};

export default DiagnosisWizard;
