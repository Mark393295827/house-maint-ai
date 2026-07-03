import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCreateReport } from '../../hooks/useReports';
import { useToast } from '../../contexts/ToastContext';
import Analytics from '../../services/analytics';

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

    /* ─── Phase 1 → 2 ─── */
    const handleInquiryComplete = useCallback((summary: DemandData, _imgB64?: string | null, imgUrl?: string | null) => {
        setDemandData(summary);
        setImageUrl(imgUrl || null);
        setPhase('summary');
    }, []);

    /* ─── Phase 2 → 3 (Dispatch) ─── */
    const handleDispatchStart = useCallback(() => {
        setPhase('dispatch');
    }, []);

    const createReportMutation = useCreateReport();

    /* ─── Dispatch confirmation → Feedback ─── */
    const handleDispatch = useCallback(async (worker: any) => {
        sessionStorage.setItem('selectedWorker', JSON.stringify(worker));

        // Logic mapping: critical -> 10, moderate -> 6 (changed from 7), low -> 3 (changed from 4)
        const urgencyScore = demandData?.severity === 'critical' ? 10 : demandData?.severity === 'moderate' ? 6 : 3;
        
        try {
            const result = await createReportMutation.mutateAsync({
                title: demandData?.scope?.slice(0, 30) || (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
                description: demandData?.scope || '',
                category: (['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting'].includes(demandData?.projectType || '') ? demandData?.projectType : 'other') as any,
                image_urls: imageUrl ? [imageUrl] : [],
                urgency_score: urgencyScore,
            });

            const newCaseId = String(result.report.id);
            setCaseId(newCaseId);
            sessionStorage.setItem('lastReportId', newCaseId);
            
            Analytics.track('inquiry_dispatched', { 
                caseId: newCaseId, 
                category: demandData?.projectType, 
                severity: demandData?.severity 
            });

            // Save inquiry metrics to localStorage for secondary analytics
            const metrics = JSON.parse(localStorage.getItem('inquiry_metrics') || '[]');
            metrics.push({
                caseId: newCaseId,
                projectType: demandData?.projectType,
                area: demandData?.area,
                severity: demandData?.severity,
                hasPhoto: !!imageUrl,
                timestamp: new Date().toISOString(),
            });
            localStorage.setItem('inquiry_metrics', JSON.stringify(metrics));

            setPhase('feedback');
        } catch (err) {
            console.error('Failed to create report:', err);
            const message = err instanceof Error ? err.message : (locale === 'zh' ? '创建报修失败，请重试' : 'Failed to create report. Please try again.');
            showToast(message, 'error');
        }
    }, [demandData, locale, imageUrl, createReportMutation]);

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
        issue_name: demandData.projectType,
        issue_name_en: demandData.projectType,
        severity: demandData.severity,
        estimated_cost: demandData.budget,
        description: demandData.scope,
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
                        onClose={handleFeedbackClose}
                    />
                )}
            </div>
        </div>
    );
};

export default DiagnosisWizard;
