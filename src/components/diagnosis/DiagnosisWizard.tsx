import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCreateReport } from '../../hooks/useReports';
import { useToast } from '../../contexts/ToastContext';
import Analytics from '../../services/analytics';
import { solveProblem, type ProblemSolvingLoop } from '../../services/ai';

// Phase Components
import InquiryChat from './InquiryChat';
import DemandSummary, { type DemandData } from './DemandSummary';
import StepDispatch from './steps/StepDispatch';
import FeedbackModal from './FeedbackModal';

/* ─── Types ─── */
type Phase = 'inquiry' | 'summary' | 'dispatch' | 'feedback';

const DiagnosisWizard: React.FC = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [phase, setPhase] = useState<Phase>('inquiry');
    const [demandData, setDemandData] = useState<DemandData | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [caseId, setCaseId] = useState<string>('');
    const [problemSolvingPlan, setProblemSolvingPlan] = useState<ProblemSolvingLoop | null>(null);
    const [problemSolvingLoading, setProblemSolvingLoading] = useState(false);
    const [problemSolvingError, setProblemSolvingError] = useState<string | null>(null);

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

    /* ─── Phase 2 → 3 (Dispatch) ─── */
    const handleDispatchStart = useCallback(() => {
        setPhase('dispatch');
    }, []);

    const createReportMutation = useCreateReport();

    /* ─── Dispatch confirmation → Feedback ─── */
    const handleDispatch = useCallback(async (worker: any) => {
        sessionStorage.setItem('selectedWorker', JSON.stringify(worker));

        // Prefer the unified problem-solving loop output; fall back to the local severity mapping.
        const urgencyScore = problemSolvingPlan?.diagnosis.urgencyScore
            ?? (demandData?.severity === 'critical' ? 10 : demandData?.severity === 'moderate' ? 6 : 3);
        const category = problemSolvingPlan?.diagnosis.category || demandData?.projectType || 'other';
        const description = [
            demandData?.scope || '',
            problemSolvingPlan?.reporting.ownerSummary ? `Loop summary: ${problemSolvingPlan.reporting.ownerSummary}` : '',
        ].filter(Boolean).join('\n\n');
        
        let result;
        try {
            result = await createReportMutation.mutateAsync({
                title: problemSolvingPlan?.diagnosis.issueType?.slice(0, 30) || demandData?.scope?.slice(0, 30) || (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
                description,
                category: (['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting'].includes(category) ? category : 'other') as any,
                image_urls: imageUrl ? [imageUrl] : [],
                urgency_score: urgencyScore,
            });
        } catch (err) {
            console.error('Failed to create report:', err);
            const message = err instanceof Error ? err.message : (locale === 'zh' ? '创建报修失败，请重试' : 'Failed to create report. Please try again.');
            showToast(message, 'error');
            return;
        }

        const newCaseId = String(result.report.id);
        setCaseId(newCaseId);
        setPhase('feedback');

        try {
            sessionStorage.setItem('lastReportId', newCaseId);

            Analytics.track('inquiry_dispatched', { 
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
            console.warn('Report created, but local dispatch telemetry could not be persisted:', err);
        }
    }, [demandData, locale, imageUrl, createReportMutation, problemSolvingPlan]);

    /* ─── Feedback close → Navigate away ─── */
    const handleFeedbackClose = useCallback(() => {
        navigate('/calendar');
    }, [navigate]);

    /* ─── Navigation ─── */
    const handleBack = useCallback(() => {
        if (phase === 'summary') {
            setPhase('inquiry');
        } else if (phase === 'dispatch') {
            setPhase('summary');
        } else {
            navigate(-1);
            Analytics.track('inquiry_abandoned', { phase, progress: 0 });
        }
    }, [phase, navigate]);

    /* ─── Build diagnosis-like object for StepDispatch compat ─── */
    const diagnosisCompat = demandData ? {
        issue_name: problemSolvingPlan?.diagnosis.issueType || demandData.projectType,
        issue_name_en: problemSolvingPlan?.diagnosis.issueType || demandData.projectType,
        severity: problemSolvingPlan?.diagnosis.severity || demandData.severity,
        estimated_cost: problemSolvingPlan
            ? `${problemSolvingPlan.dispatch.estimatedCost.currency === 'CNY' ? '¥' : '$'}${problemSolvingPlan.dispatch.estimatedCost.min}-${problemSolvingPlan.dispatch.estimatedCost.max}`
            : demandData.budget,
        description: problemSolvingPlan?.diagnosis.rootCauseSummary || demandData.scope,
        imageUrl: imageUrl,
    } : null;

    return (
        <div className="flex flex-col h-[100dvh] bg-[#fbfbfd] text-[#1d1d1f] overflow-hidden selection:bg-[#0071e3]/10">
            {/* Apple Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-gradient-to-br from-[#0071e3]/5 to-transparent blur-[120px] opacity-60" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tl from-[#5856d6]/5 to-transparent blur-[120px] opacity-40" />
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

                {phase === 'dispatch' && (
                    <StepDispatch
                        diagnosis={diagnosisCompat}
                        locale={locale}
                        onDispatch={handleDispatch}
                    />
                )}

                {phase === 'feedback' && (
                    <FeedbackModal
                        caseId={caseId}
                        locale={locale}
                        problemSolvingPlan={problemSolvingPlan}
                        onClose={handleFeedbackClose}
                    />
                )}
            </div>
        </div>
    );
};

export default DiagnosisWizard;
