import React from 'react';

interface RepairFooterProps {
    reportCreated: boolean;
    isCreatingReport: boolean;
    executionMode: boolean;
    onStartRepair: () => void;
    onAddToPlan: () => void;
    t: (key: string, options?: any) => string;
}

const RepairFooter: React.FC<RepairFooterProps> = ({
    reportCreated,
    isCreatingReport,
    executionMode,
    onStartRepair,
    onAddToPlan,
    t
}) => {
    return (
        <footer className="absolute bottom-0 left-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 pb-8 z-30">
            <div className="flex flex-col gap-3">
                {/* Report Success Toast */}
                {reportCreated && isCreatingReport === false && (
                    <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-bottom-2">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Report created successfully! You can track it in Orders.
                    </div>
                )}
                <button
                    onClick={onStartRepair}
                    disabled={isCreatingReport}
                    className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:bg-primary-dark transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                    {isCreatingReport ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>{t('repair.creatingReport', { defaultValue: 'Creating Report...' })}</span>
                        </>
                    ) : executionMode ? (
                        <>
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>{t('repair.inProgress', { defaultValue: 'In Progress — Check Steps' })}</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">build</span>
                            <span>{t('repair.action.start')}</span>
                        </>
                    )}
                </button>
                <button
                    onClick={onAddToPlan}
                    className="w-full h-12 bg-transparent border-2 border-primary/30 text-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                >
                    <span className="material-symbols-outlined">calendar_today</span>
                    {t('repair.action.plan')}
                </button>
            </div>
        </footer>
    );
};

export default RepairFooter;
