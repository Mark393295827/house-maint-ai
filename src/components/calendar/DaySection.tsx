import React from 'react';
import TaskCard, { TaskItem } from './TaskCard';

interface DaySectionProps {
    title: string;
    timeRange: string;
    colorClass: string; // e.g. "bg-yellow-400"
    tasks: TaskItem[];
    emptyMessage: string;
    isHighlighted?: boolean;
    onAddTask?: () => void;
    showAddButton?: boolean;
}

const DaySection: React.FC<DaySectionProps> = ({
    title,
    timeRange,
    colorClass,
    tasks,
    emptyMessage,
    isHighlighted = false,
    onAddTask,
    showAddButton = false
}) => {
    return (
        <div className={`px-4 pt-4 ${showAddButton ? 'mb-8' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                    {title}
                </h3>
                <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                    {timeRange}
                </span>
            </div>

            {showAddButton ? (
                <div
                    onClick={onAddTask}
                    className="w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center bg-gray-50/50 dark:bg-surface-dark/30 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">add</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{emptyMessage}</span>
                </div>
            ) : tasks.length > 0 ? (
                tasks.map((task, index) => (
                    <TaskCard
                        key={index}
                        task={task}
                        index={index}
                        isHighlighted={isHighlighted}
                    />
                ))
            ) : (
                <div className="text-center py-6 text-text-sub-light dark:text-text-sub-dark text-sm">
                    {emptyMessage}
                </div>
            )}
        </div>
    );
};

export default DaySection;
