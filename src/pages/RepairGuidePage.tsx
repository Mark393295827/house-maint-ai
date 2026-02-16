import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createReport } from '../services/api';

/* ─── Types ─── */
interface DiagnosisResult {
    raw_response: any;
    detected: boolean;
    issue_name: string;
    issue_name_en: string;
    confidence: number;
    severity: string;
    description: string;
    description_en: string;
    possible_causes: string[];
    recommended_actions: any[];
    diy_difficulty: string;
    estimated_cost: string;
    urgency: string;
    steps: string[];
    safety_warning: string | null;
}

interface RepairStep {
    title: string;
    description: string;
    image?: string;
    isTimer?: boolean;
}

/* ─── Component ─── */
const RepairGuidePage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user } = useAuth();

    // AI diagnosis data from sessionStorage
    const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // Step tracking
    const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
    const [executionMode, setExecutionMode] = useState(false);
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [reportCreated, setReportCreated] = useState(false);

    // Timer states: { [stepIndex]: { key: number, timeLeft: number, isActive: boolean, duration: number } }
    const [timers, setTimers] = useState<Record<number, { timeLeft: number; isActive: boolean; duration: number }>>({});

    // Load diagnosis and progress from storage
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('diagnosisResult');
            if (stored) {
                const parsed: DiagnosisResult = JSON.parse(stored);
                setDiagnosis(parsed);

                // Load persisted progress
                const savedProgress = localStorage.getItem(`repair_progress_${parsed.issue_name}`);
                if (savedProgress) {
                    setCompletedSteps(JSON.parse(savedProgress));
                }
            }
            const img = sessionStorage.getItem('capturedImage');
            if (img) setCapturedImage(img);
        } catch (e) {
            console.warn('Failed to load diagnosis:', e);
        }
    }, []);

    // Persist progress
    useEffect(() => {
        if (diagnosis && completedSteps.length > 0) {
            localStorage.setItem(`repair_progress_${diagnosis.issue_name}`, JSON.stringify(completedSteps));
        }
    }, [completedSteps, diagnosis]);

    // Timer tick logic
    useEffect(() => {
        const interval = setInterval(() => {
            setTimers(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(key => {
                    const idx = Number(key);
                    if (next[idx].isActive && next[idx].timeLeft > 0) {
                        next[idx] = { ...next[idx], timeLeft: next[idx].timeLeft - 1 };
                        changed = true;

                        // play sound on finish
                        if (next[idx].timeLeft === 0) {
                            next[idx].isActive = false;
                            new Audio('/sounds/timer-done.mp3').play().catch(() => { }); // Fallback if missing
                            // Auto-complete step? Optional
                        }
                    }
                });
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const toggleTimer = (index: number, duration: number) => {
        setTimers(prev => {
            const current = prev[index] || { timeLeft: duration, isActive: false, duration };
            // If finished, reset
            if (current.timeLeft === 0) {
                return { ...prev, [index]: { ...current, timeLeft: duration, isActive: true } };
            }
            return {
                ...prev,
                [index]: { ...current, isActive: !current.isActive, duration }
            };
        });
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return {
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0')
        };
    };

    // Helper to detect timer in text
    const extractTimerInfo = (text: string) => {
        const timeRegex = /(\d+)\s*(minute|min|second|sec|hour|hr)/i;
        const match = text.match(timeRegex);
        if (match) {
            const val = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            let seconds = 0;
            if (unit.startsWith('min')) seconds = val * 60;
            else if (unit.startsWith('sec')) seconds = val;
            else if (unit.startsWith('hour') || unit.startsWith('hr')) seconds = val * 3600;

            return { isTimer: true, duration: seconds };
        }
        // Check for keywords like "wait" or "dry" but default to 15m if no number
        if (/wait|dry|cure|harden/i.test(text)) {
            return { isTimer: true, duration: 900 }; // 15 min default
        }
        return { isTimer: false, duration: 0 };
    };

    // Build steps array — AI-generated with smart detection
    const steps = diagnosis && diagnosis.steps.length > 0
        ? diagnosis.steps.map((step, i) => {
            const { isTimer, duration } = extractTimerInfo(step);
            return {
                title: `${t('repair.step', { step: i + 1 })}`,
                description: step,
                isTimer,
                duration
            } as RepairStep & { duration?: number };
        })
        : [
            { title: t('repair.steps.valve.title'), description: t('repair.steps.valve.desc'), image: IMAGES.STEP_VALVE },
            { title: t('repair.steps.handle.title'), description: t('repair.steps.handle.desc'), image: IMAGES.STEP_WRENCH },
            { title: t('repair.steps.cure.title'), description: t('repair.steps.cure.desc'), isTimer: true, duration: 900 },
            { title: t('repair.steps.reassemble.title'), description: t('repair.steps.reassemble.desc'), image: IMAGES.STEP_REASSEMBLE },
        ] as (RepairStep & { duration?: number })[];

    // Init step tracking
    useEffect(() => {
        if (steps.length > 0 && completedSteps.length !== steps.length) {
            // Restore from local storage happened in init effect, but if length mismatches (re-diagnosis), reset
            // We should merge logic? For now, just init if empty
            if (completedSteps.length === 0) {
                setCompletedSteps(new Array(steps.length).fill(false));
            }
        }
    }, [steps.length]);

    const toggleStep = (index: number) => {
        const next = [...completedSteps];
        next[index] = !next[index];
        setCompletedSteps(next);
    };

    const completedCount = completedSteps.filter(Boolean).length;
    const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
    const allDone = steps.length > 0 && completedCount === steps.length;

    // Derived info
    const title = diagnosis ? diagnosis.issue_name : t('repair.title');
    const titleEn = diagnosis ? diagnosis.issue_name_en : '';
    const severityColor = diagnosis
        ? diagnosis.severity === 'critical' ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
            : diagnosis.severity === 'high' ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : diagnosis.severity === 'medium' ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-green-500 bg-green-50 dark:bg-green-900/20'
        : '';
    const isHardDIY = diagnosis?.diy_difficulty === 'hard';
    const tools = diagnosis?.raw_response?.solution?.tools_needed || [];
    const parts = diagnosis?.raw_response?.solution?.required_parts || [];

    /* ─── Start Repair: create report + enter execution mode ─── */
    const handleStartRepair = async () => {
        setExecutionMode(true);

        if (!reportCreated && diagnosis && user) {
            setIsCreatingReport(true);
            try {
                const category = diagnosis.raw_response?.diagnosis?.category || 'other';
                const categoryMap: Record<string, string> = {
                    plumbing: 'plumbing', electrical: 'electrical', appliance: 'appliance',
                    carpentry: 'carpentry', painting: 'painting',
                };
                await createReport({
                    title: diagnosis.issue_name.substring(0, 50),
                    description: `${diagnosis.description}\n\nAI Confidence: ${diagnosis.confidence}%\nSeverity: ${diagnosis.severity}\nUrgency: ${diagnosis.urgency}`,
                    category: categoryMap[category.toLowerCase()] || 'other',
                });
                setReportCreated(true);
                // Can add toast here
            } catch (err) {
                console.warn('Report creation failed (non-blocking):', err);
            } finally {
                setIsCreatingReport(false);
            }
        }
    };

    /* ─── Add to Plan ─── */
    const handleAddToPlan = () => {
        if (diagnosis) {
            sessionStorage.setItem('planTask', JSON.stringify({
                title: diagnosis.issue_name,
                description: diagnosis.description,
                urgency: diagnosis.urgency,
            }));
        }
        navigate('/calendar');
    };

    /* ─── Find Worker ─── */
    const handleFindWorker = () => {
        if (diagnosis) {
            sessionStorage.setItem('diagnosisForMatch', JSON.stringify({
                category: diagnosis.raw_response?.diagnosis?.category || 'other',
                description: diagnosis.description,
                urgency: diagnosis.urgency,
            }));
        }
        navigate('/match');
    };

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl">
            {/* Header */}
            <header className="flex-none bg-background-light dark:bg-background-dark pt-safe-top z-20">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link to="/" className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-main-light dark:text-white">
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </Link>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center text-text-main-light dark:text-white truncate px-2">
                        {title}
                    </h2>
                    <button className="flex items-center justify-center h-10 px-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="text-primary text-sm font-bold tracking-[0.015em]">{t('repair.help')}</span>
                    </button>
                </div>

                {/* AI Badge + Progress */}
                <div className="px-6 pb-4">
                    {diagnosis && (
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${severityColor}`}>
                                {diagnosis.severity.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
                                AI {diagnosis.confidence}%
                            </span>
                            {executionMode && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 animate-pulse">
                                    {t('repair.executing', { defaultValue: '🔧 Executing' })}
                                </span>
                            )}
                        </div>
                    )}
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-sm font-semibold text-text-main-light dark:text-text-main-dark">
                            {t('repair.progress', { completed: completedCount, total: steps.length })}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-4 pt-2 space-y-4">
                {/* Diagnosis Summary Card (if AI data) */}
                {diagnosis && (
                    <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                            {capturedImage && (
                                <div className="shrink-0 w-16 h-16 rounded-lg bg-cover bg-center shadow-inner overflow-hidden"
                                    style={{ backgroundImage: `url("${capturedImage}")` }} />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="material-symbols-outlined text-indigo-500 text-sm">auto_awesome</span>
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                        {t('repair.aiGenerated', { defaultValue: 'AI Generated' })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{diagnosis.description}</p>
                                {titleEn && titleEn !== title && (
                                    <p className="text-xs text-gray-400 mt-0.5">{titleEn}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Safety Warning */}
                {diagnosis?.safety_warning && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800 flex items-start gap-2">
                        <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
                        <div>
                            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                                {t('repair.safetyWarning', { defaultValue: 'Safety Warning' })}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">{diagnosis.safety_warning}</p>
                        </div>
                    </div>
                )}

                {/* Tools & Parts */}
                {(tools.length > 0 || parts.length > 0) && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                        {tools.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    🛠️ {t('repair.tools', { defaultValue: 'Tools Needed' })}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {tools.map((tool: string, i: number) => (
                                        <span key={i} className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {parts.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    📦 {t('repair.parts', { defaultValue: 'Parts Required' })}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {parts.map((part: any, i: number) => (
                                        <span key={i} className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                            {part.name || part}{part.estimated_price ? ` ~${part.estimated_price}` : ''}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Find Professional CTA (for hard DIY) */}
                {isHardDIY && (
                    <button
                        onClick={handleFindWorker}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-4 flex items-center gap-3 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
                    >
                        <span className="material-symbols-outlined text-3xl">engineering</span>
                        <div className="text-left flex-1">
                            <p className="font-bold">{t('repair.findWorker', { defaultValue: 'Find a Professional' })}</p>
                            <p className="text-xs text-white/80">
                                {t('repair.findWorkerDesc', { defaultValue: 'This repair is complex — we recommend expert help' })}
                            </p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                )}

                {/* Repair Steps */}
                {steps.map((step, index) => (
                    <div key={index} className={`bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${completedSteps[index]
                        ? 'border-primary/30 bg-primary/5 dark:bg-primary/5'
                        : 'border-transparent dark:border-gray-800'
                        }`}>
                        <div className="flex gap-4">
                            {/* Image / Step Icon */}
                            <div className="shrink-0">
                                {step.isTimer ? (
                                    <div className="bg-primary/10 dark:bg-primary/20 rounded-lg h-20 w-20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-4xl">hourglass_top</span>
                                    </div>
                                ) : step.image ? (
                                    <div
                                        className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20 w-20 bg-cover bg-center shadow-inner"
                                        style={{ backgroundImage: `url("${step.image}")` }}
                                    ></div>
                                ) : (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg h-20 w-20 flex items-center justify-center">
                                        <span className="text-3xl font-black text-indigo-400">{index + 1}</span>
                                    </div>
                                )}
                            </div>
                            {/* Text Content */}
                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${completedSteps[index]
                                        ? 'bg-primary/10 text-primary'
                                        : step.isTimer
                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}>
                                        {t('repair.step', { step: index + 1 })}
                                        {step.isTimer ? ` • ${t('repair.wait')}` : ''}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-text-main-light dark:text-white leading-tight mb-1">{step.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-snug">{step.description}</p>
                            </div>
                            {/* Checkbox */}
                            <div className="shrink-0 flex items-center justify-center">
                                <button
                                    onClick={() => toggleStep(index)}
                                    className={`size-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${completedSteps[index]
                                        ? 'bg-primary border-primary'
                                        : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    {completedSteps[index] && (
                                        <span className="material-symbols-outlined text-white text-[18px]">check</span>
                                    )}
                                </button>
                            </div>
                        </div>
                        {/* Timer Widget for timer steps */}
                        {(step.isTimer && step.duration) && ((() => {
                            const timerState = timers[index] || { timeLeft: step.duration, isActive: false };
                            const { m, s } = formatTime(timerState.timeLeft);
                            const isFinished = timerState.timeLeft === 0;

                            return (
                                <div className="mt-4">
                                    <div className={`rounded-lg p-4 flex items-center justify-between border transition-colors ${isFinished ? 'bg-green-100 dark:bg-green-900/30 border-green-200'
                                        : timerState.isActive ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                                            : 'bg-green-50 dark:bg-green-900/20 border-primary/20'
                                        }`}>
                                        <div className="flex gap-2 text-center">
                                            <div className="flex flex-col">
                                                <span className={`text-2xl font-black tracking-tight ${isFinished ? 'text-green-600' : 'text-primary'}`}>{m}</span>
                                                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t('repair.timer.min')}</span>
                                            </div>
                                            <span className={`text-2xl font-black -mt-1 ${isFinished ? 'text-green-600/50' : 'text-primary/50'}`}>:</span>
                                            <div className="flex flex-col">
                                                <span className={`text-2xl font-black tracking-tight ${isFinished ? 'text-green-600' : 'text-primary'}`}>{s}</span>
                                                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t('repair.timer.sec')}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleTimer(index, step.duration!)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 ${isFinished ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'
                                                : timerState.isActive ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30'
                                                    : 'bg-primary text-white hover:bg-primary-dark shadow-primary/30'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {isFinished ? 'replay' : timerState.isActive ? 'pause' : 'play_arrow'}
                                            </span>
                                            {isFinished ? t('repair.timer.restart', { defaultValue: 'Restart' })
                                                : timerState.isActive ? t('repair.timer.pause', { defaultValue: 'Pause' })
                                                    : t('repair.timer.start')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })())}
                    </div>
                ))}

                {/* Completion Summary */}
                {
                    allDone && (
                        <div className="relative page-enter">
                            {/* Confetti particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none -top-8">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="confetti-piece"
                                        style={{
                                            left: `${10 + Math.random() * 80}%`,
                                            backgroundColor: ['#2bb673', '#007AFF', '#FF9500', '#FF3B30', '#34C759', '#AF52DE'][i % 6],
                                            animationDelay: `${i * 0.15}s`,
                                            animationDuration: `${2 + Math.random() * 1.5}s`,
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 text-center border border-green-200 dark:border-green-800">
                                <div className="text-5xl mb-3">🎉</div>
                                <h3 className="text-lg font-bold text-green-700 dark:text-green-400">
                                    {t('repair.completionTitle', { defaultValue: 'Repair Complete!' })}
                                </h3>
                                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                                    {t('repair.completionDesc', { defaultValue: 'All steps have been completed successfully.' })}
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Link
                                        to="/"
                                        className="flex-1 h-10 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-lg">home</span>
                                        <span>{t('nav.home', { defaultValue: 'Home' })}</span>
                                    </Link>
                                    {!isHardDIY && (
                                        <button
                                            onClick={handleFindWorker}
                                            className="flex-1 h-10 border-2 border-green-600 text-green-700 dark:text-green-400 font-bold rounded-xl flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-lg">engineering</span>
                                            <span>{t('repair.findWorker', { defaultValue: 'Find Pro' })}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                <div className="h-8"></div>
            </main >

            {/* Sticky Footer */}
            {
                !allDone && (
                    <footer className="absolute bottom-0 left-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 pb-8 z-30">
                        <div className="flex flex-col gap-3">
                            {/* Report Success Toast */}
                            {reportCreated && isCreatingReport === false && (
                                <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-bottom-2">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Report created successfully! You can track it in Orders.
                                </div>
                            )}
                            <button
                                onClick={handleStartRepair}
                                disabled={isCreatingReport}
                                className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:bg-primary-dark transition-transform active:scale-[0.98] disabled:opacity-60"
                            >
                                {isCreatingReport ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>{t('repair.creatingReport', { defaultValue: 'Creating Report...' })}</span>
                                    </>
                                ) : executionMode ? (
                                    <>
                                        <span className="material-symbols-outlined">check_circle</span>
                                        <span>{t('repair.inProgress', { defaultValue: 'In Progress — Check Steps' })}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">build</span>
                                        <span>{t('repair.action.start')}</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleAddToPlan}
                                className="w-full h-12 bg-transparent border-2 border-primary/30 text-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                            >
                                <span className="material-symbols-outlined">calendar_today</span>
                                {t('repair.action.plan')}
                            </button>
                        </div>
                    </footer>
                )
            }
        </div >
    );
};

export default RepairGuidePage;
