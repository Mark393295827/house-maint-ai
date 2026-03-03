import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { addCase, generateCaseId, type CaseRecord } from '../../store/cases';
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

    /* ─── Dispatch confirmation → Feedback ─── */
    const handleDispatch = useCallback((worker: any) => {
        sessionStorage.setItem('selectedWorker', JSON.stringify(worker));

        const newCaseId = generateCaseId();
        const newCase: CaseRecord = {
            id: newCaseId,
            title: demandData?.scope?.slice(0, 20) || (locale === 'zh' ? '新诊断' : 'New Diagnosis'),
            titleEn: demandData?.scope?.slice(0, 20) || 'New Diagnosis',
            status: 'active',
            step: 2,
            severity: (demandData?.severity as any) || 'moderate',
            date: new Date().toISOString().split('T')[0],
            category: demandData?.projectType || 'other',
            rootCause: demandData?.scope || '',
            solution: '',
        };
        addCase(newCase);
        setCaseId(newCaseId);
        Analytics.track('inquiry_dispatched', { caseId: newCaseId, category: demandData?.projectType, severity: demandData?.severity });

        // Save inquiry metrics to localStorage for the dashboard
        const metrics = JSON.parse(localStorage.getItem('inquiry_metrics') || '[]');
        metrics.push({
            caseId: newCaseId,
            projectType: demandData?.projectType,
            area: demandData?.area,
            severity: demandData?.severity,
            hasPhoto: demandData?.hasPhoto || false,
            timestamp: new Date().toISOString(),
        });
        localStorage.setItem('inquiry_metrics', JSON.stringify(metrics));

        // Show feedback modal
        setPhase('feedback');
    }, [demandData, locale]);

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
    } : null;

    return (
        <div className="flex flex-col h-screen bg-[#0f1120] text-white overflow-hidden">
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
                    imageUrl={imageUrl || ''}
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
    );
};

export default DiagnosisWizard;
