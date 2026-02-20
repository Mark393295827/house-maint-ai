import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, generateRepairPlan } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

const WorkerJobPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [planLoading, setPlanLoading] = useState(false);
    const [plan, setPlan] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const fetchReport = async () => {
            try {
                const data = await getReport(id);
                setReport(data.report);
            } catch (err) {
                console.error(err);
                setError('Failed to load job details');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id]);

    const handleGeneratePlan = async () => {
        if (!id) return;
        setPlanLoading(true);
        setError(null);
        try {
            const result = await generateRepairPlan(id);
            setPlan(result.plan);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate AI plan');
        } finally {
            setPlanLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    if (!report) return <div className="p-4 text-center">Job not found</div>;

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6 bg-white dark:bg-surface-dark shadow-sm z-10 sticky top-0">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-main-light dark:text-text-main-dark">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    Job #{report.id}
                </h1>
                <div className="w-10"></div>
            </div>

            <main className="flex-1 p-4 space-y-4">
                {/* Job Info */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {report.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">{report.title}</h2>
                    <p className="text-text-sub-light dark:text-text-sub-dark mb-4">{report.description}</p>

                    {/* User Assets Context (if available) - simplified view */}
                    {report.user_assets && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-sm">
                            <h4 className="font-bold mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">kitchen</span> Appliances
                            </h4>
                            {/* Assuming user_assets comes as JSON string or object from API */}
                            <p className="text-xs opacity-70">
                                {typeof report.user_assets === 'string' ? 'Details available' : 'Details available'}
                            </p>
                        </div>
                    )}
                </div>

                {/* AI Plan Section */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <span className="material-symbols-outlined">psychology</span>
                            AI Engineer Plan
                        </h3>
                        {!plan && !planLoading && (
                            <button
                                onClick={handleGeneratePlan}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                Generate
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm mb-2">
                            {error}
                        </div>
                    )}

                    {planLoading && (
                        <div className="flex flex-col items-center py-6">
                            <LoadingSpinner />
                            <p className="text-xs text-blue-600 mt-2 animate-pulse">DeepSeek R1 is thinking...</p>
                        </div>
                    )}

                    {plan && (
                        <div className="prose prose-sm max-w-none text-text-main-light dark:text-text-main-dark bg-white dark:bg-gray-800 p-4 rounded-xl shadow-inner overflow-x-auto">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{plan}</pre>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">chat</span> Message
                    </button>
                    <button className="bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined">check_circle</span> Complete
                    </button>
                </div>

            </main>
            <BottomNav />
        </div>
    );
};

export default WorkerJobPage;
