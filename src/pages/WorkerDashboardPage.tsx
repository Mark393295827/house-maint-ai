import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import BottomNav from '../components/BottomNav';

const WorkerDashboardPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [stats] = useState({ earnings: 0, jobsCompleted: 0, rating: 0, activeJobs: 0 });
    const [jobs] = useState<any[]>([]);
    const [available, setAvailable] = useState(true);

    useEffect(() => {
        // In production, fetch from /api/worker-portal/dashboard
        // For now, show empty state with ability to register
    }, []);

    const toggleAvailability = () => {
        setAvailable(!available);
        // Would call PUT /api/workers/:id/availability
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Header with Carbon Fiber */}
            <div className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 pt-6 pb-4 carbon-fiber">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-text-main-light dark:text-text-main-dark">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                                {t('workerPortal.title')}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`live-dot ${!available ? 'live-dot-red' : ''}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-wider font-telemetry ${available ? 'text-data-green' : 'text-racing-red'}`}>
                                    {available ? 'ON DUTY' : 'OFF DUTY'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Go Live Toggle */}
                    <button
                        onClick={toggleAvailability}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 font-telemetry ${available
                            ? 'text-data-green border border-data-green/30'
                            : 'text-racing-red border border-racing-red/30'
                            }`}
                        style={{
                            background: available
                                ? 'rgba(0, 255, 135, 0.08)'
                                : 'rgba(225, 6, 0, 0.08)',
                            boxShadow: available
                                ? '0 0 15px rgba(0, 255, 135, 0.15), inset 0 0 15px rgba(0, 255, 135, 0.05)'
                                : '0 0 15px rgba(225, 6, 0, 0.15), inset 0 0 15px rgba(225, 6, 0, 0.05)',
                        }}
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${available ? 'bg-data-green shadow-lg shadow-data-green/50' : 'bg-racing-red shadow-lg shadow-racing-red/50'}`} />
                        {available ? t('workerPortal.available') : t('workerPortal.unavailable')}
                    </button>
                </div>
            </div>

            <main className="flex-1 px-6 pt-2 flex flex-col gap-4">
                {/* Pit Wall Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { icon: 'payments', label: t('workerPortal.earnings'), value: `¥${stats.earnings.toFixed(0)}`, color: 'text-data-green', borderColor: 'rgba(0, 255, 135, 0.15)', glowColor: 'rgba(0, 255, 135, 0.08)' },
                        { icon: 'task_alt', label: t('workerPortal.completed'), value: stats.jobsCompleted, color: 'text-neon-cyan', borderColor: 'rgba(0, 240, 255, 0.15)', glowColor: 'rgba(0, 240, 255, 0.08)' },
                        { icon: 'star', label: t('workerPortal.rating'), value: stats.rating ? `${stats.rating.toFixed(1)} ★` : '—', color: 'text-pit-amber', borderColor: 'rgba(255, 184, 0, 0.15)', glowColor: 'rgba(255, 184, 0, 0.08)' },
                        { icon: 'pending_actions', label: t('workerPortal.activeJobs'), value: stats.activeJobs, color: 'text-primary-light', borderColor: 'rgba(99, 102, 241, 0.15)', glowColor: 'rgba(99, 102, 241, 0.08)' },
                    ].map((stat) => (
                        <div key={stat.label} className="relative overflow-hidden bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm"
                            style={{
                                borderTop: `2px solid ${stat.borderColor}`,
                                border: `1px solid ${stat.borderColor}`,
                                boxShadow: `0 4px 20px ${stat.glowColor}`,
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`material-symbols-outlined text-lg ${stat.color}`}>{stat.icon}</span>
                                <span className="text-[10px] text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider font-bold">{stat.label}</span>
                            </div>
                            <span className={`text-2xl font-extrabold font-telemetry ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* Active Jobs */}
                <div>
                    <h2 className="text-sm font-semibold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wide mb-2">
                        {t('workerPortal.jobsList')}
                    </h2>
                    {jobs.length === 0 ? (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm text-center">
                            <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">work</span>
                            <p className="text-text-sub-light dark:text-text-sub-dark text-sm">
                                {t('workerPortal.noJobs')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {jobs.map((job: any) => (
                                <div key={job.id} className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm">
                                    <h3 className="font-semibold text-text-main-light dark:text-text-main-dark">{job.title}</h3>
                                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-1">{job.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                    <Link
                        to="/conversations"
                        className="flex-1 bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                    >
                        <span className="material-symbols-outlined text-2xl text-primary">chat</span>
                        <span className="text-xs font-medium text-text-main-light dark:text-text-main-dark">{t('messages.title')}</span>
                    </Link>
                    <Link
                        to="/worker-portal/register"
                        className="flex-1 bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                    >
                        <span className="material-symbols-outlined text-2xl text-primary">edit</span>
                        <span className="text-xs font-medium text-text-main-light dark:text-text-main-dark">{t('workerPortal.editProfile')}</span>
                    </Link>
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default WorkerDashboardPage;
