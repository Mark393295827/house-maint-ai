import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { getAvailableOrders, getMyWorkerJobs, acceptJob, getWorkerDashboard, updateWorkerAvailability } from '../services/api';
import type { AvailableOrder, WorkerJob, WorkerDashboardStats } from '../services/api';
import OrderPushModal from '../components/repair/OrderPushModal';

const categoryIcon: Record<string, string> = {
    plumbing: 'plumbing', electrical: 'bolt', hvac: 'ac_unit',
    structural: 'foundation', appliance: 'kitchen', painting: 'format_paint',
    carpentry: 'carpentry', roofing: 'roofing', cleaning: 'cleaning_services',
    other: 'more_horiz', default: 'home_repair_service',
};

const categoryColor: Record<string, string> = {
    plumbing: 'from-[#1a73e8] to-[#32ade6]',
    electrical: 'from-[#ff9500] to-[#ffcc00]',
    hvac: 'from-[#34a853] to-[#34c759]',
    structural: 'from-[#a142f4] to-[#af52de]',
    appliance: 'from-[#00c7be] to-[#30b0c7]',
    painting: 'from-[#ff2d55] to-[#ff375f]',
    carpentry: 'from-[#a2845e] to-[#c7a77e]',
    roofing: 'from-[#3a3a3c] to-[#636366]',
    cleaning: 'from-[#34a853] to-[#1a73e8]',
    other: 'from-[#8e8e93] to-[#636366]',
    default: 'from-[#8e8e93] to-[#c7c7cc]',
};

const urgencyBadge: Record<number, { key: string; color: string; border: string }> = {
    0: { key: 'low', color: 'text-[#8e8e93]', border: 'border-black/5' },
    1: { key: 'mid', color: 'text-[#1a73e8]', border: 'border-[#1a73e8]/10' },
    2: { key: 'urgent', color: 'text-[#ff9500]', border: 'border-[#ff9500]/10' },
    3: { key: 'critical', color: 'text-[#ff3b30]', border: 'border-[#ff3b30]/10' },
};

const getUrgency = (score: number) => {
    if (score >= 8) return urgencyBadge[3];
    if (score >= 5) return urgencyBadge[2];
    if (score >= 2) return urgencyBadge[1];
    return urgencyBadge[0];
};

type TabType = 'available' | 'myJobs';
type TranslationParams = Record<string, string | number | undefined> & { defaultValue?: string };
type NotificationState = { type: 'success' | 'error'; key: string; params?: TranslationParams };

const normalizeCategory = (category?: string | null) => {
    if (category && categoryIcon[category]) return category;
    return 'default';
};

const formatDistance = (distance: number | null | undefined, t: (key: string, params?: TranslationParams) => string) => {
    if (distance === null || distance === undefined) return t('workerPortal.distanceUnknown');
    const value = Number.isInteger(distance) ? String(distance) : distance.toFixed(1);
    return t('workerPortal.distanceKm', { distance: value });
};

