import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface DiagnosisResult {
    detected: boolean;
    confidence: number;
    issue_name: string;
    issue_name_en: string;
}

interface DiagnosisOverlayProps {
    isAnalyzing: boolean;
    analysisResult: DiagnosisResult | null;
    analysisError: string | null;
}

const DiagnosisOverlay: React.FC<DiagnosisOverlayProps> = ({
    isAnalyzing,
    analysisResult,
    analysisError
}) => {
    const { t } = useLanguage();

    if (analysisError) return null;
    if (!isAnalyzing && !analysisResult) return null;

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {isAnalyzing ? (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="flex flex-col items-center gap-4 bg-black/50 backdrop-blur-md rounded-2xl p-6">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white font-bold">{t('diagnosis.analyzing.title')}</p>
                        <p className="text-white/70 text-sm">{t('diagnosis.analyzing.desc')}</p>
                    </div>
                </div>
            ) : analysisResult?.detected ? (
                <div className="absolute top-[30%] left-[10%] w-[200px] border-2 border-primary rounded-lg animate-pulse flex flex-col items-start justify-end p-2 bg-primary/10">
                    <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm mb-2 ml-auto">
                        {analysisResult.confidence}% {t('diagnosis.result.match')}
                    </div>
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                        <span className="material-symbols-outlined text-primary text-[16px]">warning</span>
                        <span className="text-xs font-bold text-gray-900">
                            {analysisResult.issue_name} / {analysisResult.issue_name_en}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span className="font-bold">{t('diagnosis.result.noIssue')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiagnosisOverlay;
