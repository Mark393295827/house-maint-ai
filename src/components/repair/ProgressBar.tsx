/**
 * ProgressBar — Extracted from RepairGuidePage
 * Displays completion progress for repair steps with animated bar.
 */
import { useLanguage } from '../../i18n/LanguageContext';

interface ProgressBarProps {
    completedCount: number;
    totalSteps: number;
    progress: number;
}

export default function ProgressBar({ completedCount, totalSteps, progress }: ProgressBarProps) {
    const { t } = useLanguage();

    return (
        <div className="px-6 pb-4">
            <div className="flex justify-between items-end mb-2">
                <p className="text-sm font-semibold text-text-main-light dark:text-text-main-dark">
                    {t('repair.progress', { completed: completedCount, total: totalSteps })}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
}
