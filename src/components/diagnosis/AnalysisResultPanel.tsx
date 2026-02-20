import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface DiagnosisResult {
    detected: boolean;
    issue_name: string;
    issue_name_en: string;
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

    if (!analysisResult?.detected || isAnalyzing) return null;

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
                        <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                            {analysisResult.issue_name}
                        </h3>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                            {analysisResult.issue_name_en}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {analysisResult.description}
                        </p>
                    </div>
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
                <button
                    onClick={onQuickReport}
                    className="w-full h-10 mt-2 bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-xl flex items-center justify-center gap-1"
                >
                    <span className="material-symbols-outlined text-lg">description</span>
                    <span>{t('diagnosis.result.report', { defaultValue: 'Quick Report' })}</span>
                </button>
            </div>
        </div>
    );
};

export default AnalysisResultPanel;