const formatTimeAgo = (dateStr: string, t: (key: string, params?: TranslationParams) => string) => {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('workerPortal.time.justNow');
    if (mins < 60) return t('workerPortal.time.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('workerPortal.time.hoursAgo', { count: hours });
    return t('workerPortal.time.daysAgo', { count: Math.floor(hours / 24) });
};

const getJobStatusTone = (status: string) => {
    if (status === 'in_progress') return 'bg-[#1a73e8]/10 text-[#1a73e8] border border-[#1a73e8]/20';
    if (status === 'completed') return 'bg-[#34a853]/10 text-[#34a853] border border-[#34a853]/20';
    return 'bg-[#ff9500]/10 text-[#ff9500] border border-[#ff9500]/20';
};

const getJobStatusLabel = (status: string, t: (key: string, params?: TranslationParams) => string) => {
    const knownStatuses = new Set(['matched', 'in_progress', 'completed', 'cancelled']);
    if (!knownStatuses.has(status)) return status.toUpperCase();
    return t(`workerPortal.jobStatus.${status}`);
};

const WorkerDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [tab, setTab] = useState<TabType>('available');
    const [available, setAvailable] = useState(true);
    const [orders, setOrders] = useState<AvailableOrder[]>([]);
    const [myJobs, setMyJobs] = useState<WorkerJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [workerId, setWorkerId] = useState<number | null>(null);
    const [simulatedOrder, setSimulatedOrder] = useState<AvailableOrder | null>(null);
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const notificationTimer = useRef<number | null>(null);
    const enableDemoOrderPush = import.meta.env.DEV && import.meta.env.VITE_ENABLE_WORKER_PUSH_SIM === 'true';

    const [stats, setStats] = useState<WorkerDashboardStats>({
        earnings: 0,
        jobsCompleted: 0,
        rating: 5.0,
        activeJobs: 0
    });

    const notify = useCallback((nextNotification: NotificationState, duration = 3000) => {
        if (notificationTimer.current !== null) {
            window.clearTimeout(notificationTimer.current);
        }

        setNotification(nextNotification);
        notificationTimer.current = window.setTimeout(() => {
            setNotification(null);
            notificationTimer.current = null;
        }, duration);
    }, []);

    useEffect(() => {
        return () => {
            if (notificationTimer.current !== null) {
                window.clearTimeout(notificationTimer.current);
            }
        };
    }, []);

    const fetchData = useCallback(async (withStatus = false) => {
        setLoading(true);
        try {
            const [ordersRes, jobsRes, dashboardRes] = await Promise.all([
                getAvailableOrders(),
                getMyWorkerJobs(),
                getWorkerDashboard().catch(() => ({ stats: null, worker: null }))
            ]);

            setOrders(ordersRes.orders || []);
            setMyJobs(jobsRes.jobs || []);

            if (dashboardRes.stats) setStats(dashboardRes.stats);
            if (dashboardRes.worker) {
                setWorkerId(dashboardRes.worker.id);
                setAvailable(!!dashboardRes.worker.available);
            }

            if (withStatus) notify({ type: 'success', key: 'workerPortal.notifications.refreshSuccess' });
            return true;
        } catch (err) {
            console.error('Failed to fetch worker data:', err);
            if (withStatus) notify({ type: 'error', key: 'workerPortal.notifications.loadFailed' }, 5000);
            return false;
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!enableDemoOrderPush) return;
        const timer = window.setTimeout(() => {
            setSimulatedOrder({
                id: 999,
                title: t('workerPortal.demoOrder.title'),
                description: t('workerPortal.demoOrder.description'),
                distance_km: 1.2,
                category: 'hvac',
                urgency_score: 8,
                created_at: new Date().toISOString(),
                user_name: t('workerPortal.demoOrder.customer')
            });
        }, 8000);
        return () => window.clearTimeout(timer);
    }, [enableDemoOrderPush, t]);

    const handleAccept = async (orderId: string) => {
        setAccepting(orderId);
        try {
            await acceptJob(orderId);
            notify({ type: 'success', key: 'workerPortal.notifications.acceptSuccess' });
            await fetchData();
            setTab('myJobs');
        } catch (err) {
            console.error('Failed to accept order:', err);
            notify({ type: 'error', key: 'workerPortal.notifications.acceptFailed' }, 5000);
        } finally {
            setAccepting(null);
        }
    };

    const handleToggleAvailability = async () => {
        if (workerId === null) {
            notify({ type: 'error', key: 'workerPortal.notifications.workerMissing' }, 5000);
            return;
        }

        const newAvailable = !available;
        setAvailable(newAvailable);
        try {
            await updateWorkerAvailability(workerId, newAvailable);
            notify({
                type: 'success',
                key: newAvailable
                    ? 'workerPortal.notifications.availabilityOnline'
                    : 'workerPortal.notifications.availabilityOffline'
            });
        } catch (err) {
            console.error('Failed to update worker availability:', err);
            setAvailable(!newAvailable);
            notify({ type: 'error', key: 'workerPortal.notifications.availabilityFailed' }, 5000);
        }
    };

    const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'matched');
    const activeJobsCount = Math.max(stats.activeJobs || 0, activeJobs.length);

    const statsData = [
        { icon: 'payments', label: t('workerPortal.stats.earnings'), value: `¥${stats.earnings.toFixed(0)}`, accent: '#34a853' },
        { icon: 'task_alt', label: t('workerPortal.stats.completed'), value: stats.jobsCompleted, accent: '#1a73e8' },
        { icon: 'star', label: t('workerPortal.stats.rating'), value: stats.rating.toFixed(1), accent: '#ff9500' },
        { icon: 'hourglass_empty', label: t('workerPortal.stats.active'), value: activeJobsCount, accent: '#af52de' },
    ];

    const bottomNavItems = [
        { icon: 'grid_view', label: t('workerPortal.nav.leads'), aria: t('workerPortal.nav.openLeads'), onClick: () => setTab('available'), active: tab === 'available' },
        { icon: 'receipt_long', label: t('workerPortal.nav.history'), aria: t('workerPortal.nav.openHistory'), onClick: () => setTab('myJobs'), active: tab === 'myJobs' },
        { icon: 'notifications', label: t('workerPortal.nav.alerts'), aria: t('workerPortal.nav.openAlerts'), onClick: () => navigate('/notifications'), active: false },
        { icon: 'account_circle', label: t('workerPortal.nav.profile'), aria: t('workerPortal.nav.openProfile'), onClick: () => navigate('/profile'), active: false },
    ];

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#202124] font-sans selection:bg-[#1a73e8]/10 pb-32">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-[#1a73e8]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#a142f4]/5 blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 apple-glass border-b border-black/5 px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 shadow-sm flex shrink-0 items-center justify-center">
                            <span className="material-symbols-outlined text-[#202124] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest leading-none mb-1">{t('workerPortal.title')}</p>
                            <h1 className="text-[17px] font-black tracking-tight truncate">{user?.name || t('workerPortal.defaultWorker')}</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-[#34a853] animate-pulse' : 'bg-[#ff3b30]'}`} />
                                <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest truncate">
                                    {available ? t('workerPortal.status.receivingLeads') : t('workerPortal.status.standby')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <LanguageToggle />
                        <button
                            type="button"
                            onClick={() => void fetchData(true)}
                            disabled={loading}
                            aria-label={t('workerPortal.actions.refresh')}
                            className="h-10 w-10 rounded-full bg-white border border-black/10 text-[#202124] shadow-sm flex items-center justify-center transition-all hover:bg-black/5 disabled:opacity-40"
                        >
                            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>sync</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleAvailability}
                            aria-label={available ? t('workerPortal.actions.goOffline') : t('workerPortal.actions.goOnline')}
                            className={`group relative h-10 px-3 sm:px-5 rounded-full font-black text-[11px] tracking-widest uppercase transition-all flex items-center gap-2 whitespace-nowrap ${available ? 'bg-[#202124] text-white shadow-xl shadow-black/10' : 'bg-white border border-black/10 text-[#202124]'}`}
                        >
                            <span className="material-symbols-outlined text-sm font-black">{available ? 'notifications_active' : 'notifications_off'}</span>
                            <span className="hidden min-[420px]:inline">{available ? t('workerPortal.actions.goOffline') : t('workerPortal.actions.goOnline')}</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className="px-6 pt-8 pb-4 max-w-lg mx-auto">
                <div className="grid grid-cols-2 gap-3 stagger-item">
                    {statsData.map((s) => (
                        <div key={s.label} className="aegis-card p-5 bg-white border border-black/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group">
                            <div className="min-w-0">
                                <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest leading-tight mb-1 block truncate">{s.label}</span>
                                <span className="text-2xl font-black tracking-tighter tabular-nums">{s.value}</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex shrink-0 items-center justify-center transition-colors" style={{ backgroundColor: `${s.accent}15` }}>
                                <span className="material-symbols-outlined text-lg" style={{ color: s.accent, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="px-6 py-4 max-w-lg mx-auto stagger-item">
                <div className="p-1.5 apple-glass bg-white/40 ring-1 ring-black/5 rounded-2xl flex gap-1">
                    <button
                        type="button"
                        onClick={() => setTab('available')}
                        aria-pressed={tab === 'available'}
                        className={`flex-1 min-w-0 h-11 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === 'available' ? 'bg-[#202124] text-white shadow-lg' : 'text-[#86868b] hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-lg">grid_view</span>
                        <span className="truncate">{t('workerPortal.tabs.leads')} ({orders.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('myJobs')}
                        aria-pressed={tab === 'myJobs'}
                        className={`flex-1 min-w-0 h-11 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === 'myJobs' ? 'bg-[#202124] text-white shadow-lg' : 'text-[#86868b] hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-lg">assignment</span>
                        <span className="truncate">{t('workerPortal.tabs.jobs')} ({myJobs.length})</span>
                    </button>
                </div>
            </div>

            <main className="px-6 max-w-lg mx-auto">
                {notification && (
                    <div className="mb-6 p-4 apple-glass border border-black/5 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-black/5" role="status">
                        <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${notification.type === 'success' ? 'bg-[#34a853]/10 text-[#34a853]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>
                            <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
                        </div>
                        <span className="text-[14px] font-bold text-[#202124]">{t(notification.key, notification.params)}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <div className="w-8 h-8 border-[3px] border-[#202124]/10 border-t-[#202124] rounded-full animate-spin mb-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{t('workerPortal.loading')}</span>
                    </div>
                ) : tab === 'available' ? (
                    <div className="flex flex-col gap-4 stagger-item">
                        {orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 rounded-[28px] bg-white border border-black/5 shadow-sm flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-4xl text-[#d2d2d7]">radar</span>
                                </div>
                                <h3 className="text-xl font-black tracking-tight mb-2">{t('workerPortal.empty.availableTitle')}</h3>
                                <p className="text-[14px] font-bold text-[#86868b] max-w-[260px]">{t('workerPortal.empty.availableDesc')}</p>
                            </div>
                        ) : (
                            orders.map(order => {
                                const cat = normalizeCategory(order.category);
                                const urg = getUrgency(order.urgency_score || 0);
                                const estimate = Math.floor(80 + (order.urgency_score || 0) * 30);

                                return (
                                    <div key={order.id} className="aegis-card bg-white border border-black/5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden relative group">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between gap-3 mb-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColor[cat] ?? categoryColor.default} flex shrink-0 items-center justify-center shadow-lg shadow-black/5`}>
                                                        <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                            {categoryIcon[cat] ?? categoryIcon.default}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest block truncate">{t(`workerPortal.categories.${cat}`)}</span>
                                                        <span className="text-[10px] text-[#d2d2d7] font-bold">{formatTimeAgo(order.created_at, t)}</span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${urg.border} ${urg.color}`}>
                                                    {t(`workerPortal.urgency.${urg.key}`)}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black tracking-tight leading-tight mb-2 group-hover:text-[#1a73e8] transition-colors">{order.title}</h3>
                                            <p className="text-[14px] font-medium text-[#86868b] leading-relaxed mb-6 line-clamp-2">{order.description}</p>

                                            <div className="flex items-center justify-between gap-4 pt-5 border-t border-black/5">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[18px] text-[#1a73e8]">near_me</span>
                                                        <span className="text-[14px] font-black tabular-nums whitespace-nowrap">{formatDistance(order.distance_km, t)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[18px] text-[#34a853]">payments</span>
                                                        <span className="text-[14px] font-black tabular-nums whitespace-nowrap">{t('workerPortal.priceEstimate', { amount: estimate })}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[12px] font-bold text-[#86868b] opacity-50 truncate">{order.user_name || t('workerPortal.customerFallback')}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleAccept(String(order.id))}
                                            disabled={accepting === String(order.id)}
                                            aria-label={t('workerPortal.actions.claimSpecific', { title: order.title })}
                                            className="w-full h-14 bg-[#202124] hover:bg-black text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-colors disabled:opacity-40"
                                        >
                                            {accepting === String(order.id) ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    <span>{t('workerPortal.actions.accepting')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[20px]">flash_on</span>
                                                    <span>{t('workerPortal.actions.claimLead')}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 stagger-item">
                        {myJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                <span className="material-symbols-outlined text-6xl mb-4">assignment_late</span>
                                <p className="text-[14px] font-black uppercase tracking-widest">{t('workerPortal.empty.jobsTitle')}</p>
                            </div>
                        ) : (
                            myJobs.map(job => (
                                <button
                                    type="button"
                                    key={job.id}
                                    onClick={() => navigate(`/worker/job/${job.id}`)}
                                    aria-label={t('workerPortal.actions.openTicket', { id: job.id })}
                                    className="aegis-card p-6 bg-white border border-black/5 shadow-sm text-left hover:shadow-xl hover:-translate-y-1 transition-all group"
                                >
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getJobStatusTone(job.status)}`}>
                                            {getJobStatusLabel(job.status, t)}
                                        </div>
                                        <span className="text-[11px] font-black text-[#d2d2d7] whitespace-nowrap">{t('workerPortal.ticketNumber', { id: job.id })}</span>
                                    </div>
                                    <h3 className="text-[17px] font-black tracking-tight mb-2 group-hover:text-[#1a73e8] transition-colors">{job.title}</h3>
                                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/5">
                                        <span className="text-[12px] font-bold text-[#86868b] truncate">{job.user_name || t('workerPortal.customerFallback')}</span>
                                        <span className="material-symbols-outlined text-[#d2d2d7] transition-transform group-hover:translate-x-1">chevron_right</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-[60] p-6 pointer-events-none" aria-label={t('workerPortal.nav.label')}>
                <div className="max-w-md mx-auto apple-glass bg-white/80 ring-1 ring-black/10 rounded-[28px] shadow-2xl p-2 flex items-center justify-around pointer-events-auto">
                    {bottomNavItems.map((item) => (
                        <button
                            type="button"
                            key={item.label}
                            onClick={item.onClick}
                            aria-label={item.aria}
                            aria-current={item.active ? 'page' : undefined}
                            className="flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative group min-w-[64px]"
                        >
                            <span className={`material-symbols-outlined text-[24px] transition-all ${item.active ? 'text-[#1a73e8]' : 'text-[#86868b] opacity-40 group-hover:opacity-100'}`} style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                {item.icon}
                            </span>
                            <span className={`text-[9px] font-black tracking-widest mt-1 ${item.active ? 'text-[#1a73e8]' : 'text-[#86868b] opacity-40 group-hover:opacity-100'}`}>
                                {item.label}
                            </span>
                            {item.active && <div className="absolute -top-1 w-1 h-1 bg-[#1a73e8] rounded-full shadow-[0_0_8px_#1a73e8]" />}
                        </button>
                    ))}
                </div>
            </nav>

            {simulatedOrder && (
                <OrderPushModal
                    order={simulatedOrder}
                    onAccept={(id) => {
                        void handleAccept(id);
                        setSimulatedOrder(null);
                    }}
                    onDecline={() => setSimulatedOrder(null)}
                />
            )}
        </div>
    );
};

export default WorkerDashboardPage;
