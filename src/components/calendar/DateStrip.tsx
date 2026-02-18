import React from 'react';

interface DayInfo {
    day: string;
    date: number;
    fullDate: Date;
    hasTask: boolean;
}

interface DateStripProps {
    days: DayInfo[];
    selectedDay: number | null;
    onSelectDay: (day: number) => void;
}

const DateStrip: React.FC<DateStripProps> = ({ days, selectedDay, onSelectDay }) => {
    return (
        <div className="pb-2 overflow-x-auto hide-scrollbar px-4">
            <div className="flex justify-between gap-3 min-w-[360px]">
                {days.slice(0, 5).map((d) => (
                    <button
                        key={d.date}
                        onClick={() => onSelectDay(d.date)}
                        className={`flex flex-col items-center justify-center rounded-2xl w-16 h-20 flex-shrink-0 transition-all ${selectedDay === d.date
                            ? 'bg-primary shadow-lg shadow-primary/25 text-white'
                            : 'bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 text-text-sub-light dark:text-text-sub-dark hover:border-primary/50'
                            }`}
                    >
                        <span className={`text-xs font-medium mb-1 ${selectedDay === d.date ? 'opacity-80' : ''}`}>{d.day}</span>
                        <span className={`text-xl font-bold ${selectedDay === d.date ? '' : 'text-text-main-light dark:text-text-main-dark'}`}>{d.date}</span>
                        {(selectedDay === d.date || d.hasTask) && (
                            <div className={`w-1.5 h-1.5 rounded-full mt-1 ${selectedDay === d.date ? 'bg-white' : 'bg-primary/40'}`}></div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DateStrip;
