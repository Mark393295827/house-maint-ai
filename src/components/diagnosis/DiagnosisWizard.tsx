import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { callMECE, callHypothesis, callChecklist, callFiveWhy, callSolution } from '../../services/ai';
import { addCase, generateCaseId, type CaseRecord } from '../../store/cases';

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

/* ─── Draft storage key ─── */
const DRAFT_KEY = 'wizard_draft';
const DEFAULT_STATE: WizardState = {
    step: 1, imageUrl: null, imageBase64: null, initialDiagnosis: null,
    meceResult: null, selectedCategory: '', hypotheses: null, selectedHypothesis: '',
    checklist: null, checklistAnswers: {}, fiveWhyHistory: [], fiveWhyResult: null,
    rootCause: '', solution: null, pdcaTasks: [], followUpDate: '', archived: false
};

/* ═══════════════════════════════════════════════════════════════
   MAIN WIZARD COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const DiagnosisWizard: React.FC = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const labels = locale === 'zh' ? STEP_LABELS_ZH : STEP_LABELS_EN;

    // A: Lazy init — rehydrate from localStorage draft if available
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
    const [hasDraft] = useState(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) { const p = JSON.parse(raw); return p.step > 1; }
        } catch { /* ignore */ }
        return false;
    });

    // B: Track animation direction
    const directionRef = useRef<'fwd' | 'back'>('fwd');
    const [animKey, setAnimKey] = useState(0);
    const retryRef = useRef<(() => void) | null>(null);

    const update = (partial: Partial<WizardState>) => setState(prev => ({ ...prev, ...partial }));
    const advanceStep = (toStep: number, partial: Partial<WizardState> = {}) => {
        directionRef.current = toStep > state.step ? 'fwd' : 'back';
        setAnimKey(k => k + 1);
        setState(prev => ({ ...prev, ...partial, step: toStep }));
    };

    // A: Save draft on every state change (except step 1 with no image)
    useEffect(() => {
        if (state.step > 1 || state.imageBase64) {
            const { imageUrl, ...saveable } = state; // blob URLs can't be serialized
            localStorage.setItem(DRAFT_KEY, JSON.stringify(saveable));
        }
    }, [state]);

    // D: Exit-confirm handler
    const handleBack = () => {
        if (state.step > 1) {
            const msg = locale === 'zh'
                ? '离开诊断？进度已自动保存为草稿。'
                : 'Leave diagnosis? Progress saved as draft.';
            if (window.confirm(msg)) navigate(-1);
        } else {
            localStorage.removeItem(DRAFT_KEY);
            navigate(-1);
        }
    };

    const clearDraftAndFinish = () => {
        // Save completed case to shared store
        const newCase: CaseRecord = {
            id: generateCaseId(),
            title: state.selectedCategory
                ? (locale === 'zh' ? `${state.selectedCategory} 问题` : `${state.selectedCategory} Issue`)
                : (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
            titleEn: state.selectedCategory
                ? `${state.selectedCategory} Issue`
                : 'New Diagnosis',
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

    /* ─── Step 1: Camera + File Input ─── */
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
                setCameraError(e.name === 'NotAllowedError'
                    ? (locale === 'zh' ? '请允许摄像头权限' : 'Camera permission required')
                    : (locale === 'zh' ? '无法访问摄像头' : 'Camera unavailable'));
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

    /* ─── Step 2: MECE Analysis ─── */
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

    /* ─── Step 3 → 4: Hypothesis → Checklist ─── */
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

    /* ─── Step 4 → 5: Checklist → 5-Why ─── */
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

    /* ─── Step 5: 5-Why Dialog ─── */
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

    /* ─── Step 6 → 7: Solution → PDCA ─── */
    const generatePDCA = () => {
        if (!state.solution) return;
        const sol = state.solution;
        const tasks = [
            {
                phase: 'Plan', icon: 'edit_note', color: 'bg-blue-500', items: [
                    { text: locale === 'zh' ? `确认诊断：${sol.issue_name}` : `Confirm diagnosis: ${sol.issue_name}`, done: true },
                    { text: locale === 'zh' ? '采购所需材料和工具' : 'Procure required parts and tools', done: false },
                    { text: locale === 'zh' ? '安排维修时间' : 'Schedule repair time', done: false }
                ]
            },
            { phase: 'Do', icon: 'construction', color: 'bg-emerald-500', items: sol.steps?.map((s: any) => ({ text: `${s.action}: ${s.detail}`, done: false })) || [] },
            {
                phase: 'Check', icon: 'fact_check', color: 'bg-amber-500', items: [
                    { text: locale === 'zh' ? '修复后观察30分钟确认无异常' : 'Observe 30min after repair to confirm no issues', done: false },
                    { text: locale === 'zh' ? '拍照记录修复结果' : 'Photo-document the repair result', done: false }
                ]
            },
            { phase: 'Act', icon: 'trending_up', color: 'bg-violet-500', items: (sol.prevention_tips || []).map((tip: string) => ({ text: tip, done: false })) }
        ];
        advanceStep(7, { pdcaTasks: tasks });
    };

    /* ═══ RENDER ═══ */
    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
            {/* Progress Header */}
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
                {/* Step indicators */}
                <div className="flex gap-1">
                    {labels.map((label, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`h-1.5 w-full rounded-full transition-all ${i + 1 <= state.step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <span className={`text-[9px] font-medium ${i + 1 === state.step ? 'text-primary font-bold' : 'text-gray-400'}`}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Draft resume banner */}
            {hasDraft && state.step > 1 && (
                <div className="mx-4 mt-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 flex-1 font-medium">
                        {locale === 'zh' ? '已恢复上次请求草稿' : 'Draft restored from last session'}
                    </span>
                    <button onClick={() => { localStorage.removeItem(DRAFT_KEY); setState(DEFAULT_STATE); }} className="text-[10px] text-indigo-500 font-bold underline">
                        {locale === 'zh' ? '丢弃' : 'Discard'}
                    </button>
                </div>
            )}

            {/* Error banner with Retry */}
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

            {/* B: Step Content with directional slide animation */}
            <div className="flex-1 overflow-y-auto">
                <div
                    key={animKey}
                    className={directionRef.current === 'fwd' ? 'step-slide-fwd' : 'step-slide-back'}
                >
                    {state.step === 1 && <StepInput videoRef={videoRef} canvasRef={canvasRef} fileRef={fileRef} cameraReady={cameraReady} cameraError={cameraError} imageUrl={state.imageUrl} onCapture={capturePhoto} onFileImport={handleFileImport} onUpload={() => fileRef.current?.click()} locale={locale} />}
                    {state.step === 2 && <StepMECE result={state.meceResult} loading={loading} onSelect={selectCategory} locale={locale} imageUrl={state.imageUrl} />}
                    {state.step === 3 && <StepHypothesis result={state.hypotheses} loading={loading} onSelect={selectHypothesis} locale={locale} />}
                    {state.step === 4 && <StepChecklist checklist={state.checklist} loading={loading} onSubmit={submitChecklist} locale={locale} />}
                    {state.step === 5 && <StepFiveWhy history={state.fiveWhyHistory} result={state.fiveWhyResult} loading={loading} onAnswer={sendFiveWhyAnswer} locale={locale} />}
                    {state.step === 6 && <StepSolution solution={state.solution} loading={loading} locale={locale} navigate={navigate} onNext={() => { generatePDCA(); }} />}
                    {state.step === 7 && <StepPDCA tasks={state.pdcaTasks} locale={locale} onNext={() => advanceStep(8)} />}
                    {state.step === 8 && <StepFollowUp locale={locale} followUpDate={state.followUpDate} archived={state.archived} onDateChange={(d: string) => update({ followUpDate: d })} onArchive={() => { update({ archived: true }); }} onHome={clearDraftAndFinish} />}
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileImport} className="hidden" />
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   STEP 1: INPUT — Camera / File Upload
   ═══════════════════════════════════════════════════════════════ */
const StepInput: React.FC<any> = ({ videoRef, cameraReady, cameraError, imageUrl, onCapture, onUpload, locale }) => (
    <div className="flex flex-col h-full">
        <div className="flex-1 relative bg-black">
            {imageUrl ? (
                <img src={imageUrl} alt="Captured" className="w-full h-full object-contain" />
            ) : cameraError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
                    <span className="material-symbols-outlined text-5xl text-gray-400">no_photography</span>
                    <p className="text-gray-400 text-center">{cameraError}</p>
                    <button onClick={onUpload} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold">
                        {locale === 'zh' ? '上传照片' : 'Upload Photo'}
                    </button>
                </div>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
        </div>
        {!imageUrl && (
            <div className="px-6 py-4 flex items-center justify-center gap-6 bg-white dark:bg-surface-dark">
                <button onClick={onUpload} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">photo_library</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{locale === 'zh' ? '相册' : 'Gallery'}</span>
                </button>
                <button onClick={onCapture} disabled={!cameraReady} className="w-20 h-20 rounded-full border-4 border-primary bg-white dark:bg-gray-800 flex items-center justify-center shadow-xl active:scale-90 transition-transform disabled:opacity-40">
                    <div className="w-16 h-16 rounded-full bg-primary" />
                </button>
                <button className="flex flex-col items-center gap-1 opacity-50">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">mic</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{locale === 'zh' ? '语音' : 'Voice'}</span>
                </button>
            </div>
        )}
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   STEP 2: MECE ANALYSIS — Category Cards
   ═══════════════════════════════════════════════════════════════ */
const StepMECE: React.FC<any> = ({ result, loading, onSelect, locale, imageUrl }) => (
    <div className="p-4 space-y-4">
        {imageUrl && (
            <div className="w-full h-32 rounded-2xl overflow-hidden">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
        )}
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '🔍 MECE 分类分析' : '🔍 MECE Category Analysis'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{result?.summary || (loading ? (locale === 'zh' ? 'AI 正在分析...' : 'AI analyzing...') : '')}</p>
        </div>
        {loading ? <SkeletonCard rows={3} /> : null}
        {result?.categories && (
            <div className="space-y-3">
                {result.categories.map((cat: any) => (
                    <button key={cat.id} onClick={() => onSelect(cat.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl">{cat.icon || 'category'}</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-bold text-text-main-light dark:text-text-main-dark">{cat.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-bold ${cat.confidence > 0.5 ? 'text-primary' : 'text-gray-400'}`}>
                                {Math.round(cat.confidence * 100)}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${cat.confidence * 100}%` }} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        )}
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   STEP 3: HYPOTHESIS — Root Cause Selection
   ═══════════════════════════════════════════════════════════════ */
const StepHypothesis: React.FC<any> = ({ result, loading, onSelect, locale }) => (
    <div className="p-4 space-y-4">
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '🧪 根因假设' : '🧪 Root Cause Hypotheses'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '选择最可能的原因进行深入分析' : 'Select the most likely cause for deeper analysis'}</p>
        </div>
        {loading ? <SkeletonCard rows={3} /> : null}
        {result?.hypotheses && (
            <div className="space-y-3">
                {result.hypotheses.map((h: any, i: number) => (
                    <button key={h.id} onClick={() => onSelect(h.title)} className="w-full text-left p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-amber-500' : 'bg-gray-400'}`}>
                                {Math.round(h.probability * 100)}%
                            </div>
                            <p className="font-bold text-text-main-light dark:text-text-main-dark flex-1">{h.title}</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{h.reasoning}</p>
                        {h.evidence_needed && (
                            <div className="flex flex-wrap gap-1">
                                {h.evidence_needed.map((e: string, j: number) => (
                                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{e}</span>
                                ))}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        )}
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   STEP 4: CHECKLIST — Data Collection
   ═══════════════════════════════════════════════════════════════ */
const StepChecklist: React.FC<any> = ({ checklist, loading, onSubmit, locale }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});

    const setAnswer = (id: string, val: any) => setAnswers(prev => ({ ...prev, [id]: val }));
    const allAnswered = checklist?.checklist?.every((item: any) => answers[item.id] !== undefined) ?? false;

    return (
        <div className="p-4 space-y-4">
            <div className="text-center">
                <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? '📋 数据收集' : '📋 Data Collection'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '请逐项确认以下观察项目' : 'Please verify each observation below'}</p>
            </div>
            {loading && <LoadingDots />}
            {checklist?.checklist && (
                <div className="space-y-3">
                    {checklist.checklist.map((item: any) => (
                        <div key={item.id} className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                                <span className="material-symbols-outlined text-primary text-xl mt-0.5">{item.icon || 'check_circle'}</span>
                                <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{item.question}</p>
                            </div>
                            {item.type === 'boolean' ? (
                                <div className="flex gap-2 ml-9">
                                    <button onClick={() => setAnswer(item.id, true)} className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${answers[item.id] === true ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                        {locale === 'zh' ? '是' : 'Yes'}
                                    </button>
                                    <button onClick={() => setAnswer(item.id, false)} className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${answers[item.id] === false ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                        {locale === 'zh' ? '否' : 'No'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2 ml-9">
                                    {item.options?.map((opt: string, i: number) => (
                                        <button key={i} onClick={() => setAnswer(item.id, opt)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${answers[item.id] === opt ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {allAnswered && (
                <button onClick={() => onSubmit(answers)} className="w-full h-12 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all">
                    {locale === 'zh' ? '开始 5-Why 分析 →' : 'Start 5-Why Analysis →'}
                </button>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   STEP 5: 5-WHY DIALOG — Core AI Interaction
   ═══════════════════════════════════════════════════════════════ */
const StepFiveWhy: React.FC<any> = ({ history, result, loading, onAnswer, locale }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [history, loading]);

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
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onAnswer(input); setInput(''); } }} disabled={loading} placeholder={locale === 'zh' ? '输入您的回答...' : 'Type your answer...'} className="flex-1 h-11 px-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50" />
                <button onClick={() => { if (input.trim()) { onAnswer(input); setInput(''); } }} disabled={!input.trim() || loading} className="w-11 h-11 bg-primary disabled:bg-gray-300 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   STEP 6: SOLUTION — Comprehensive Repair Plan
   ═══════════════════════════════════════════════════════════════ */
const StepSolution: React.FC<any> = ({ solution, loading, locale, navigate, onNext }) => (
    <div className="p-4 space-y-4 pb-24">
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '✅ 完整解决方案' : '✅ Complete Solution'}
            </h2>
        </div>
        {loading && <LoadingDots />}
        {solution && (
            <>
                {/* Issue header */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <div>
                        <p className="font-bold text-lg text-text-main-light dark:text-text-main-dark">{solution.issue_name}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${solution.severity === 'critical' ? 'bg-red-100 text-red-700' : solution.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{solution.severity}</span>
                    </div>
                </div>

                {/* Root cause */}
                <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 mb-1">{locale === 'zh' ? '根本原因' : 'Root Cause'}</p>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">{solution.root_cause}</p>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 px-1">{locale === 'zh' ? '修复步骤' : 'Repair Steps'}</p>
                    {solution.steps?.map((s: any) => (
                        <div key={s.step} className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">{s.step}</div>
                            <div>
                                <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{s.action}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cost / Time / Difficulty */}
                <div className="grid grid-cols-3 gap-2">
                    {solution.estimated_cost && <InfoChip label={locale === 'zh' ? '费用' : 'Cost'} value={solution.estimated_cost} />}
                    {solution.estimated_time && <InfoChip label={locale === 'zh' ? '时间' : 'Time'} value={solution.estimated_time} />}
                    {solution.diy_difficulty && <InfoChip label={locale === 'zh' ? '难度' : 'Level'} value={solution.diy_difficulty} color={solution.diy_difficulty === 'easy' ? 'text-green-600' : solution.diy_difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'} />}
                </div>

                {/* Tools + Parts */}
                <div className="grid grid-cols-2 gap-3">
                    {solution.tools_needed?.length > 0 && (
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-2">🛠️ {locale === 'zh' ? '工具' : 'Tools'}</p>
                            <div className="flex flex-wrap gap-1">{solution.tools_needed.map((t: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{t}</span>)}</div>
                        </div>
                    )}
                    {solution.required_parts?.length > 0 && (
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-2">📦 {locale === 'zh' ? '材料' : 'Parts'}</p>
                            {solution.required_parts.map((p: any, i: number) => <p key={i} className="text-[10px] text-gray-600 dark:text-gray-300">{p.name} <span className="text-gray-400">{p.estimated_price}</span></p>)}
                        </div>
                    )}
                </div>

                {/* Safety + Prevention */}
                {solution.safety_warnings?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">⚠️ {locale === 'zh' ? '安全警告' : 'Safety'}</p>
                        {solution.safety_warnings.map((w: string, i: number) => <p key={i} className="text-xs text-red-600 dark:text-red-400">• {w}</p>)}
                    </div>
                )}
                {solution.prevention_tips?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">💡 {locale === 'zh' ? '预防建议' : 'Prevention'}</p>
                        {solution.prevention_tips.map((tip: string, i: number) => <p key={i} className="text-xs text-blue-600 dark:text-blue-400">• {tip}</p>)}
                    </div>
                )}

                {/* CTAs */}
                <div className="flex gap-2 pt-2">
                    {!solution.can_diy && (
                        <button onClick={() => navigate('/workers')} className="flex-1 h-12 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined">engineering</span>
                            {locale === 'zh' ? '找专业师傅' : 'Find a Pro'}
                        </button>
                    )}
                    <button onClick={onNext} className="flex-1 h-12 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                        <span className="material-symbols-outlined">assignment</span>
                        {locale === 'zh' ? 'PDCA 任务分配 →' : 'PDCA Tasks →'}
                    </button>
                </div>
            </>
        )}
    </div>
);


/* ═══════════════════════════════════════════════════════════════
   STEP 7: PDCA — Task Assignment
   ═══════════════════════════════════════════════════════════════ */
const StepPDCA: React.FC<any> = ({ tasks, locale, onNext }) => {
    const [toggles, setToggles] = useState<Record<string, boolean>>({});
    const toggle = (phase: string, idx: number) => setToggles(prev => ({ ...prev, [`${phase}-${idx}`]: !prev[`${phase}-${idx}`] }));

    return (
        <div className="p-4 space-y-4 pb-24">
            <div className="text-center">
                <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    {locale === 'zh' ? '📋 PDCA 任务分配' : '📋 PDCA Task Assignment'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '按照 Plan→Do→Check→Act 执行' : 'Execute in Plan→Do→Check→Act order'}</p>
            </div>
            {tasks.map((phase: any) => (
                <div key={phase.phase} className="rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className={`w-8 h-8 rounded-lg ${phase.color} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{phase.icon}</span>
                        </div>
                        <span className="font-bold text-sm text-text-main-light dark:text-text-main-dark">{phase.phase}</span>
                        <span className="text-xs text-gray-400 ml-auto">{phase.items.filter((_: any, i: number) => toggles[`${phase.phase}-${i}`] || _.done).length}/{phase.items.length}</span>
                    </div>
                    <div className="px-4 py-2 space-y-1">
                        {phase.items.map((item: any, i: number) => {
                            const checked = toggles[`${phase.phase}-${i}`] || item.done;
                            return (
                                <button key={i} onClick={() => toggle(phase.phase, i)} className="flex items-center gap-3 py-2 w-full text-left">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {checked && <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                                    </div>
                                    <span className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-text-main-light dark:text-text-main-dark'}`}>{item.text}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <button onClick={onNext} className="w-full h-12 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all">
                {locale === 'zh' ? '设置回访验收 →' : 'Schedule Follow-up →'}
            </button>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   STEP 8: FOLLOW-UP — Scheduling & Archive
   ═══════════════════════════════════════════════════════════════ */
const StepFollowUp: React.FC<any> = ({ locale, followUpDate, archived, onDateChange, onArchive, onHome }) => (
    <div className="p-4 space-y-4">
        <div className="text-center">
            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                {locale === 'zh' ? '🎯 回访验收' : '🎯 Follow-up & Archive'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '安排回访确认修复效果' : 'Schedule follow-up to verify repair'}</p>
        </div>

        {/* Follow-up date */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'zh' ? '回访日期' : 'Follow-up Date'}</p>
            <div className="flex gap-2">
                {[1, 3, 7, 14].map(days => {
                    const label = days === 1 ? (locale === 'zh' ? '明天' : '1 day') : days === 7 ? (locale === 'zh' ? '一周后' : '1 week') : days === 14 ? (locale === 'zh' ? '两周后' : '2 weeks') : (locale === 'zh' ? `${days}天后` : `${days} days`);
                    return (
                        <button key={days} onClick={() => onDateChange(`${days}d`)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${followUpDate === `${days}d` ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Archive */}
        <div className={`p-4 rounded-2xl border transition-all ${archived ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-700'}`}>
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1", color: archived ? '#10b981' : '#9ca3af' }}>
                    {archived ? 'check_circle' : 'archive'}
                </span>
                <div className="flex-1">
                    <p className="font-bold text-sm text-text-main-light dark:text-text-main-dark">
                        {archived ? (locale === 'zh' ? '✅ 已归档到案例库' : '✅ Archived to Case Library') : (locale === 'zh' ? '归档到案例库' : 'Archive to Case Library')}
                    </p>
                    <p className="text-xs text-gray-500">{locale === 'zh' ? '方便将来参考类似问题' : 'For future reference on similar issues'}</p>
                </div>
                {!archived && (
                    <button onClick={onArchive} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all">
                        {locale === 'zh' ? '归档' : 'Archive'}
                    </button>
                )}
            </div>
        </div>

        {/* Complete */}
        <div className="pt-4 space-y-2">
            <button onClick={onHome} className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                {locale === 'zh' ? '完成！返回首页' : 'Complete! Back Home'}
            </button>
        </div>
    </div>
);

/* ─── Skeleton Loaders ─── */
const SkeletonCard = ({ rows = 3 }: { rows?: number }) => (
    <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg" style={{ width: `${70 + i * 8}%` }} />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-full" />
                    </div>
                    <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                </div>
            </div>
        ))}
    </div>
);

/* ─── Shared Components ─── */
const LoadingDots = () => (
    <div className="flex justify-center gap-1.5 py-6">
        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
);

const InfoChip: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <div className="text-center p-2 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className={`text-sm font-bold ${color || 'text-text-main-light dark:text-text-main-dark'}`}>{value}</p>
    </div>
);

export default DiagnosisWizard;
