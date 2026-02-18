import React from 'react';

interface RepairStep {
    title: string;
    description: string;
    image?: string;
    isTimer?: boolean;
    duration?: number;
}

interface RepairStepCardProps {
    step: RepairStep;
    index: number;
    isCompleted: boolean;
    onToggle: () => void;
    timerState?: { timeLeft: number; isActive: boolean };
    onTimerToggle?: (duration: number) => void;
    t: (key: string, options?: any) => string;
    formatTime: (seconds: number) => { m: string; s: string };
}

const RepairStepCard: React.FC<RepairStepCardProps> = ({
    step,
    index,
    isCompleted,
    onToggle,
    timerState,
    onTimerToggle,
    t,
    formatTime
}) => {
    return (
        <div className={`bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${isCompleted
            ? 'border-primary/30 bg-primary/5 dark:bg-primary/5'
            : 'border-transparent dark:border-gray-800'
            }`}>
            <div className="flex gap-4">
                {/* Image / Step Icon */}
                <div className="shrink-0">
                    {step.isTimer ? (
                        <div className="bg-primary/10 dark:bg-primary/20 rounded-lg h-20 w-20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-4xl">hourglass_top</span>
                        </div>
                    ) : step.image ? (
                        <div
                            className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20 w-20 bg-cover bg-center shadow-inner"
                            style={{ backgroundImage: `url("${step.image}")` }}
                        ></div>
                    ) : (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg h-20 w-20 flex items-center justify-center">
                            <span className="text-3xl font-black text-indigo-400">{index + 1}</span>
                        </div>
                    )}
                </div>
                {/* Text Content */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isCompleted
                            ? 'bg-primary/10 text-primary'
                            : step.isTimer
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}>
                            {t('repair.step', { step: index + 1 })}
                            {step.isTimer ? ` • ${t('repair.wait')}` : ''}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-text-main-light dark:text-white leading-tight mb-1">{step.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-snug">{step.description}</p>
                </div>
                {/* Checkbox */}
                <div className="shrink-0 flex items-center justify-center">
                    <button
                        onClick={onToggle}
                        className={`size-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${isCompleted
                            ? 'bg-primary border-primary'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
                    >
                        {isCompleted && (
                            <span className="material-symbols-outlined text-white text-[18px]">check</span>
                        )}
                    </button>
                </div>
            </div>
            {/* Timer Widget for timer steps */}
            {(step.isTimer && step.duration && timerState && onTimerToggle) && ((() => {
                const { m, s } = formatTime(timerState.timeLeft);
                const isFinished = timerState.timeLeft === 0;

                return (
                    <div className="mt-4">
                        <div className={`rounded-lg p-4 flex items-center justify-between border transition-colors ${isFinished ? 'bg-green-100 dark:bg-green-900/30 border-green-200'
                            : timerState.isActive ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                                : 'bg-green-50 dark:bg-green-900/20 border-primary/20'
                            }`}>
                            <div className="flex gap-2 text-center">
                                <div className="flex flex-col">
                                    <span className={`text-2xl font-black tracking-tight ${isFinished ? 'text-green-600' : 'text-primary'}`}>{m}</span>
                                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t('repair.timer.min')}</span>
                                </div>
                                <span className={`text-2xl font-black -mt-1 ${isFinished ? 'text-green-600/50' : 'text-primary/50'}`}>:</span>
                                <div className="flex flex-col">
                                    <span className={`text-2xl font-black tracking-tight ${isFinished ? 'text-green-600' : 'text-primary'}`}>{s}</span>
                                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t('repair.timer.sec')}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onTimerToggle(step.duration!)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 ${isFinished ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'
                                    : timerState.isActive ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30'
                                        : 'bg-primary text-white hover:bg-primary-dark shadow-primary/30'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {isFinished ? 'replay' : timerState.isActive ? 'pause' : 'play_arrow'}
                                </span>
                                {isFinished ? t('repair.timer.restart', { defaultValue: 'Restart' })
                                    : timerState.isActive ? t('repair.timer.pause', { defaultValue: 'Pause' })
                                        : t('repair.timer.start')}
                            </button>
                        </div>
                    </div>
                );
            })())}
        </div>
    );
};

export default RepairStepCard;
