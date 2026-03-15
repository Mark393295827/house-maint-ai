import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableOrders, getMyWorkerJobs, acceptJob, getWorkerDashboard, updateWorkerAvailability } from '../services/api';
import type { AvailableOrder, WorkerJob, WorkerDashboardStats } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderPushModal from '../components/repair/OrderPushModal';

/* ─── Category helpers ─── */
const categoryIcon: Record<string, string> = {
    plumbing: 'plumbing', electrical: 'bolt', hvac: 'ac_unit',
    structural: 'foundation', appliance: 'kitchen', painting: 'format_paint',
    carpentry: 'carpentry', roofing: 'roofing', cleaning: 'cleaning_services',
    other: 'more_horiz', default: 'home_repair_service',
};
const categoryColor: Record<string, string> = {
    plumbing: 'from-blue-500 to-cyan-500', 
    electrical: 'from-amber-500 to-orange-500',
    hvac: 'from-violet-500 to-purple-500', 
    structural: 'from-rose-500 to-red-500',
    appliance: 'from-emerald-500 to-green-500', 
    painting: 'from-pink-500 to-fuchsia-500',
    carpentry: 'from-orange-600 to-amber-700',
    roofing: 'from-slate-600 to-slate-800',
    cleaning: 'from-cyan-400 to-blue-400',
    default: 'from-gray-500 to-gray-600',
};
const categoryLabel: Record<string, string> = {
    plumbing: '水工/管道', electrical: '电工/电路', hvac: '空调/暖通',
    structural: '房屋结构', appliance: '家电维修', painting: '墙面/油漆',
    carpentry: '木工/家具', roofing: '屋顶维修', cleaning: '深度清洁',
    other: '其他类型', default: '通用维修',
};
const urgencyBadge: Record<number, { label: string; color: string }> = {
    0: { label: '普通', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    1: { label: '一般', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    2: { label: '紧急', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    3: { label: '非常紧急', color: 'bg-red-50 text-red-600 border-red-200' },
};
const getUrgency = (score: number) => {
    if (score >= 8) return urgencyBadge[3];
    if (score >= 5) return urgencyBadge[2];
    if (score >= 2) return urgencyBadge[1];
    return urgencyBadge[0];
};

/* ─── Time ago helper ─── */
const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, jobsRes, dashboardRes] = await Promise.all([
                getAvailableOrders(),
                getMyWorkerJobs(),
                getWorkerDashboard().catch(() => ({ stats: null, worker: null })) // Fallback if no profile yet
            ]);
            setOrders(ordersRes.orders || []);
            setMyJobs(jobsRes.jobs || []);
            
            if (dashboardRes.stats) {
                setStats(dashboardRes.stats);
            }
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

    // Simulate an incoming order for UI demonstration
    useEffect(() => {
        const timer = setTimeout(() => {
            setSimulatedOrder({
                id: 999,
                title: '紧急维修: 客厅空调漏水',
                description: '客厅空调出风口严重漏水，地板已被打湿，需要紧急处理。',
                distance_km: 1.2,
                category: 'hvac',
                urgency_score: 8,
                created_at: new Date().toISOString(),
                user_name: '李先生'
            });
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleAccept = async (orderId: string) => {
        setAccepting(orderId);
        try {
            await acceptJob(orderId);
            setNotification({ type: 'success', text: '订单接取成功！正在转到我的工单...' });
            setTimeout(() => setNotification(null), 3000);
            await fetchData();
            setTimeout(() => setTab('myJobs'), 1000);
        } catch (err: any) {
            console.error('Failed to accept:', err);
            setNotification({ type: 'error', text: err.message || '接单失败，请稍后重试' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setAccepting(null);
        }
    };

    const [stats, setStats] = useState<WorkerDashboardStats>({
        earnings: 0,
        jobsCompleted: 0,
        rating: 5.0,
        activeJobs: 0
    });

    const handleToggleAvailability = async () => {
        const newAvailable = !available;
        setAvailable(newAvailable);
        if (workerId) {
            try {
                await updateWorkerAvailability(workerId, newAvailable);
            } catch (err) {
                console.error('Failed to update availability:', err);
                setAvailable(!newAvailable); // Revert on error
            }
        }
    };

    const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'matched');
    
    const statsData = [
        { icon: 'payments', label: '收入', value: `¥${stats.earnings.toFixed(0)}`, color: 'text-data-green', border: 'rgba(0,255,135,0.15)', glow: 'rgba(0,255,135,0.08)' },
        { icon: 'task_alt', label: '已完成', value: stats.jobsCompleted, color: 'text-neon-cyan', border: 'rgba(0,240,255,0.15)', glow: 'rgba(0,240,255,0.08)' },
        { icon: 'star', label: '评分', value: `${stats.rating.toFixed(1)} ★`, color: 'text-pit-amber', border: 'rgba(255,184,0,0.15)', glow: 'rgba(255,184,0,0.08)' },
        { icon: 'pending_actions', label: '进行中', value: activeJobs.length || stats.activeJobs, color: 'text-primary-light', border: 'rgba(99,102,241,0.15)', glow: 'rgba(99,102,241,0.08)' },
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* ── Header ── */}
            <div className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-6 pb-3 carbon-fiber">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-text-main-light dark:text-text-main-dark font-display tracking-tight">
                            🔧 工人工作台
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`live-dot ${!available ? 'live-dot-red' : ''}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-wider font-telemetry ${available ? 'text-data-green' : 'text-racing-red'}`}>
                                {available ? 'ON DUTY' : 'OFF DUTY'}
                            </span>
                            <span className="text-[10px] text-gray-400">· {user?.name || '工人'}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleAvailability}
                        className={`flex items-center gap-2 px-6 h-10 rounded-2xl text-xs font-black transition-all duration-300 font-telemetry press-scale ${available
                            ? 'text-data-green border border-data-green/30 bg-data-green/10 shadow-[0_0_20px_rgba(0,255,135,0.15)]'
                            : 'text-racing-red border border-racing-red/30 bg-racing-red/10 shadow-[0_0_20px_rgba(225,6,0,0.15)]'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${available ? 'bg-data-green animate-pulse shadow-[0_0_8px_#00FF87]' : 'bg-racing-red animate-pulse shadow-[0_0_8px_#E10600]'}`} />
                        {available ? 'ON DUTY' : 'OFF DUTY'}
                    </button>
                </div>
            </div>

            {/* ── Stats Strip ── */}
            <section className="px-5 pt-3 pb-2">
                <div className="grid grid-cols-4 gap-2">
                    {statsData.map(s => (
                        <div key={s.label} className="flex flex-col items-center py-3 rounded-2xl bg-white dark:bg-surface-dark"
                            style={{ border: `1px solid ${s.border}`, boxShadow: `0 4px 20px ${s.glow}` }}>
                            <span className={`material-symbols-outlined text-base ${s.color}`}>{s.icon}</span>
                            <span className={`text-lg font-extrabold font-telemetry ${s.color}`}>{s.value}</span>
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Tabs ── */}
            <div className="px-5 pt-2">
                <div className="flex bg-gray-100 dark:bg-white/5 rounded-2xl p-1">
                    {([
                        { key: 'available' as TabType, label: `接单大厅 (${orders.length})`, icon: 'list_alt' },
                        { key: 'myJobs' as TabType, label: `我的工单 (${myJobs.length})`, icon: 'assignment' },
                    ]).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 press-scale ${tab === t.key
                                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-primary shadow-lg shadow-primary/10'
                                    : 'text-gray-400 hover:text-gray-500 hover:bg-white/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <main className="flex-1 px-5 pt-3 pb-4">
                {notification && (
                    <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                        notification.type === 'success' 
                            ? 'bg-data-green/10 border border-data-green/20 text-data-green' 
                            : 'bg-racing-red/10 border border-racing-red/20 text-racing-red'
                    }`}>
                        <span className="material-symbols-outlined">
                            {notification.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span className="text-sm font-bold">{notification.text}</span>
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center py-12"><LoadingSpinner /></div>
                ) : tab === 'available' ? (
                    /* ── Available Orders ── */
                    orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-primary/40">search_off</span>
                            </div>
                            <p className="text-lg font-bold text-text-main-light dark:text-text-main-dark mb-1">暂无可接订单</p>
                            <p className="text-sm text-gray-400">附近没有新的报修请求，稍后再来看看</p>
                            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold text-sm rounded-xl flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">refresh</span> 刷新
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {orders.map(order => {
                                const cat = order.category || 'default';
                                const urg = getUrgency(order.urgency_score || 0);
                                return (
                                    <div key={order.id}
                                        className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-all active:scale-[0.98]"
                                    >
                                        {/* Top row: category + urgency + time */}
                                        <div className="p-4 pb-3">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${categoryColor[cat] || categoryColor.default} flex items-center justify-center shadow-lg`}>
                                                        <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                            {categoryIcon[cat] || categoryIcon.default}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                            {categoryLabel[cat] || '维修'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300 mx-1">·</span>
                                                        <span className="text-[10px] text-gray-400">{timeAgo(order.created_at)}</span>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urg.color}`}>
                                                    {urg.label}
                                                </span>
                                            </div>

                                            {/* Title + Description */}
                                            <h3 className="text-[15px] font-black text-text-main-light dark:text-text-main-dark leading-tight mb-1 line-clamp-1">
                                                {order.title || '维修报修'}
                                            </h3>
                                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark line-clamp-2 leading-relaxed">
                                                {order.description || '暂无描述'}
                                            </p>

                                            {/* Distance + Price */}
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                                    <span className="text-sm font-bold text-primary">
                                                        {order.distance_km !== null ? `${order.distance_km} km` : '距离未知'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm text-data-green" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                                                    <span className="text-sm font-bold text-data-green">
                                                        ¥{Math.floor(80 + (order.urgency_score || 0) * 30)}~{Math.floor(150 + (order.urgency_score || 0) * 50)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 ml-auto">
                                                    <span className="material-symbols-outlined text-sm text-gray-400">person</span>
                                                    <span className="text-xs text-gray-400">{order.user_name || '用户'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Accept Button */}
                                        <button
                                            onClick={() => handleAccept(String(order.id))}
                                            disabled={accepting === String(order.id)}
                                            className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                                        >
                                            {accepting === String(order.id) ? (
                                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 接单中...</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-lg">handshake</span> 立即接单</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    /* ── My Jobs ── */
                    myJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-primary/40">assignment</span>
                            </div>
                            <p className="text-lg font-bold text-text-main-light dark:text-text-main-dark mb-1">还没有工单</p>
                            <p className="text-sm text-gray-400">去接单大厅看看有没有适合你的订单</p>
                            <button onClick={() => setTab('available')} className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold text-sm rounded-xl">
                                去看看 →
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {activeJobs.length > 0 && (
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">进行中 ({activeJobs.length})</h3>
                            )}
                            {activeJobs.map(job => (
                                <button key={job.id}
                                    onClick={() => navigate(`/worker/job/${job.id}`)}
                                    className="w-full bg-white dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm text-left hover:shadow-md transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${job.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {job.status === 'in_progress' ? '施工中' : '待接单'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">#{job.id}</span>
                                    </div>
                                    <h3 className="font-bold text-text-main-light dark:text-text-main-dark text-sm mb-1">
                                        {job.title || '维修工单'}
                                    </h3>
                                    <p className="text-xs text-gray-400 line-clamp-1">{job.description || '暂无描述'}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-gray-400">{job.user_name || '用户'}</span>
                                        <span className="text-xs text-primary font-bold flex items-center gap-0.5">
                                            详情 <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                        </span>
                                    </div>
                                </button>
                            ))}

                            {myJobs.filter(j => j.status === 'completed').length > 0 && (
                                <>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mt-2">已完成 ({myJobs.filter(j => j.status === 'completed').length})</h3>
                                    {myJobs.filter(j => j.status === 'completed').map((job: any) => (
                                        <button key={job.id}
                                            onClick={() => navigate(`/worker/job/${job.id}`)}
                                            className="w-full bg-white dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm text-left opacity-70"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600">已完工</span>
                                                <span className="text-[10px] text-gray-400">#{job.id}</span>
                                            </div>
                                            <h3 className="font-bold text-text-main-light dark:text-text-main-dark text-sm">{job.title || '维修工单'}</h3>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )
                )}
            </main>

            {/* ── Worker Bottom Nav ── */}
            <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 pb-safe-bottom"
                style={{
                    background: 'rgba(8,10,18,0.85)',
                    backdropFilter: 'blur(28px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(140%)',
                    borderTop: '1px solid rgba(99,102,241,0.1)',
                }}
            >
                <div className="flex items-center justify-around h-[72px] px-1">
                    {[
                        { icon: 'list_alt', label: '接单', path: '/worker/dashboard', active: true },
                        { icon: 'assignment', label: '工单', onClick: () => setTab('myJobs') },
                        { icon: 'notifications', label: '消息', path: '/notifications' },
                        { icon: 'person', label: '我的', path: '/profile' },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={item.onClick || (() => item.path && navigate(item.path))}
                            className="flex flex-col items-center justify-center w-full h-full gap-1"
                        >
                            <span className={`material-symbols-outlined text-[22px] ${item.active ? 'text-primary' : 'text-gray-500'}`}
                                style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >{item.icon}</span>
                            <span className={`text-[10px] ${item.active ? 'font-bold text-primary' : 'text-gray-500'}`}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── Order Push Simulation Modal ── */}
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
