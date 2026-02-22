import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { submitAiFeedback } from '../../services/api';

interface DiagnosisResult {
    detected: boolean;
    issue_name: string;
    issue_name_en: string;
    confidence: number;
    severity: string;
    description: string;
}

interface AnalysisResultPanelProps {
    analysisResult: DiagnosisResult | null;
    isAnalyzing: boolean;
    onReset: () => void;
    onGoToRepair: () => void;
    onQuickReport: () => void;
}

const AnalysisResultPanel: React.FC<AnalysisResultPanelProps> = ({
    analysisResult,
    isAnalyzing,
    onReset,
    onGoToRepair,
    onQuickReport
}) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [feedbackSent, setFeedbackSent] = useState(false);

    if (!analysisResult?.detected || isAnalyzing) return null;

    const confidencePercent = Math.round((analysisResult.confidence || 0) * 100);
    const confidenceColor = confidencePercent >= 80
        ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
        : confidencePercent >= 50
            ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';

    const handleFeedback = async (isHelpful: boolean) => {
        setFeedbackSent(true);
        try {
            await submitAiFeedback({
                diagnosisData: analysisResult,
                isHelpful,
            });
        } catch {
            // Silently fail — don't block user flow for feedback
        }
    };

    return (
        <div className="absolute bottom-[180px] left-4 right-4 z-20">
            <div className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md rounded-2xl p-4 shadow-xl">
                <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${analysisResult.severity === 'critical' ? 'bg-red-100 text-red-500' :
                        analysisResult.severity === 'high' ? 'bg-orange-100 text-orange-500' :
                            analysisResult.severity === 'medium' ? 'bg-yellow-100 text-yellow-500' :
                                'bg-green-100 text-green-500'
                        }`}>
                        <span className="material-symbols-outlined text-2xl">
                            {analysisResult.severity === 'critical' || analysisResult.severity === 'high'
                                ? 'error' : 'warning'}
                        </span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                                {analysisResult.issue_name}
                            </h3>
                            {/* Confidence Badge */}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${confidenceColor}`}>
                                {confidencePercent}% {t('diagnosis.result.confidence')}
                            </span>
                        </div>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                            {analysisResult.issue_name_en}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {analysisResult.description}
                        </p>
                    </div>
                </div>

                {/* Feedback Section */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {feedbackSent ? (
                        <p className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
                            ✓ {t('diagnosis.feedback.thanks')}
                        </p>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t('diagnosis.feedback.wasHelpful')}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFeedback(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">thumb_up</span>
                                    {t('diagnosis.feedback.helpful')}
                                </button>
                                <button
                                    onClick={() => handleFeedback(false)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">thumb_down</span>
                                    {t('diagnosis.feedback.notHelpful')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={onReset}
                        className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        <span>{t('diagnosis.result.retry')}</span>
                    </button>
                    <button
                        onClick={onGoToRepair}
                        className="flex-1 h-10 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-1"
                    >
                        <span>{t('diagnosis.result.guide')}</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </div>

                {/* Talk to Expert & Quick Report */}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => navigate('/community')}
                        className="flex-1 h-10 bg-transparent border border-primary/30 text-primary font-medium rounded-xl flex items-center justify-center gap-1 hover:bg-primary/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">support_agent</span>
                        <span>{t('diagnosis.feedback.talkToExpert')}</span>
                    </button>
                    <button
                        onClick={onQuickReport}
                        className="flex-1 h-10 bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-xl flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">description</span>
                        <span>{t('diagnosis.result.report', { defaultValue: 'Quick Report' })}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultPanel;
