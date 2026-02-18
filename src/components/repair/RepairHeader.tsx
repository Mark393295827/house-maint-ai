import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';

interface RepairHeaderProps {
    title: string;
    completedCount: number;
    totalSteps: number;
    progress: number;
    severity?: string;
    confidence?: number;
    executionMode: boolean;
    t: (key: string, options?: any) => string;
}

const RepairHeader: React.FC<RepairHeaderProps> = ({
    title,
    completedCount,
    totalSteps,
    progress,
    severity,
    confidence,
    executionMode,
    t
}) => {
    const severityColor = severity === 'critical' ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
        : severity === 'high' ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
            : severity === 'medium' ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                : 'text-green-500 bg-green-50 dark:bg-green-900/20';

    return (
        <header className="flex-none bg-background-light dark:bg-background-dark pt-safe-top z-20">
            <div className="flex items-center justify-between px-4 py-3">
                <Link to="/" className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-main-light dark:text-white">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center text-text-main-light dark:text-white truncate px-2">
                    {title}
                </h2>
                <button className="flex items-center justify-center h-10 px-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="text-primary text-sm font-bold tracking-[0.015em]">{t('repair.help')}</span>
                </button>
            </div>

            {/* AI Badge + Progress */}
            <div className="px-6 pb-4">
                {severity && confidence && (
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${severityColor}`}>
                            {severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
                            AI {confidence}%
                        </span>
                        {executionMode && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 animate-pulse">
                                {t('repair.executing', { defaultValue: '🔧 Executing' })}
                            </span>
                        )}
                    </div>
                )}
                <ProgressBar
                    completedCount={completedCount}
                    totalSteps={totalSteps}
                    progress={progress}
                />
            </div>
        </header>
    );
};

export default RepairHeader;
