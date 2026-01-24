import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchScoreCard from '../components/MatchScoreCard';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';
import { mockWorkers, mockReport } from '../__mocks__/mockData';

const WorkerMatchPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState([]);

    useEffect(() => {
        // Simulate API call - will be replaced with real API
        const timer = setTimeout(() => {
            setWorkers(mockWorkers);
            setLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6 bg-white dark:bg-surface-dark shadow-sm z-10 sticky top-0">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-main-light dark:text-text-main-dark">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    Matching Workers / 匹配工人
                </h1>
                <div className="w-10"></div>
            </div>

            <main className="flex-1 p-4 flex flex-col gap-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <LoadingSpinner />
                        <p className="mt-4 text-text-sub-light dark:text-text-sub-dark animate-pulse">
                            AI Matching in progress...
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-2">
                            <h2 className="text-action-primary font-bold mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined">auto_awesome</span>
                                AI Analysis
                            </h2>
                            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                Based on your location (D) and required skills (T), we found 3 suitable experts.
                            </p>
                        </div>

                        {workers.map((worker) => (
                            <MatchScoreCard
                                key={worker.id}
                                worker={worker}
                                report={mockReport}
                            />
                        ))}
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default WorkerMatchPage;
