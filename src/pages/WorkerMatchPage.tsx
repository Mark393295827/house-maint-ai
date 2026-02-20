
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MatchScoreCard from '../components/MatchScoreCard';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { mockWorkers, mockReport } from '../__mocks__/mockData';
import { useLanguage } from '../i18n/LanguageContext';
import type { Worker } from '../types';
import { useReport } from '../hooks/useReports';
import { useMatchedWorkers } from '../hooks/useWorkers';

const WorkerMatchPage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    // Get params
    const reportIdParam = searchParams.get('report_id');
    const storedReportId = sessionStorage.getItem('lastReportId');
    const reportId = reportIdParam || storedReportId;
    const categoryParam = searchParams.get('category') || 'plumbing';

    // Queries
    // 1. Fetch Report
    const {
        data: reportRes,
        isError: isReportError,
        isLoading: isReportLoading
    } = useReport(reportId ? Number(reportId) : 0);

    const report = reportRes?.report;
    const activeCategory = report?.category || categoryParam;

    // 2. Fetch Workers
    const {
        data: workersRes,
        isError: isWorkersError,
        isLoading: isWorkersLoading
    } = useMatchedWorkers({
        reportId: reportId ? Number(reportId) : undefined,
        category: activeCategory,
        latitude: 37.7749,
        longitude: -122.4194,
        limit: 5
    });

    const isError = isReportError || isWorkersError || !user;
    const isLoading = (isReportLoading || isWorkersLoading) && !!user;

    // Determine displayed data (Real vs Mock)
    const displayData = useMemo(() => {
        if (isError || !user) {
            return {
                workers: mockWorkers,
                report: mockReport,
                isMock: true
            };
        }

        const transformedWorkers = (workersRes?.matches || []).map((w: Worker) => ({
            ...w,
            id: w.id,
            name: w.name,
            avatar: w.avatar,
            distance: calculateDistance(w.latitude, w.longitude, 37.7749, -122.4194),
            rating: w.rating,
            skills: w.skills,
            distanceScore: w.distanceScore,
            technicalScore: w.skillScore,
        }));

        return {
            workers: transformedWorkers,
            report: report,
            isMock: false
        };
    }, [isError, user, workersRes, report]);

    const { workers, report: activeReport, isMock } = displayData;


    // Helper function to calculate distance
    function calculateDistance(lat1?: number, lng1?: number, lat2?: number, lng2?: number) {
        if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) return 2.0;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 10) / 10;
    }

    // Handle worker selection
    const handleSelectWorker = (worker: Worker) => {
        // Store selected worker for booking
        sessionStorage.setItem('selectedWorker', JSON.stringify(worker));
        // Navigate to booking/calendar
        navigate('/calendar');
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6 bg-white dark:bg-surface-dark shadow-sm z-10 sticky top-0">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-main-light dark:text-text-main-dark">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    {t('match.title')}
                </h1>
                <div className="w-10"></div>
            </div>

            <main className="flex-1 p-4 flex flex-col gap-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <LoadingSpinner />
                        <p className="mt-4 text-text-sub-light dark:text-text-sub-dark animate-pulse">
                            {t('match.loading')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Report Summary */}
                        {activeReport && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl mb-2">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary">description</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-text-main-light dark:text-text-main-dark text-sm">
                                            {t('match.report.title')}
                                        </h3>
                                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark line-clamp-2 mt-1">
                                            {activeReport.description || t('match.report.fallback')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Analysis Banner */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-2">
                            <h2 className="text-action-primary font-bold mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined">auto_awesome</span>
                                {t('match.analysis.title')}
                            </h2>
                            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                {t('match.analysis.description', { distance: 'D', skills: 'T', count: workers.length })}
                                {isMock && (
                                    <span className="text-xs text-orange-500 ml-1">{t('match.demo_mode')}</span>
                                )}
                            </p>
                        </div>

                        {/* Workers List */}
                        {workers.length > 0 ? (
                            workers.map((worker) => (
                                <div key={worker.id} onClick={() => handleSelectWorker(worker)} className="cursor-pointer">
                                    <MatchScoreCard
                                        worker={worker}
                                        report={activeReport || mockReport}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">search_off</span>
                                <p className="text-text-sub-light dark:text-text-sub-dark mt-4">
                                    {t('match.empty')}
                                </p>
                            </div>
                        )}

                        {/* Help Text */}
                        <div className="text-center text-xs text-gray-400 mt-4">
                            <p>{t('match.help')}</p>
                        </div>
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default WorkerMatchPage;
