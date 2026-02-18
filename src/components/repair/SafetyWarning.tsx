import React from 'react';

interface SafetyWarningProps {
    warning: string;
    t: (key: string, options?: any) => string;
}

const SafetyWarning: React.FC<SafetyWarningProps> = ({ warning, t }) => {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
            <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                    {t('repair.safetyWarning', { defaultValue: 'Safety Warning' })}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">{warning}</p>
            </div>
        </div>
    );
};

export default SafetyWarning;
