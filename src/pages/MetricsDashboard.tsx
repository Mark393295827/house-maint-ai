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
const AppleStatCard: React.FC<{ icon: string; label: string; value: string | number; sub?: string; color: string; gradient: string }> = ({ icon, label, value, sub, color, gradient }) => (
    <div className="aegis-card p-6 bg-white/60 hover:bg-white/80 transition-all duration-500">
        <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-black/5`}>
                <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <span className="text-[10px] font-black text-[#86868b] uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="text-4xl font-black text-[#1d1d1f] tracking-tighter tabular-nums">{value}</div>
        {sub && <p className="text-[11px] text-[#86868b] font-bold mt-2 opacity-60 uppercase tracking-tight">{sub}</p>}
    </div>
);

/* ─── Detailed Progress Bar ─── */
const AppleProgressBar: React.FC<{ label: string; value: number; max: number; gradient: string }> = ({ label, value, max, gradient }) => {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="mb-6 last:mb-0">
            <div className="flex justify-between items-end mb-2.5">
                <span className="text-[11px] font-black text-[#1d1d1f] uppercase tracking-wider">{label}</span>
                <span className="text-[11px] font-black text-[#86868b] tabular-nums">{value} UNITS</span>
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
                    <span className="text-[28px] font-black text-[#1d1d1f] tracking-tighter -mb-1">{value.toFixed(1)}</span>
                    <span className="text-[9px] font-black text-[#86868b] uppercase tracking-[0.1em]">{label}</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Dashboard ─── */
const MetricsDashboard: React.FC = () => {
    const { locale, t } = useLanguage();
    const navigate = useNavigate();
    const isZh = locale === 'zh';

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
    const severityCounts = countBy(metrics, m => m.severity || 'moderate');
    const tagCounts = countBy(feedback.flatMap(f => f.tags.map(t => ({ tag: t }))), x => x.tag);

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
        <div className="min-h-screen bg-[#f5f5f7] page-enter">
            {/* Nav Header */}
            <div className="sticky top-0 z-30 apple-glass border-b border-white/20 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/20 border border-black/5 rounded-2xl hover:bg-white/40 transition-all press-scale">
                        <span className="material-symbols-outlined text-[20px] text-[#1d1d1f]">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-[15px] font-black text-[#1d1d1f] tracking-tight">{isZh ? '运营数据看板' : 'Metrics Dashboard'}</h1>
                        <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">{isZh ? '实时分析报告' : 'Real-time Analytics'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-2 bg-white/40 border border-black/5 rounded-xl text-[11px] font-black text-[#1d1d1f] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#28cd41] animate-pulse" />
                        LIVE
                    </div>
                </div>
            </div>

            <div className="p-8 lg:p-14 space-y-10 max-w-[1600px] mx-auto">
                {/* Row 1: Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AppleStatCard 
                        icon="analytics" 
                        label={isZh ? '总咨询' : 'Inquiries'} 
                        value={totalInquiries}
                        sub={isZh ? '累计对话数量' : 'Total Sessions'} 
                        gradient="from-[#007aff] to-[#32ade6]"
                        color="[#007aff]"
                    />
                    <AppleStatCard 
                        icon="published_with_changes" 
                        label={isZh ? '转化率' : 'Conversion'} 
                        value={`${conversionRate}%`}
                        sub={isZh ? '工单转换效能' : 'Dispatch Logic'} 
                        gradient="from-[#28cd41] to-[#34c759]"
                        color="[#28cd41]"
                    />
                    <AppleStatCard 
                        icon="photo_camera" 
                        label={isZh ? '拍照率' : 'Photo Rate'} 
                        value={`${photoRate}%`}
                        sub={isZh ? '视觉诊断占比' : 'Visual Context'} 
                        gradient="from-[#5856d6] to-[#af52de]"
                        color="[#5856d6]"
                    />
                    <AppleStatCard 
                        icon="forum" 
                        label={isZh ? '反馈数' : 'Feedbacks'} 
                        value={totalFeedbacks}
                        sub={isZh ? '用户评价采集' : 'Voice of User'} 
                        gradient="from-[#ff9500] to-[#ffcc00]"
                        color="[#ff9500]"
                    />
                </div>

                {/* Row 2: Satisfaction & Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Satisfaction Ring */}
                    <div className="aegis-card p-10 bg-white group flex flex-col items-center justify-center">
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.2em] mb-10 self-start">{isZh ? '用户满意度' : 'Service Quality'}</p>
                        {totalFeedbacks > 0 ? (
                            <div className="flex justify-around w-full gap-8">
                                <AppleRingGauge value={avgRating} max={5} label={isZh ? '满意度' : 'Rating'} colors={["#5856d6", "#007aff"]} />
                                <AppleRingGauge value={avgAccuracy} max={5} label={isZh ? '准确度' : 'Precision'} colors={["#28cd41", "#34c759"]} />
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-30">
                                <span className="material-symbols-outlined text-[48px] mb-4">stars</span>
                                <p className="text-[12px] font-bold">Waiting for Review Data</p>
                            </div>
                        )}
                    </div>

                    {/* Weekly Trend (Visual Column Chart) */}
                    <div className="aegis-card p-10 bg-white lg:col-span-2">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.2em]">{isZh ? '咨询量趋势' : 'Session Velocity'}</p>
                                <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tight mt-1">Last 7 Operating Days</h3>
                            </div>
                        </div>
                        <div className="flex items-end gap-3 h-48 lg:h-64">
                            {last7Days.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                    <div className="w-full bg-[#f5f5f7] rounded-2xl relative overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                                        <div 
                                            className="w-full bg-gradient-to-t from-[#007aff] to-[#32ade6] rounded-xl transition-all duration-1000 shadow-lg shadow-blue-500/10"
                                            style={{ height: `${Math.max((day.count / maxDaily) * 100, 2)}%` }}
                                        >
                                            <div className="absolute top-2 left-0 right-0 text-center">
                                                <span className="text-[10px] font-black text-white/80 tabular-nums">{day.count || ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-[#86868b] uppercase">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 3: Distributions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Distribution Alpha */}
                    <div className="aegis-card p-10 bg-white">
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.2em] mb-10">{isZh ? '项目类型分布' : 'Workload Categorization'}</p>
                        <div className="space-y-4">
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
                    <div className="aegis-card p-10 bg-white">
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-[0.2em] mb-10">{isZh ? '区域分布' : 'Regional Density'}</p>
                        <div className="space-y-4">
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
                    <div className="aegis-card p-20 bg-white text-center flex flex-col items-center">
                        <div className="w-24 h-24 rounded-[32px] bg-[#f5f5f7] flex items-center justify-center mb-8 shadow-inner border border-white">
                            <span className="material-symbols-outlined text-[48px] text-[#86868b] opacity-20">bar_chart_4_bars</span>
                        </div>
                        <h3 className="text-3xl font-black text-[#1d1d1f] tracking-tighter mb-4">{isZh ? '暂无分析数据' : 'Intelligence Gap'}</h3>
                        <p className="text-[15px] font-medium text-[#86868b] max-w-sm mb-10 leading-relaxed">
                            {isZh ? '在系统收集到足够的诊断咨询数据后，我们将为您自动生成运营洞察模型。' : 'We require a larger dataset of diagnostic inquiries to generate high-fidelity operational models.'}
                        </p>
                        <button onClick={() => navigate('/diagnosis')}
                            className="px-10 py-4 bg-[#1d1d1f] text-white rounded-[20px] text-[13px] font-black uppercase tracking-widest hover:bg-black transition-all press-scale shadow-2xl shadow-black/20">
                            {isZh ? '启动诊断采集' : 'Initiate Data Collection'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricsDashboard;
