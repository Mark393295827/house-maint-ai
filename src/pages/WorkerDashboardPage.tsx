import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableOrders, getMyWorkerJobs, acceptJob } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

/* ─── Category helpers ─── */
const categoryIcon: Record<string, string> = {
    plumbing: 'plumbing', electrical: 'bolt', hvac: 'ac_unit',
    structural: 'foundation', appliance: 'kitchen', painting: 'format_paint',
    default: 'home_repair_service',
};
const categoryColor: Record<string, string> = {
    plumbing: 'from-blue-500 to-cyan-500', electrical: 'from-amber-500 to-orange-500',
    hvac: 'from-violet-500 to-purple-500', structural: 'from-rose-500 to-red-500',
    appliance: 'from-emerald-500 to-green-500', painting: 'from-pink-500 to-fuchsia-500',
    default: 'from-gray-500 to-gray-600',
};
const categoryLabel: Record<string, string> = {
    plumbing: '管道', electrical: '电气', hvac: '暖通',
    structural: '结构', appliance: '家电', painting: '油漆',
    default: '维修',
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
    const [orders, setOrders] = useState<any[]>([]);
    const [myJobs, setMyJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, jobsRes] = await Promise.all([
                getAvailableOrders(),
                getMyWorkerJobs(),
            ]);
            setOrders(ordersRes.orders || []);
            setMyJobs(jobsRes.jobs || []);
        } catch (err) {
            console.error('Failed to fetch worker data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAccept = async (orderId: string) => {
        setAccepting(orderId);
        try {
            await acceptJob(orderId);
            await fetchData();
            setTab('myJobs');
        } catch (err) {
            console.error('Failed to accept:', err);
        } finally {
            setAccepting(null);
        }
    };

    const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'matched');
    const completedJobs = myJobs.filter(j => j.status === 'completed');

    const statsData = [
        { icon: 'payments', label: '收入', value: `¥${(completedJobs.length * 150).toFixed(0)}`, color: 'text-data-green', border: 'rgba(0,255,135,0.15)', glow: 'rgba(0,255,135,0.08)' },
        { icon: 'task_alt', label: '已完成', value: completedJobs.length, color: 'text-neon-cyan', border: 'rgba(0,240,255,0.15)', glow: 'rgba(0,240,255,0.08)' },
        { icon: 'star', label: '评分', value: '4.9 ★', color: 'text-pit-amber', border: 'rgba(255,184,0,0.15)', glow: 'rgba(255,184,0,0.08)' },
        { icon: 'pending_actions', label: '进行中', value: activeJobs.length, color: 'text-primary-light', border: 'rgba(99,102,241,0.15)', glow: 'rgba(99,102,241,0.08)' },
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
                        onClick={() => setAvailable(!available)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 font-telemetry ${available
                            ? 'text-data-green border border-data-green/30'
                            : 'text-racing-red border border-racing-red/30'
                            }`}
                        style={{
                            background: available ? 'rgba(0,255,135,0.08)' : 'rgba(225,6,0,0.08)',
                            boxShadow: available
                                ? '0 0 15px rgba(0,255,135,0.15), inset 0 0 15px rgba(0,255,135,0.05)'
                                : '0 0 15px rgba(225,6,0,0.15), inset 0 0 15px rgba(225,6,0,0.05)',
                        }}
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${available ? 'bg-data-green shadow-lg shadow-data-green/50' : 'bg-racing-red shadow-lg shadow-racing-red/50'}`} />
                        {available ? '在线' : '离线'}
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
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.key
                                    ? 'bg-white dark:bg-surface-dark shadow-md text-primary'
                                    : 'text-gray-400 hover:text-gray-600'
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

                            {completedJobs.length > 0 && (
                                <>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mt-2">已完成 ({completedJobs.length})</h3>
                                    {completedJobs.map(job => (
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
        </div>
    );
};

export default WorkerDashboardPage;
