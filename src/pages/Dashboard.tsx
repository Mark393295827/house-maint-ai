import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import BottomNav from '../components/BottomNav';
import { useState, useEffect, useRef } from 'react';
import { getCases, getActiveCases, getArchivedCases } from '../store/cases';

function useCountUp(target: number, duration = 650) {
    const [count, setCount] = useState(0);
    const rafRef = useRef<number>(0);
    useEffect(() => {
        let start: number | null = null;
        const step = (ts: number) => {
            if (!start) start = ts;
            const pct = Math.min((ts - start) / duration, 1);
            setCount(Math.round(pct * target));
            if (pct < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);
    return count;
}

const Dashboard = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();

    /* ─── Shared store ─── */
    const allCases = getCases();
    const activeCaseData = getActiveCases();
    const archivedCount = getArchivedCases().length;
    const monthCount = allCases.filter(c => c.date?.startsWith('2026-02')).length;

    const liveActive = useCountUp(activeCaseData.length);
    const liveDone = useCountUp(archivedCount);
    const liveMth = useCountUp(monthCount);

    /* ─── Re-map to display format ─── */
    const activeCases = activeCaseData.map(c => ({
        id: c.id, title: locale === 'zh' ? c.title : c.titleEn,
        status: `Step ${c.step}/8`,
        step: c.step, severity: c.severity, date: c.date,
    }));
    const completedCases = getArchivedCases().map(c => ({
        id: c.id, title: locale === 'zh' ? c.title : c.titleEn,
        date: c.date, category: c.category || '',
    }));
    const todoItems = [
        { id: 1, text: locale === 'zh' ? '检查厨房水管密封修复效果' : 'Verify kitchen pipe seal repair', due: locale === 'zh' ? '明天' : 'Tomorrow', type: 'check' },
        { id: 2, text: locale === 'zh' ? '购买空调清洗剂' : 'Buy AC cleaning solution', due: locale === 'zh' ? '本周' : 'This week', type: 'do' },
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* ─── Header ─── */}
            <div className="px-5 pt-6 pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-text-main-light dark:text-text-main-dark font-display">
                            {locale === 'zh' ? '🏠 家维助手' : '🏠 HomeMaint'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{locale === 'zh' ? '智能家居维护管理' : 'Smart Home Maintenance'}</p>
                    </div>
                    <button onClick={() => navigate('/notifications')} className="relative w-10 h-10 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">notifications</span>
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">2</div>
                    </button>
                </div>
            </div>

            {/* ─── Live Stats Strip ─── */}
            <section className="px-5 mb-4">
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: locale === 'zh' ? '进行中' : 'Active', value: liveActive, color: 'text-primary', bg: 'bg-primary/8 dark:bg-primary/15' },
                        { label: locale === 'zh' ? '已完成' : 'Done', value: liveDone, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: locale === 'zh' ? '本月新建' : 'This Month', value: liveMth, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    ].map((s, i) => (
                        <div key={i} className={`flex flex-col items-center py-3 rounded-2xl ${s.bg}`}>
                            <span className={`text-2xl font-extrabold tabular-nums ${s.color}`}>{s.value}</span>
                            <span className="text-[10px] text-gray-500 mt-0.5 font-medium">{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── 1. New Report CTA ─── */}
            <section className="px-5 mb-4">
                <button onClick={() => navigate('/diagnosis')} className="relative overflow-hidden w-full rounded-2xl p-5 active:scale-[0.98] transition-transform group" style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
                        </div>
                        <div className="flex flex-col text-left flex-1">
                            <span className="text-white font-extrabold text-lg font-display">{locale === 'zh' ? '新建报修' : 'New Report'}</span>
                            <span className="text-white/70 text-sm">{locale === 'zh' ? '拍照 · 视频 · 语音 → AI诊断' : 'Photo · Video · Voice → AI Diagnosis'}</span>
                        </div>
                        <span className="material-symbols-outlined text-white/60 text-2xl">arrow_forward</span>
                    </div>
                </button>
            </section>

            {/* ─── Differentiating Highlights Strip ─── */}
            <section className="px-5 mb-4">
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { icon: 'add_a_photo', metric: '30s', label: locale === 'zh' ? '极速诊断' : 'Photo Diagnosis', color: 'from-indigo-500 to-violet-500', path: '/diagnosis' },
                        { icon: 'timeline', metric: '全程', label: locale === 'zh' ? '可追溯' : 'Full Trace', color: 'from-cyan-500 to-teal-500', path: '/cases' },
                        { icon: 'verified_user', metric: '防', label: locale === 'zh' ? '复发机制' : 'Anti-Relapse', color: 'from-emerald-500 to-green-500', path: '/library' },
                        { icon: 'videocam', metric: 'Live', label: locale === 'zh' ? '远程巡检' : 'Remote Inspect', color: 'from-rose-500 to-pink-500', path: '/remote' },
                    ].map((h, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(h.path)}
                            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 active:scale-[0.97] transition-transform text-left"
                        >
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center flex-shrink-0`}>
                                <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{h.icon}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-extrabold text-primary">{h.metric}</p>
                                <p className="text-[10px] text-gray-500 leading-tight truncate">{h.label}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* ─── Remote Inspection Teaser ─── */}
            <section className="px-5 mb-4">
                <div
                    className="relative overflow-hidden rounded-2xl p-4 border border-rose-200 dark:border-rose-800"
                    style={{ background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)', }}
                >
                    {/* Dark mode override */}
                    <style>{`.dark .remote-card { background: linear-gradient(135deg, #3f0d12, #500d1b); }`}</style>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/30">
                            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-extrabold text-sm text-rose-700 dark:text-rose-300">
                                    {locale === 'zh' ? '远程实时巡检' : 'Live Remote Inspection'}
                                </p>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                                    {locale === 'zh' ? '即将上线' : 'Coming Soon'}
                                </span>
                            </div>
                            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 leading-snug">
                                {locale === 'zh'
                                    ? '工程师远程视频接入，Gemini 实时标注问题区域'
                                    : 'Engineers join via video, Gemini marks problem areas in real-time'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <div className="flex-1 h-8 px-3 rounded-xl bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
                            {locale === 'zh' ? '上线通知' : 'Notify Me'}
                        </div>
                        <div className="flex items-center gap-1 px-3 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
                            <span className="material-symbols-outlined text-xs">info</span>
                            {locale === 'zh' ? '了解更多' : 'Learn More'}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── 2. My Cases (进行中 / 已完成) ─── */}
            <section className="px-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-text-main-light dark:text-text-main-dark">
                        📋 {locale === 'zh' ? '我的案例' : 'My Cases'}
                    </h2>
                    <button onClick={() => navigate('/cases')} className="text-xs text-primary font-medium">{locale === 'zh' ? '查看全部' : 'View All'}</button>
                </div>
                {/* Active cases */}
                <div className="space-y-2 mb-3">
                    {activeCases.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-transform">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1", color: c.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>warning</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-text-main-light dark:text-text-main-dark truncate">{c.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Step {c.step}/8</span>
                                    <span className="text-[10px] text-gray-400">{c.status}</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400">{c.date}</span>
                        </div>
                    ))}
                </div>
                {/* Completed cases mini */}
                {completedCases.length > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <span className="material-symbols-outlined text-emerald-600 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">{completedCases.length} {locale === 'zh' ? '个已完成案例' : 'completed'}</span>
                    </div>
                )}
            </section>

            {/* ─── 3. Case Library ─── */}
            <section className="px-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-text-main-light dark:text-text-main-dark">
                        📚 {locale === 'zh' ? '案例库' : 'Case Library'}
                    </h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { icon: 'plumbing', label: locale === 'zh' ? '管道' : 'Plumbing', count: 24, color: 'from-blue-500 to-cyan-500' },
                        { icon: 'bolt', label: locale === 'zh' ? '电气' : 'Electrical', count: 18, color: 'from-amber-500 to-orange-500' },
                        { icon: 'ac_unit', label: locale === 'zh' ? '暖通' : 'HVAC', count: 12, color: 'from-violet-500 to-purple-500' },
                    ].map((cat, i) => (
                        <button key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg`}>
                                <span className="material-symbols-outlined text-white">{cat.icon}</span>
                            </div>
                            <span className="text-xs font-bold text-text-main-light dark:text-text-main-dark">{cat.label}</span>
                            <span className="text-[10px] text-gray-400">{cat.count} {locale === 'zh' ? '案例' : 'cases'}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* ─── 4. Todo / PDCA Reminders ─── */}
            <section className="px-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-text-main-light dark:text-text-main-dark">
                        🔔 {locale === 'zh' ? '待办提醒' : 'Todo Reminders'}
                    </h2>
                </div>
                <div className="space-y-2">
                    {todoItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'check' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", color: item.type === 'check' ? '#10b981' : '#3b82f6' }}>
                                    {item.type === 'check' ? 'fact_check' : 'assignment'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark truncate">{item.text}</p>
                                <span className="text-[10px] text-gray-400">{item.due}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                        </div>
                    ))}
                </div>
            </section>

            <BottomNav />
        </div>
    );
};

export default Dashboard;
