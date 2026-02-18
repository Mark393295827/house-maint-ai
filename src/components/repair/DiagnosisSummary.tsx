/**
 * DiagnosisSummary — Extracted from RepairGuidePage
 * Shows AI diagnosis information card with captured image and confidence badge.
 */
import { useLanguage } from '../../i18n/LanguageContext';

interface DiagnosisSummaryProps {
    description: string;
    titleEn?: string;
    title: string;
    capturedImage?: string | null;
}

export default function DiagnosisSummary({ description, titleEn, title, capturedImage }: DiagnosisSummaryProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
                {capturedImage && (
                    <div className="shrink-0 w-16 h-16 rounded-lg bg-cover bg-center shadow-inner overflow-hidden"
                        style={{ backgroundImage: `url("${capturedImage}")` }} />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="material-symbols-outlined text-indigo-500 text-sm">auto_awesome</span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                            {t('repair.aiGenerated', { defaultValue: 'AI Generated' })}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{description}</p>
                    {titleEn && titleEn !== title && (
                        <p className="text-xs text-gray-400 mt-0.5">{titleEn}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
