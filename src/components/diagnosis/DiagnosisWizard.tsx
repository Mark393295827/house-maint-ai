import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCreateReport } from '../../hooks/useReports';
import { useToast } from '../../contexts/ToastContext';
import Analytics from '../../services/analytics';
import { solveProblem, type ProblemSolvingLoop } from '../../services/ai';

// Phase Components
import InquiryChat from './InquiryChat';
import DemandSummary, { type DemandData } from './DemandSummary';

/* ─── Types ─── */
type Phase = 'inquiry' | 'summary';

const DiagnosisWizard: React.FC = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [phase, setPhase] = useState<Phase>('inquiry');
    const [demandData, setDemandData] = useState<DemandData | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [problemSolvingPlan, setProblemSolvingPlan] = useState<ProblemSolvingLoop | null>(null);
    const [problemSolvingLoading, setProblemSolvingLoading] = useState(false);
    const [problemSolvingError, setProblemSolvingError] = useState<string | null>(null);
    const dispatchStartedRef = useRef(false);

    /* ─── Phase 1 → 2 ─── */
    const handleInquiryComplete = useCallback((summary: DemandData, imgB64?: string | null, imgUrl?: string | null) => {
        setDemandData(summary);
        setImageUrl(imgUrl || null);
        setProblemSolvingPlan(null);
        setProblemSolvingError(null);
        setPhase('summary');
        setProblemSolvingLoading(true);

        solveProblem(summary, imgB64, imgB64 ? 'image/jpeg' : undefined, locale)
            .then((plan) => {
                setProblemSolvingPlan(plan);
                sessionStorage.setItem('lastProblemSolvingLoop', JSON.stringify(plan));
                Analytics.track('problem_solving_loop_ready', {
                    provider: plan.provider,
                    modelName: plan.modelName,
                    category: plan.diagnosis.category,
                    deflectionEligible: plan.deflection.eligible,
                    urgencyScore: plan.diagnosis.urgencyScore,
                });
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : (locale === 'zh' ? '问题解决闭环生成失败' : 'Problem-solving loop failed');
                setProblemSolvingError(message);
                Analytics.track('problem_solving_loop_failed', { message });
            })
            .finally(() => setProblemSolvingLoading(false));
    }, [locale]);

    const createReportMutation = useCreateReport();

    /* ─── Persist diagnosis before entering real API-backed matching ─── */
    const handleDispatchStart = useCallback(async () => {
        if (dispatchStartedRef.current || !demandData) {
            return;
        }
        dispatchStartedRef.current = true;

        const urgencyScore = problemSolvingPlan?.diagnosis.urgencyScore
            ?? (demandData?.severity === 'critical' ? 10 : demandData?.severity === 'moderate' ? 6 : 3);
        const category = problemSolvingPlan?.diagnosis.category || demandData?.projectType || 'other';
        const description = [
            demandData?.scope || '',
            problemSolvingPlan?.reporting.ownerSummary ? `Loop summary: ${problemSolvingPlan.reporting.ownerSummary}` : '',
        ].filter(Boolean).join('\n\n');
        
        let result: { report: { id: number } };
        try {
            result = await createReportMutation.mutateAsync({
                title: problemSolvingPlan?.diagnosis.issueType?.slice(0, 30) || demandData?.scope?.slice(0, 30) || (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
                description,
                category: (['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting'].includes(category) ? category : 'other') as any,
                image_urls: imageUrl ? [imageUrl] : [],
                urgency_score: urgencyScore,
            });
        } catch (err) {
            dispatchStartedRef.current = false;
            console.error('Failed to create report:', err);
            const message = err instanceof Error ? err.message : (locale === 'zh' ? '创建报修失败，请重试' : 'Failed to create report. Please try again.');
            showToast(message, 'error');
            return;
        }

        const newCaseId = String(result.report.id);
        sessionStorage.setItem('lastReportId', newCaseId);

        try {
            Analytics.track('inquiry_ready_for_matching', {
                caseId: newCaseId,
                category,
                severity: problemSolvingPlan?.diagnosis.severity || demandData?.severity,
                deflectionEligible: problemSolvingPlan?.deflection.eligible,
            });

            // Save inquiry metrics to localStorage for secondary analytics
            const storedMetrics = JSON.parse(localStorage.getItem('inquiry_metrics') || '[]');
            const metrics = Array.isArray(storedMetrics) ? storedMetrics : [];
            metrics.push({
                caseId: newCaseId,
                projectType: demandData?.projectType,
                area: demandData?.area,
                severity: problemSolvingPlan?.diagnosis.severity || demandData?.severity,
                hasPhoto: !!imageUrl,
                problemSolvingLoop: problemSolvingPlan,
                timestamp: new Date().toISOString(),
            });
            localStorage.setItem('inquiry_metrics', JSON.stringify(metrics));
        } catch (err) {
            console.warn('Report created, but local matching telemetry could not be persisted:', err);
        }

        navigate(`/match?report_id=${encodeURIComponent(newCaseId)}&category=${encodeURIComponent(category)}`);
    }, [demandData, locale, imageUrl, createReportMutation, problemSolvingPlan, navigate, showToast]);

    /* ─── Navigation ─── */
    const handleBack = useCallback(() => {
        if (phase === 'summary') {
            setPhase('inquiry');
        } else {
            navigate(-1);
            Analytics.track('inquiry_abandoned', { phase, progress: 0 });
        }
    }, [phase, navigate]);

    return (
        <div className="flex flex-col h-[100dvh] bg-[#ffffff] text-[#202124] overflow-hidden selection:bg-[#1a73e8]/10">
            {/* Apple Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-gradient-to-br from-[#1a73e8]/5 to-transparent blur-[120px] opacity-60" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tl from-[#a142f4]/5 to-transparent blur-[120px] opacity-40" />
            </div>

            <div className="relative z-10 flex flex-col h-full w-full max-w-5xl mx-auto overflow-hidden">
                {phase === 'inquiry' && (
                    <InquiryChat
                        onComplete={handleInquiryComplete}
                        onBack={handleBack}
                    />
                )}

                {phase === 'summary' && demandData && (
                    <DemandSummary
                        data={demandData}
                        locale={locale}
                        imageUrl={imageUrl}
                        problemSolvingPlan={problemSolvingPlan}
                        problemSolvingLoading={problemSolvingLoading}
                        problemSolvingError={problemSolvingError}
                        onDispatch={handleDispatchStart}
                        onBack={handleBack}
                    />
                )}

            </div>
        </div>
    );
};

export default DiagnosisWizard;
