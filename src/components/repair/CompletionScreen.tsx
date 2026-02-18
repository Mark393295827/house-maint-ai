import React from 'react';
import { Link } from 'react-router-dom';

interface CompletionScreenProps {
    isHardDIY: boolean;
    onFindWorker: () => void;
    t: (key: string, options?: any) => string;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({ isHardDIY, onFindWorker, t }) => {
    return (
        <div className="relative page-enter">
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -top-8">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="confetti-piece"
                        style={{
                            left: `${10 + Math.random() * 80}%`,
                            backgroundColor: ['#2bb673', '#007AFF', '#FF9500', '#FF3B30', '#34C759', '#AF52DE'][i % 6],
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: `${2 + Math.random() * 1.5}s`,
                        }}
                    />
                ))}
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 text-center border border-green-200 dark:border-green-800">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-lg font-bold text-green-700 dark:text-green-400">
                    {t('repair.completionTitle', { defaultValue: 'Repair Complete!' })}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    {t('repair.completionDesc', { defaultValue: 'All steps have been completed successfully.' })}
                </p>
                <div className="flex gap-2 mt-4">
                    <Link
                        to="/"
                        className="flex-1 h-10 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">home</span>
                        <span>{t('nav.home', { defaultValue: 'Home' })}</span>
                    </Link>
                    {!isHardDIY && (
                        <button
                            onClick={onFindWorker}
                            className="flex-1 h-10 border-2 border-green-600 text-green-700 dark:text-green-400 font-bold rounded-xl flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">engineering</span>
                            <span>{t('repair.findWorker', { defaultValue: 'Find Pro' })}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompletionScreen;
