import React from 'react';

interface WeekSelectorProps {
    currentMonth: string;
    currentYear: number;
    startDate: number;
    endDate: number;
    onPrev?: () => void;
    onNext?: () => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
    currentMonth,
    currentYear,
    startDate,
    endDate,
    onPrev,
    onNext
}) => {
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
                {currentMonth} {startDate} - {currentMonth} {endDate}, {currentYear}
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
