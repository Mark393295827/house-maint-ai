import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createReport } from '../services/api';
import DiagnosisSummary from '../components/repair/DiagnosisSummary';
import { useRepairTimer } from '../hooks/useRepairTimer';

// New sub-components
import RepairHeader from '../components/repair/RepairHeader';
import SafetyWarning from '../components/repair/SafetyWarning';
import ToolsList from '../components/repair/ToolsList';
import RepairStepCard from '../components/repair/RepairStepCard';
import RepairFooter from '../components/repair/RepairFooter';
import CompletionScreen from '../components/repair/CompletionScreen';

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
    duration?: number;
}

/* ─── Component ─── */
const RepairGuidePage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { timers, toggleTimer, formatTime } = useRepairTimer();

    // AI diagnosis data from sessionStorage
    const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // Step tracking
    const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
    const [executionMode, setExecutionMode] = useState(false);
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [reportCreated, setReportCreated] = useState(false);

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
            } as RepairStep;
        })
        : [
            { title: t('repair.steps.valve.title'), description: t('repair.steps.valve.desc'), image: IMAGES.STEP_VALVE },
            { title: t('repair.steps.handle.title'), description: t('repair.steps.handle.desc'), image: IMAGES.STEP_WRENCH },
            { title: t('repair.steps.cure.title'), description: t('repair.steps.cure.desc'), isTimer: true, duration: 900 },
            { title: t('repair.steps.reassemble.title'), description: t('repair.steps.reassemble.desc'), image: IMAGES.STEP_REASSEMBLE },
        ] as RepairStep[];

    // Init step tracking
    useEffect(() => {
        if (steps.length > 0 && completedSteps.length !== steps.length) {
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
            <RepairHeader
                title={title}
                completedCount={completedCount}
                totalSteps={steps.length}
                progress={progress}
                severity={diagnosis?.severity}
                confidence={diagnosis?.confidence}
                executionMode={executionMode}
                t={t}
            />

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-4 pt-2 space-y-4">
                {/* Diagnosis Summary Card (if AI data) */}
                {diagnosis && (
                    <DiagnosisSummary
                        description={diagnosis.description}
                        titleEn={titleEn}
                        title={title}
                        capturedImage={capturedImage}
                    />
                )}

                {/* Safety Warning */}
                {diagnosis?.safety_warning && (
                    <SafetyWarning
                        warning={diagnosis.safety_warning}
                        t={t}
                    />
                )}

                {/* Tools & Parts */}
                <ToolsList
                    tools={tools}
                    parts={parts}
                    t={t}
                />

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
                    <RepairStepCard
                        key={index}
                        step={step}
                        index={index}
                        isCompleted={completedSteps[index] || false}
                        onToggle={() => toggleStep(index)}
                        timerState={timers[index]}
                        onTimerToggle={(duration) => toggleTimer(index, duration)}
                        t={t}
                        formatTime={formatTime}
                    />
                ))}

                {/* Completion Summary */}
                {allDone && (
                    <CompletionScreen
                        isHardDIY={isHardDIY}
                        onFindWorker={handleFindWorker}
                        t={t}
                    />
                )}

                <div className="h-8"></div>
            </main>

            {/* Sticky Footer */}
            {!allDone && (
                <RepairFooter
                    reportCreated={reportCreated}
                    isCreatingReport={isCreatingReport}
                    executionMode={executionMode}
                    onStartRepair={handleStartRepair}
                    onAddToPlan={handleAddToPlan}
                    t={t}
                />
            )}
        </div>
    );
};

export default RepairGuidePage;
