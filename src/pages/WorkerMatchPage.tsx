import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MatchScoreCard from '../components/MatchScoreCard';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMatchedWorkers, getReport, isAuthenticated } from '../services/api';
import { mockWorkers, mockReport } from '../__mocks__/mockData';

const WorkerMatchPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState([]);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);
    const [usingMockData, setUsingMockData] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Try to use real API if authenticated
                if (isAuthenticated()) {
                    // Get report ID from URL params or sessionStorage
                    let reportId = searchParams.get('report_id');
                    if (!reportId) {
                        reportId = sessionStorage.getItem('lastReportId');
                    }

                    // Fetch report details if we have an ID
                    let reportData: any = mockReport;
                    if (reportId) {
                        try {
                            const reportResult = await getReport(reportId);
                            reportData = {
                                id: reportResult.report.id,
                                category: reportResult.report.category,
                                description: reportResult.report.description,
                                urgency: reportResult.report.urgency,
                            } as any;
                            setReport(reportData);
                        } catch (reportErr) {
                            console.warn('Failed to fetch report:', reportErr);
                        }
                    }

                    const category = reportData.category || searchParams.get('category') || 'plumbing';

                    const data = await getMatchedWorkers(reportId, {
                        category,
                        latitude: 37.7749,
                        longitude: -122.4194,
                        limit: 5
                    });

                    // Transform API response to match component expectations
                    const transformedWorkers = data.matches.map(w => ({
                        id: w.id,
                        name: w.name,
                        avatar: w.avatar,
                        distance: calculateDistance(w.latitude, w.longitude, 37.7749, -122.4194),
                        rating: w.rating,
                        skills: w.skills,
                        distanceScore: w.distanceScore,
                        technicalScore: w.skillScore,
                    }));

                    setWorkers(transformedWorkers);
                    if (!report) setReport(reportData);
                } else {
                    // Use mock data when not authenticated
                    throw new Error('Not authenticated, using mock data');
                }
            } catch (err) {
                console.log('Using mock data:', err.message);
                setUsingMockData(true);
                setWorkers(mockWorkers);
                setReport(mockReport);
            } finally {
                setLoading(false);
            }
        };

        // Simulate a small delay for UX
        const timer = setTimeout(fetchData, 500);
        return () => clearTimeout(timer);
    }, [searchParams]);

    // Helper function to calculate distance
    function calculateDistance(lat1, lng1, lat2, lng2) {
        if (!lat1 || !lng1 || !lat2 || !lng2) return 2.0;
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
    const handleSelectWorker = (worker) => {
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
                        {/* Report Summary */}
                        {report && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl mb-2">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary">description</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-text-main-light dark:text-text-main-dark text-sm">
                                            报修问题
                                        </h3>
                                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark line-clamp-2 mt-1">
                                            {report.description || '水管维修问题'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Analysis Banner */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-2">
                            <h2 className="text-action-primary font-bold mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined">auto_awesome</span>
                                AI Analysis
                            </h2>
                            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                Based on your location (D) and required skills (T), we found {workers.length} suitable experts.
                                {usingMockData && (
                                    <span className="text-xs text-orange-500 ml-1">(Demo Mode)</span>
                                )}
                            </p>
                        </div>

                        {/* Workers List */}
                        {workers.length > 0 ? (
                            workers.map((worker) => (
                                <div key={worker.id} onClick={() => handleSelectWorker(worker)} className="cursor-pointer">
                                    <MatchScoreCard
                                        worker={worker}
                                        report={report || mockReport}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">search_off</span>
                                <p className="text-text-sub-light dark:text-text-sub-dark mt-4">
                                    暂无匹配的工人
                                </p>
                            </div>
                        )}

                        {/* Help Text */}
                        <div className="text-center text-xs text-gray-400 mt-4">
                            <p>点击工人卡片查看详情并预约服务</p>
                            <p className="mt-1">Click a worker card to view details and book service</p>
                        </div>
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default WorkerMatchPage;
