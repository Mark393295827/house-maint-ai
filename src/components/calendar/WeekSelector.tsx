import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface WeekSelectorProps {
    startDate?: Date;
    endDate?: Date;
    onPrev?: () => void;
    onNext?: () => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
    startDate,
    endDate,
    onPrev,
    onNext
}) => {
    const { locale } = useLanguage();
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    const formatEndpoint = (date?: Date) => date
        ? new Intl.DateTimeFormat(dateLocale, { month: 'short', day: 'numeric' }).format(date)
        : '—';
    const years = startDate && endDate && startDate.getFullYear() !== endDate.getFullYear()
        ? `${startDate.getFullYear()} – ${endDate.getFullYear()}`
        : String(startDate?.getFullYear() ?? endDate?.getFullYear() ?? '');

    return (
        <div className="relative flex items-center justify-center py-4 bg-background-light dark:bg-background-dark">
            <button
                onClick={onPrev}
                className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
                aria-label="Previous week"
            >
                <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 text-center">
                {formatEndpoint(startDate)} – {formatEndpoint(endDate)}{years ? `, ${years}` : ''}
            </h2>
            <button
                onClick={onNext}
                className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
                aria-label="Next week"
            >
                <span className="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    );
};

export default WeekSelector;
