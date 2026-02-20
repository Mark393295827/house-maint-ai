import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface AnalysisErrorPanelProps {
    error: string | null;
    onReset: () => void;
}

const AnalysisErrorPanel: React.FC<AnalysisErrorPanelProps> = ({ error, onReset }) => {
    const { t } = useLanguage();

    if (!error) return null;

    return (
        <div className="absolute bottom-[180px] left-4 right-4 z-20">
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined">error</span>
                    <span className="font-bold">{error}</span>
                </div>
                <button
                    onClick={onReset}
                    className="w-full mt-3 h-10 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 font-medium rounded-xl"
                >
                    {t('diagnosis.result.retry')}
                </button>
            </div>
        </div>
    );
};

export default AnalysisErrorPanel;
