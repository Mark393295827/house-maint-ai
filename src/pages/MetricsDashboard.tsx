import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

/* ─── Types ─── */
interface InquiryMetric {
    caseId: string;
    projectType: string;
    area: string;
    severity: string;
    hasPhoto: boolean;
    timestamp: string;
}

interface FeedbackEntry {
    caseId: string;
    rating: number;
    demandAccuracy: number | null;
    tags: string[];
    comment?: string;
    timestamp: string;
}

/* ─── Helpers ─── */
const getMetrics = (): InquiryMetric[] => JSON.parse(localStorage.getItem('inquiry_metrics') || '[]');
const getFeedback = (): FeedbackEntry[] => JSON.parse(localStorage.getItem('inquiry_feedback') || '[]');

const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

const countBy = <T,>(arr: T[], fn: (item: T) => string): Record<string, number> => {
    const counts: Record<string, number> = {};
    arr.forEach(item => { const k = fn(item); counts[k] = (counts[k] || 0) + 1; });
    return counts;
};

/* ─── Apple Stat Card ─── */
const AppleStatCard: React.FC<{ icon: string; label: string; value: string | number; sub?: string; gradient: string }> = ({ icon, label, value, sub, gradient }) => (
    <div className="ent-card p-6 bg-white/60 hover:bg-white/80 transition-all duration-500">
        <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-black/5`}>
                <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <span className="text-[10px] font-black text-[#86868b] uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="text-4xl font-black text-black tracking-tighter tabular-nums">{value}</div>
        {sub && <p className="text-[11px] text-[#86868b] font-black mt-2 opacity-60 uppercase tracking-tight">{sub}</p>}
    </div>
);

/* ─── Detailed Progress Bar ─── */
const AppleProgressBar: React.FC<{ label: string; value: number; max: number; gradient: string }> = ({ label, value, max, gradient }) => {
    const { t } = useLanguage();
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="mb-6 last:mb-0">
            <div className="flex justify-between items-end mb-2.5">
                <span className="text-[11px] font-black text-black uppercase tracking-wider">{label}</span>
                <span className="text-[11px] font-black text-[#86868b] tabular-nums">{t('enterprise.metrics.units', { value })}</span>
            </div>
            <div className="h-2.5 bg-black/5 rounded-full overflow-hidden p-[1px] border border-white/20 shadow-inner">
                <div 
                    className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

/* ─── High-Precision Ring ─── */
const AppleRingGauge: React.FC<{ value: number; max: number; label: string; colors: [string, string] }> = ({ value, max, label, colors }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const r = 40, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
    const gradId = `ring-grad-${label.replace(/\s+/g, '-')}`;
    
    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width="120" height="120" className="-rotate-90 filter drop-shadow-sm">
                    <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="10" />
                    <circle cx="60" cy="60" r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth="10"
                        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                        className="transition-all duration-1000" />
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={colors[0]} />
                            <stop offset="100%" stopColor={colors[1]} />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[28px] font-black text-black tracking-tighter -mb-1">{value.toFixed(1)}</span>
                    <span className="text-[9px] font-black text-[#86868b] uppercase tracking-[0.1em]">{label}</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Dashboard ─── */
const MetricsDashboard: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const metrics = useMemo(getMetrics, []);
    const feedback = useMemo(getFeedback, []);

    const totalInquiries = metrics.length;
    const totalFeedbacks = feedback.length;
    const avgRating = avg(feedback.map(f => f.rating));
    const avgAccuracy = avg(feedback.filter(f => f.demandAccuracy !== null).map(f => f.demandAccuracy!));
    const photoRate = totalInquiries > 0 ? Math.round((metrics.filter(m => m.hasPhoto).length / totalInquiries) * 100) : 0;
    const conversionRate = totalInquiries > 0 ? Math.round((totalFeedbacks / totalInquiries) * 100) : 0;

    const typeCounts = countBy(metrics, m => m.projectType || 'Unknown');
    const areaCounts = countBy(metrics, m => m.area || 'Unknown');

    // Time series (last 7 days)
    const last7Days = useMemo(() => {
        const days: { label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = `${d.getMonth() + 1}/${d.getDate()}`;
            const count = metrics.filter(m => m.timestamp.startsWith(key)).length;
            days.push({ label, count });
        }
        return days;
    }, [metrics]);
    const maxDaily = Math.max(...last7Days.map(d => d.count), 1);

    return (
        <div className="min-h-screen bg-[var(--enterprise-bg)] page-enter">
            {/* Nav Header */}
            <div className="sticky top-0 z-30 ent-glass border-b border-black/5 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white border border-black/5 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                        <span className="material-symbols-outlined text-[20px] text-black">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-[17px] font-black text-black tracking-tight">{t('enterprise.metrics.title')}</h1>
                        <p className="text-[10px] font-black text-[#86868b] uppercase tracking-[0.2em]">{t('enterprise.metrics.subtitle')}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-5 py-2.5 bg-white border border-black/5 rounded-2xl text-[11px] font-black text-black flex items-center gap-2.5 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#28cd41] animate-pulse" />
                        {t('enterprise.metrics.systemLive')}
                    </div>
                </div>
            </div>

            <div className="p-8 lg:p-14 space-y-12 max-w-[1700px] mx-auto">
                {/* Row 1: Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <AppleStatCard 
                        icon="analytics" 
                        label={t('enterprise.metrics.inquiries')} 
                        value={totalInquiries}
                        sub={t('enterprise.metrics.totalSessions')} 
                        gradient="from-[#007aff] to-[#32ade6]"
                    />
                    <AppleStatCard 
                        icon="published_with_changes" 
                        label={t('enterprise.metrics.conversion')} 
                        value={`${conversionRate}%`}
                        sub={t('enterprise.metrics.dispatchLogic')} 
                        gradient="from-[#28cd41] to-[#34c759]"
                    />
                    <AppleStatCard 
                        icon="photo_camera" 
                        label={t('enterprise.metrics.photoRate')} 
                        value={`${photoRate}%`}
                        sub={t('enterprise.metrics.visualContext')} 
                        gradient="from-[#5856d6] to-[#af52de]"
                    />
                    <AppleStatCard 
                        icon="forum" 
                        label={t('enterprise.metrics.feedbacks')} 
                        value={totalFeedbacks}
                        sub={t('enterprise.metrics.voiceOfUser')} 
                        gradient="from-[#ff9500] to-[#ffcc00]"
                    />
                </div>

                {/* Row 2: Satisfaction & Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Satisfaction Ring */}
                    <div className="ent-card p-10 bg-white/60 ent-glass group flex flex-col items-center justify-center">
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.25em] mb-12 self-start">{t('enterprise.metrics.serviceQuality')}</p>
                        {totalFeedbacks > 0 ? (
                            <div className="flex justify-around w-full gap-10">
                                <AppleRingGauge value={avgRating} max={5} label={t('enterprise.metrics.rating')} colors={["#5856d6", "#007aff"]} />
                                <AppleRingGauge value={avgAccuracy} max={5} label={t('enterprise.metrics.precision')} colors={["#28cd41", "#34c759"]} />
                            </div>
                        ) : (
                            <div className="text-center py-12 opacity-30">
                                <span className="material-symbols-outlined text-[56px] mb-5">stars</span>
                                <p className="text-[13px] font-black uppercase tracking-widest">{t('enterprise.metrics.waitingForData')}</p>
                            </div>
                        )}
                    </div>

                    {/* Weekly Trend (Visual Column Chart) */}
                    <div className="ent-card p-10 bg-white/60 ent-glass lg:col-span-2">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.25em]">{t('enterprise.metrics.sessionVelocity')}</p>
                                <h3 className="text-2xl font-black text-black tracking-tighter mt-1.5">{t('enterprise.metrics.lastSevenDays')}</h3>
                            </div>
                        </div>
                        <div className="flex items-end gap-4 h-48 lg:h-72">
                            {last7Days.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4">
                                    <div className="w-full bg-black/5 rounded-2xl relative overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                                        <div 
                                            className="w-full bg-gradient-to-t from-[#007aff] to-[#32ade6] rounded-xl transition-all duration-1000 shadow-xl shadow-blue-500/10"
                                            style={{ height: `${Math.max((day.count / maxDaily) * 100, 3)}%` }}
                                        >
                                            <div className="absolute top-3 left-0 right-0 text-center">
                                                <span className="text-[11px] font-black text-white/90 tabular-nums">{day.count || ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-black text-[#86868b] uppercase tracking-tighter">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 3: Distributions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Distribution Alpha */}
                    <div className="ent-card p-10 bg-white/60 ent-glass">
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.25em] mb-12">{t('enterprise.metrics.workloadCategorization')}</p>
                        <div className="space-y-6">
                            {Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([key, val]) => (
                                <AppleProgressBar 
                                    key={key} 
                                    label={key} 
                                    value={val} 
                                    max={totalInquiries} 
                                    gradient="from-[#5856d6] to-[#007aff]" 
                                />
                            ))}
                        </div>
                    </div>

                    {/* Distribution Beta */}
                    <div className="ent-card p-10 bg-white/60 ent-glass">
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.25em] mb-12">{t('enterprise.metrics.regionalDensity')}</p>
                        <div className="space-y-6">
                            {Object.entries(areaCounts).sort((a,b) => b[1]-a[1]).map(([key, val]) => (
                                <AppleProgressBar 
                                    key={key} 
                                    label={key} 
                                    value={val} 
                                    max={totalInquiries} 
                                    gradient="from-[#28cd41] to-[#007aff]" 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Empty state fallback */}
                {totalInquiries === 0 && (
                    <div className="ent-card p-24 bg-white/60 ent-glass text-center flex flex-col items-center">
                        <div className="w-28 h-28 rounded-[40px] bg-white flex items-center justify-center mb-10 shadow-xl border border-black/5 ring-1 ring-black/5 transition-transform hover:scale-105">
                            <span className="material-symbols-outlined text-[56px] text-[#86868b] opacity-30">bar_chart_4_bars</span>
                        </div>
                        <h3 className="text-4xl font-black text-black tracking-tighter mb-5">{t('enterprise.metrics.emptyTitle')}</h3>
                        <p className="text-[16px] font-black text-[#86868b] max-w-sm mb-12 leading-relaxed">
                            {t('enterprise.metrics.emptyDesc')}
                        </p>
                        <button onClick={() => navigate('/diagnosis')}
                            className="px-12 py-5 bg-black text-white rounded-[24px] text-[14px] font-black uppercase tracking-widest hover:bg-zinc-900 transition-all active:scale-95 shadow-2xl shadow-black/20">
                            {t('enterprise.metrics.emptyAction')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricsDashboard;
