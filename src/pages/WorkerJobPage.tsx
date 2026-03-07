import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, generateRepairPlan, acceptJob, completeReport } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

/* ─── Status helpers ─── */
const STATUS_STEPS = ['matched', 'in_progress', 'completed'] as const;
type JobStatus = typeof STATUS_STEPS[number];

const statusLabel: Record<string, string> = {
    matched: '待接单',
    in_progress: '施工中',
    completed: '已完工',
};
const statusColor: Record<string, string> = {
    matched: 'bg-amber-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
};

const WorkerJobPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);
    const [plan, setPlan] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await getReport(id);
                setReport(data.report);
            } catch (err) {
                console.error(err);
                setError('Failed to load job details');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    /* ─── Actions ─── */
    const handleAccept = async () => {
        if (!id) return;
        setActionLoading(true);
        setError(null);
        try {
            const { report: updated } = await acceptJob(id);
            setReport(updated);
        } catch (err: any) {
            setError(err.message || 'Failed to accept job');
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!id) return;
        setActionLoading(true);
        setError(null);
        try {
            const { report: updated } = await completeReport(id, {
                notes: resolutionNotes,
                completedAt: new Date().toISOString(),
            });
            setReport(updated);
        } catch (err: any) {
            setError(err.message || 'Failed to complete job');
        } finally {
            setActionLoading(false);
        }
    };

    const handleGeneratePlan = async () => {
        if (!id) return;
        setPlanLoading(true);
        setError(null);
        try {
            const result = await generateRepairPlan(id);
            setPlan(typeof result.plan === 'string' ? result.plan : JSON.stringify(result.plan, null, 2));
        } catch (err: any) {
            setError(err.message || 'Failed to generate AI plan');
        } finally {
            setPlanLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    if (!report) return <div className="p-4 text-center">Job not found</div>;

    const currentStep = STATUS_STEPS.indexOf(report.status as JobStatus);

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6 bg-white dark:bg-surface-dark shadow-sm z-10 sticky top-0">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-main-light dark:text-text-main-dark">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    工单 #{report.id}
                </h1>
                <div className="w-10"></div>
            </div>

            <main className="flex-1 p-4 space-y-4">
                {/* ─── Status Progress Bar ─── */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                        {STATUS_STEPS.map((step, i) => (
                            <div key={step} className="flex items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors ${i <= currentStep ? statusColor[step] : 'bg-gray-300 dark:bg-gray-700'}`}>
                                    {i < currentStep ? '✓' : i + 1}
                                </div>
                                {i < STATUS_STEPS.length - 1 && (
                                    <div className={`flex-1 h-1 mx-1 rounded transition-colors ${i < currentStep ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        {STATUS_STEPS.map(s => <span key={s}>{statusLabel[s]}</span>)}
                    </div>
                </div>

                {/* ─── Job Info ─── */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {statusLabel[report.status] || report.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">{report.title}</h2>
                    <p className="text-text-sub-light dark:text-text-sub-dark mb-4">{report.description}</p>
                </div>

                {/* ─── Error ─── */}
                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>
                )}

                {/* ─── AI Plan Section ─── */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <span className="material-symbols-outlined">psychology</span>
                            AI 维修方案
                        </h3>
                        {!plan && !planLoading && (
                            <button
                                onClick={handleGeneratePlan}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                生成方案
                            </button>
                        )}
                    </div>

                    {planLoading && (
                        <div className="flex flex-col items-center py-6">
                            <LoadingSpinner />
                            <p className="text-xs text-blue-600 mt-2 animate-pulse">DeepSeek R1 正在思考...</p>
                        </div>
                    )}

                    {plan && (
                        <div className="prose prose-sm max-w-none text-text-main-light dark:text-text-main-dark bg-white dark:bg-gray-800 p-4 rounded-xl shadow-inner overflow-x-auto">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{plan}</pre>
                        </div>
                    )}
                </div>

                {/* ─── Resolution Notes (when in_progress) ─── */}
                {report.status === 'in_progress' && (
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold mb-2">维修记录</h3>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="记录维修过程、使用的材料和备注..."
                            className="w-full h-24 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none"
                        />
                    </div>
                )}

                {/* ─── Action Buttons ─── */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button
                        onClick={() => navigate(`/messages`)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">chat</span> 消息
                    </button>

                    {report.status === 'matched' && (
                        <button
                            onClick={handleAccept}
                            disabled={actionLoading}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {actionLoading ? <LoadingSpinner /> : (
                                <>
                                    <span className="material-symbols-outlined">handshake</span> 接单
                                </>
                            )}
                        </button>
                    )}

                    {report.status === 'in_progress' && (
                        <button
                            onClick={handleComplete}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                        >
                            {actionLoading ? <LoadingSpinner /> : (
                                <>
                                    <span className="material-symbols-outlined">check_circle</span> 完工
                                </>
                            )}
                        </button>
                    )}

                    {report.status === 'completed' && (
                        <div className="bg-green-100 text-green-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">verified</span> 已完工
                        </div>
                    )}
                </div>
            </main>
            <BottomNav />
        </div>
    );
};

export default WorkerJobPage;
