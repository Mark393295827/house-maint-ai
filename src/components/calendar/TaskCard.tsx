/**
 * TaskCard — Extracted from CalendarPage
 * Displays a single maintenance task with icon, location, duration, and badges.
 */

interface TaskItem {
    title: string;
    location: string;
    duration: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    hasAiScan?: boolean;
    isAutoFilled?: boolean;
    titleZh?: string;
}

interface TaskCardProps {
    task: TaskItem;
    index: number;
    isHighlighted?: boolean;
}

export default function TaskCard({ task, index, isHighlighted = false }: TaskCardProps) {
    return (
        <div
            key={index}
            className={`group relative flex flex-col bg-white dark:bg-surface-dark rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5
                ${isHighlighted ? 'border-l-4 border-l-primary border-t border-r border-b border-gray-100 dark:border-gray-800' : 'border border-gray-100 dark:border-gray-800'}`}
        >
            <div className="absolute top-4 right-4 text-gray-300 dark:text-gray-600 cursor-grab hover:text-primary transition-colors">
                <span className="material-symbols-outlined">drag_indicator</span>
            </div>
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${task.iconBg} flex items-center justify-center ${task.iconColor}`}>
                    <span className="material-symbols-outlined">{task.icon}</span>
                </div>
                <div className="flex-1 pr-8">
                    <h4 className="text-base font-bold text-text-main-light dark:text-text-main-dark leading-tight mb-1">{task.title}</h4>
                    <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-3">{task.location}</p>
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            <span className="material-symbols-outlined text-[14px]">schedule</span> {task.duration}
                        </span>
                        {task.hasAiScan && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-xs font-bold text-blue-700 dark:text-blue-300">
                                <span className="material-symbols-outlined text-[14px]">smart_toy</span> AI Scan
                            </span>
                        )}
                        {task.isAutoFilled && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-xs font-bold text-primary">
                                <span className="material-symbols-outlined text-[14px]">autorenew</span> Auto-filled
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export type { TaskItem };
