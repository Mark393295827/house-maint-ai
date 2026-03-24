import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableOrders, getMyWorkerJobs, acceptJob, getWorkerDashboard, updateWorkerAvailability } from '../services/api';
import type { AvailableOrder, WorkerJob, WorkerDashboardStats } from '../services/api';
import OrderPushModal from '../components/repair/OrderPushModal';

/* ─── Aesthetics Configuration ─── */
const categoryIcon: Record<string, string> = {
    plumbing: 'plumbing', electrical: 'bolt', hvac: 'ac_unit',
    structural: 'foundation', appliance: 'kitchen', painting: 'format_paint',
    carpentry: 'carpentry', roofing: 'roofing', cleaning: 'cleaning_services',
    other: 'more_horiz', default: 'home_repair_service',
};
const categoryColor: Record<string, string> = {
    plumbing: 'from-[#007aff] to-[#32ade6]', 
    electrical: 'from-[#ff9500] to-[#ffcc00]',
    hvac: 'from-[#28cd41] to-[#34c759]', 
    structural: 'from-[#5856d6] to-[#af52de]',
    appliance: 'from-[#00c7be] to-[#30b0c7]', 
    painting: 'from-[#ff2d55] to-[#ff375f]',
    carpentry: 'from-[#a2845e] to-[#c7a77e]',
    roofing: 'from-[#3a3a3c] to-[#636366]',
    cleaning: 'from-[#55bef0] to-[#007aff]',
    default: 'from-[#8e8e93] to-[#c7c7cc]',
};
const categoryLabel: Record<string, string> = {
    plumbing: '水工/管道', electrical: '电工/电路', hvac: '空调/暖通',
    structural: '房屋结构', appliance: '家电维修', painting: '墙面/油漆',
    carpentry: '木工/家具', roofing: '屋顶维修', cleaning: '深度清洁',
    other: '其他类型', default: '通用维修',
};
const urgencyBadge: Record<number, { label: string; color: string; border: string }> = {
    0: { label: 'LOW', color: 'text-[#8e8e93]', border: 'border-black/5' },
    1: { label: 'MID', color: 'text-[#007aff]', border: 'border-[#007aff]/10' },
    2: { label: 'URGENT', color: 'text-[#ff9500]', border: 'border-[#ff9500]/10' },
    3: { label: 'CRITICAL', color: 'text-[#ff3b30]', border: 'border-[#ff3b30]/10' },
};
const getUrgency = (score: number) => {
    if (score >= 8) return urgencyBadge[3];
    if (score >= 5) return urgencyBadge[2];
    if (score >= 2) return urgencyBadge[1];
    return urgencyBadge[0];
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

type TabType = 'available' | 'myJobs';

const WorkerDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tab, setTab] = useState<TabType>('available');
    const [available, setAvailable] = useState(true);
    const [orders, setOrders] = useState<AvailableOrder[]>([]);
    const [myJobs, setMyJobs] = useState<WorkerJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [workerId, setWorkerId] = useState<number | null>(null);
    const [simulatedOrder, setSimulatedOrder] = useState<AvailableOrder | null>(null);
    const enableDemoOrderPush = import.meta.env.DEV && import.meta.env.VITE_ENABLE_WORKER_PUSH_SIM === 'true';

    const [stats, setStats] = useState<WorkerDashboardStats>({
        earnings: 0,
        jobsCompleted: 0,
        rating: 5.0,
        activeJobs: 0
    });

    const fetchData = useCallback(async () => {
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
        } catch (err) {
            console.error('Failed to fetch worker data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!enableDemoOrderPush) return;
        const timer = setTimeout(() => {
            setSimulatedOrder({
                id: 999,
                title: 'CRITICAL: AC Unit Leaking Water',
                description: 'The unit is leaking significantly from the vent, damaging floors.',
                distance_km: 1.2,
                category: 'hvac',
                urgency_score: 8,
                created_at: new Date().toISOString(),
                user_name: 'Mr. Lee'
            });
        }, 8000);
        return () => clearTimeout(timer);
    }, [enableDemoOrderPush]);

    const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleAccept = async (orderId: string) => {
        setAccepting(orderId);
        try {
            await acceptJob(orderId);
            setNotification({ type: 'success', text: 'Order accepted! Routing...' });
            setTimeout(() => setNotification(null), 3000);
            await fetchData();
            setTimeout(() => setTab('myJobs'), 1000);
        } catch (err: any) {
            setNotification({ type: 'error', text: 'Acceptance failed. Please retry.' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setAccepting(null);
        }
    };

    const handleToggleAvailability = async () => {
        const newAvailable = !available;
        setAvailable(newAvailable);
        if (workerId) {
            try {
                await updateWorkerAvailability(workerId, newAvailable);
            } catch (err) {
                setAvailable(!newAvailable);
            }
        }
    };

    const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'matched');
    
    const statsData = [
        { icon: 'payments', label: 'EARNINGS', value: `¥${stats.earnings.toFixed(0)}`, accent: '#28cd41' },
        { icon: 'task_alt', label: 'COMPLETED', value: stats.jobsCompleted, accent: '#007aff' },
        { icon: 'star', label: 'RATING', value: stats.rating.toFixed(1), accent: '#ff9500' },
        { icon: 'hourglass_empty', label: 'ACTIVE', value: activeJobs.length, accent: '#af52de' },
    ];

    return (
        <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0071e3]/10 pb-32">
            {/* Apple Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-[#007aff]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#5856d6]/5 blur-[120px]" />
            </div>

            {/* Header: Service Worker Identity */}
            <header className="sticky top-0 z-50 apple-glass border-b border-black/5 px-6 py-5">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 shadow-sm flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#1d1d1f] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                        </div>
                        <div>
                             <h1 className="text-[17px] font-black tracking-tight">{user?.name || 'Pro Worker'}</h1>
                             <div className="flex items-center gap-1.5 mt-0.5">
                                 <div className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-[#28cd41] animate-pulse' : 'bg-[#ff3b30]'}`} />
                                 <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{available ? 'Receiving Leads' : 'Standby Mode'}</span>
                             </div>
                        </div>
                    </div>
                    {/* Apple Duty Toggle */}
                    <button 
                        onClick={handleToggleAvailability}
                        className={`group relative h-10 px-6 rounded-full font-black text-[11px] tracking-widest uppercase transition-all flex items-center gap-2 ${available ? 'bg-[#1d1d1f] text-white shadow-xl shadow-black/10' : 'bg-white border border-black/10 text-[#1d1d1f]'}`}
                    >
                        <span className="material-symbols-outlined text-sm font-black">{available ? 'notifications_active' : 'notifications_off'}</span>
                        {available ? 'On Duty' : 'Go Online'}
                    </button>
                </div>
            </header>

            {/* Performance Ledger (Stats Grid) */}
            <section className="px-6 pt-8 pb-4 max-w-lg mx-auto">
                 <div className="grid grid-cols-2 gap-3 stagger-item">
                     {statsData.map((s, i) => (
                         <div key={i} className="aegis-card p-5 bg-white border border-black/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                             <div>
                                <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-1 block">{s.label}</span>
                                <span className="text-2xl font-black tracking-tighter tabular-nums">{s.value}</span>
                             </div>
                             <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: `${s.accent}15` }}>
                                <span className="material-symbols-outlined text-lg" style={{ color: s.accent, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                             </div>
                         </div>
                     ))}
                 </div>
            </section>

            {/* Operations Console (Tabs) */}
            <div className="px-6 py-4 max-w-lg mx-auto stagger-item">
                 <div className="p-1.5 apple-glass bg-white/40 ring-1 ring-black/5 rounded-2xl flex gap-1">
                     <button 
                        onClick={() => setTab('available')}
                        className={`flex-1 h-11 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === 'available' ? 'bg-[#1d1d1f] text-white shadow-lg' : 'text-[#86868b] hover:bg-black/5'}`}
                     >
                         <span className="material-symbols-outlined text-lg">grid_view</span>
                         LEADS ({orders.length})
                     </button>
                     <button 
                        onClick={() => setTab('myJobs')}
                        className={`flex-1 h-11 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === 'myJobs' ? 'bg-[#1d1d1f] text-white shadow-lg' : 'text-[#86868b] hover:bg-black/5'}`}
                     >
                         <span className="material-symbols-outlined text-lg">assignment</span>
                         JOBS ({myJobs.length})
                     </button>
                 </div>
            </div>

            {/* Main Operational View */}
            <main className="px-6 max-w-lg mx-auto">
                {notification && (
                    <div className="mb-6 p-4 apple-glass border border-black/5 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-black/5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-[#28cd41]/10 text-[#28cd41]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>
                            <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
                        </div>
                        <span className="text-[14px] font-bold text-[#1d1d1f]">{notification.text}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                         <div className="w-8 h-8 border-[3px] border-[#1d1d1f]/10 border-t-[#1d1d1f] rounded-full animate-spin mb-4" />
                         <span className="text-[11px] font-black uppercase tracking-widest">Hydrating Dashboard...</span>
                    </div>
                ) : tab === 'available' ? (
                    <div className="flex flex-col gap-4 stagger-item">
                        {orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 rounded-[28px] bg-white border border-black/5 shadow-sm flex items-center justify-center mb-6">
                                     <span className="material-symbols-outlined text-4xl text-[#d2d2d7]">radar</span>
                                </div>
                                <h3 className="text-xl font-black tracking-tight mb-2">Scanning for Leads...</h3>
                                <p className="text-[14px] font-bold text-[#86868b] max-w-[240px]">No new repair requests in your immediate vicinity. We'll notify you when one appears.</p>
                            </div>
                        ) : (
                            orders.map(order => {
                                const cat = order.category || 'default';
                                const urg = getUrgency(order.urgency_score || 0);
                                return (
                                    <div key={order.id} className="aegis-card bg-white border border-black/5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden relative group">
                                        <div className="p-6">
                                            {/* Order Identity */}
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColor[cat]} flex items-center justify-center shadow-lg shadow-black/5`}>
                                                        <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                            {categoryIcon[cat]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{categoryLabel[cat]}</span>
                                                        <span className="text-[10px] text-[#d2d2d7] ml-2 font-bold">{timeAgo(order.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${urg.border} ${urg.color}`}>
                                                    {urg.label}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black tracking-tight leading-tight mb-2 group-hover:text-[#007aff] transition-colors">{order.title}</h3>
                                            <p className="text-[14px] font-medium text-[#86868b] leading-relaxed mb-6 line-clamp-2">{order.description}</p>

                                            <div className="flex items-center justify-between pt-5 border-t border-black/5">
                                                 <div className="flex items-center gap-4">
                                                     <div className="flex items-center gap-1.5">
                                                         <span className="material-symbols-outlined text-[18px] text-[#007aff]">near_me</span>
                                                         <span className="text-[14px] font-black tabular-nums">{order.distance_km} km</span>
                                                     </div>
                                                     <div className="flex items-center gap-1.5">
                                                         <span className="material-symbols-outlined text-[18px] text-[#28cd41]">payments</span>
                                                         <span className="text-[14px] font-black tabular-nums">¥{Math.floor(80 + (order.urgency_score || 0) * 30)}+</span>
                                                     </div>
                                                 </div>
                                                 <span className="text-[12px] font-bold text-[#86868b] opacity-40">{order.user_name}</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleAccept(String(order.id))}
                                            disabled={accepting === String(order.id)}
                                            className="w-full h-14 bg-[#1d1d1f] hover:bg-black text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-colors disabled:opacity-40"
                                        >
                                            {accepting === String(order.id) ? (
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[20px]">flash_on</span>
                                                    Claim This Lead
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
                                 <p className="text-[14px] font-black uppercase tracking-widest">No Active Job Tickets</p>
                             </div>
                        ) : (
                            myJobs.map(job => (
                                <button 
                                    key={job.id}
                                    onClick={() => navigate(`/worker/job/${job.id}`)}
                                    className="aegis-card p-6 bg-white border border-black/5 shadow-sm text-left hover:shadow-xl hover:-translate-y-1 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                         <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${job.status === 'in_progress' ? 'bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20' : 'bg-[#ff9500]/10 text-[#ff9500] border border-[#ff9500]/20'}`}>
                                             {job.status === 'in_progress' ? 'Processing' : 'Assigned'}
                                         </div>
                                         <span className="text-[11px] font-black text-[#d2d2d7]">TICKET #{job.id}</span>
                                    </div>
                                    <h3 className="text-[17px] font-black tracking-tight mb-2 group-hover:text-[#007aff] transition-colors">{job.title}</h3>
                                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/5">
                                         <span className="text-[12px] font-bold text-[#86868b]">{job.user_name}</span>
                                         <span className="material-symbols-outlined text-[#d2d2d7] transition-transform group-hover:translate-x-1">chevron_right</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Apple Floating Nav Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] p-6 pointer-events-none">
                 <div className="max-w-md mx-auto apple-glass bg-white/80 ring-1 ring-black/10 rounded-[28px] shadow-2xl p-2 flex items-center justify-around pointer-events-auto">
                     {[
                        { icon: 'grid_view', label: 'LEADS', path: '/worker/dashboard', active: tab === 'available' },
                        { icon: 'receipt_long', label: 'HISTORY', onClick: () => setTab('myJobs'), active: tab === 'myJobs' },
                        { icon: 'notifications', label: 'ALERTS', path: '/notifications' },
                        { icon: 'account_circle', label: 'PROFILE', path: '/profile' },
                     ].map((item, i) => (
                        <button 
                            key={i}
                            onClick={item.onClick || (() => item.path && navigate(item.path))}
                            className="flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative group"
                        >
                            <span className={`material-symbols-outlined text-[24px] transition-all ${item.active ? 'text-[#007aff]' : 'text-[#86868b] opacity-40 group-hover:opacity-100'}`} style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                {item.icon}
                            </span>
                            <span className={`text-[9px] font-black tracking-widest mt-1 ${item.active ? 'text-[#007aff]' : 'text-[#86868b] opacity-40 group-hover:opacity-100'}`}>
                                {item.label}
                            </span>
                            {item.active && <div className="absolute -top-1 w-1 h-1 bg-[#007aff] rounded-full shadow-[0_0_8px_#007aff]" />}
                        </button>
                     ))}
                 </div>
            </nav>

            {/* Order Push Simulation Modal */}
            {simulatedOrder && (
                <OrderPushModal
                    order={simulatedOrder}
                    onAccept={(id) => {
                        handleAccept(id);
                        setSimulatedOrder(null);
                    }}
                    onDecline={() => setSimulatedOrder(null)}
                />
            )}
        </div>
    );
};

export default WorkerDashboardPage;
