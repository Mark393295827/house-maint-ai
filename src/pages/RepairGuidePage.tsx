import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IMAGES } from '../constants/images';

const RepairGuidePage = () => {
    const [completedSteps, setCompletedSteps] = useState([true, false, false, false]);

    const toggleStep = (index) => {
        const newCompleted = [...completedSteps];
        newCompleted[index] = !newCompleted[index];
        setCompletedSteps(newCompleted);
    };

    const completedCount = completedSteps.filter(Boolean).length;
    const progress = (completedCount / 4) * 100;

    const steps = [
        {
            title: 'Turn off water',
            description: 'Locate the isolation valve under the sink and turn it clockwise.',
            image: IMAGES.STEP_VALVE,
        },
        {
            title: 'Remove handle',
            description: 'Use an Allen key to loosen the set screw, then lift the handle.',
            image: IMAGES.STEP_WRENCH,
        },
        {
            title: 'Sealant Cure Time',
            description: 'Wait for the silicone to set properly before testing.',
            isTimer: true,
        },
        {
            title: 'Reassemble parts',
            description: 'Reverse the steps to put the handle back on.',
            image: IMAGES.STEP_REASSEMBLE,
        },
    ];

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl">
            {/* Header Section */}
            <header className="flex-none bg-background-light dark:bg-background-dark pt-safe-top z-20">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link to="/" className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-main-light dark:text-white">
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </Link>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center text-text-main-light dark:text-white">Leaky Faucet Repair</h2>
                    <button className="flex items-center justify-center h-10 px-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="text-primary text-sm font-bold tracking-[0.015em]">Help</span>
                    </button>
                </div>
                {/* Progress Indicator */}
                <div className="px-6 pb-4">
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-sm font-semibold text-text-main-light dark:text-text-main-dark">{completedCount} of 4 steps completed</p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-4 pt-2 space-y-4">
                {steps.map((step, index) => (
                    <div key={index} className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-transparent dark:border-gray-800 transition-all hover:shadow-md">
                        <div className="flex gap-4">
                            {/* Image or Timer Icon */}
                            <div className="shrink-0">
                                {step.isTimer ? (
                                    <div className="bg-primary/10 dark:bg-primary/20 rounded-lg h-20 w-20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-4xl">hourglass_top</span>
                                    </div>
                                ) : (
                                    <div
                                        className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20 w-20 bg-cover bg-center shadow-inner"
                                        style={{ backgroundImage: `url("${step.image}")` }}
                                    ></div>
                                )}
                            </div>
                            {/* Text Content */}
                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${completedSteps[index]
                                        ? 'bg-primary/10 text-primary'
                                        : step.isTimer
                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}>
                                        Step {index + 1}{step.isTimer ? ' • Wait' : ''}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-text-main-light dark:text-white leading-tight mb-1">{step.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-snug line-clamp-2">{step.description}</p>
                            </div>
                            {/* Checkbox */}
                            <div className="shrink-0 flex items-center justify-center">
                                <button
                                    onClick={() => toggleStep(index)}
                                    className={`size-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${completedSteps[index]
                                        ? 'bg-primary border-primary'
                                        : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    {completedSteps[index] && (
                                        <span className="material-symbols-outlined text-white text-[18px]">check</span>
                                    )}
                                </button>
                            </div>
                        </div>
                        {/* Timer Widget for Step 3 */}
                        {step.isTimer && (
                            <div className="mt-4">
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex items-center justify-between border border-primary/20">
                                    <div className="flex gap-2 text-center">
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-black text-primary tracking-tight">15</span>
                                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Min</span>
                                        </div>
                                        <span className="text-2xl font-black text-primary/50 -mt-1">:</span>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-black text-primary tracking-tight">00</span>
                                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Sec</span>
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md shadow-primary/30 hover:bg-primary-dark transition-transform active:scale-95">
                                        <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                                        Start Timer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div className="h-8"></div>
            </main>

            {/* Sticky Footer */}
            <footer className="absolute bottom-0 left-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 pb-8 z-30">
                <div className="flex flex-col gap-3">
                    <button className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:bg-primary-dark transition-transform active:scale-[0.98]">
                        <span className="material-symbols-outlined">build</span>
                        Start Fix
                    </button>
                    <button className="w-full h-12 bg-transparent border-2 border-primary/30 text-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined">calendar_today</span>
                        Add to Weekly Plan
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default RepairGuidePage;
