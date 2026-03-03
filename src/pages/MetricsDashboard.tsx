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

/* ─── Stat Card Component ─── */
const StatCard: React.FC<{ icon: string; label: string; value: string | number; sub?: string; color: string }> = ({ icon, label, value, sub, color }) => (
    <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 hover:border-white/10 transition-colors">
        <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-2xl font-black text-white tabular-nums">{value}</div>
        {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </div>
);

/* ─── Bar Chart Component ─── */
const BarChart: React.FC<{ data: Record<string, number>; color: string }> = ({ data, color }) => {
    const maxVal = Math.max(...Object.values(data), 1);
    return (
        <div className="space-y-2">
            {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-white/60 w-20 truncate text-right">{key}</span>
                    <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
                        <div className={`h-full bg-gradient-to-r ${color} rounded-lg transition-all duration-700`} style={{ width: `${(val / maxVal) * 100}%` }} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/50">{val}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ─── Ring Gauge ─── */
const RingGauge: React.FC<{ value: number; max: number; label: string; color: string }> = ({ value, max, label, color }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const r = 40, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
    return (
        <div className="flex flex-col items-center">
            <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#grad-${label})`} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                    className="transition-all duration-1000" />
                <defs>
                    <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color.split(' ')[0]} />
                        <stop offset="100%" stopColor={color.split(' ')[1] || color.split(' ')[0]} />
                    </linearGradient>
                </defs>
            </svg>
            <span className="text-xl font-black text-white -mt-[62px] mb-8">{value.toFixed(1)}</span>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
        </div>
    );
};

/* ─── Main Dashboard ─── */
const MetricsDashboard: React.FC = () => {
    const { locale } = useLanguage();
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
        <div className="min-h-screen bg-[#0b0d1a] text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#0b0d1a]/95 backdrop-blur-xl border-b border-white/5 px-5 pt-14 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/15 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-xl text-white/60">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">{isZh ? '运营数据看板' : 'Metrics Dashboard'}</h1>
                        <p className="text-xs text-white/40">{isZh ? '基于实际使用数据的智能洞察' : 'Insights from real usage data'}</p>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 space-y-6 pb-24">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard icon="query_stats" label={isZh ? '总咨询' : 'Inquiries'} value={totalInquiries}
                        sub={isZh ? '全部对话数' : 'Total conversations'} color="from-violet-500 to-indigo-600" />
                    <StatCard icon="check_circle" label={isZh ? '转化率' : 'Conversion'} value={`${conversionRate}%`}
                        sub={isZh ? '完成派单比' : 'Dispatch rate'} color="from-emerald-500 to-green-600" />
                    <StatCard icon="photo_camera" label={isZh ? '拍照率' : 'Photo Rate'} value={`${photoRate}%`}
                        sub={isZh ? '使用拍照功能' : 'Used camera'} color="from-blue-500 to-cyan-600" />
                    <StatCard icon="feedback" label={isZh ? '反馈数' : 'Feedbacks'} value={totalFeedbacks}
                        sub={isZh ? '已提交评价' : 'Reviews submitted'} color="from-amber-400 to-orange-500" />
                </div>

                {/* Rating Gauges */}
                {totalFeedbacks > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '用户满意度' : 'User Satisfaction'}</h3>
                        <div className="flex justify-around">
                            <RingGauge value={avgRating} max={5} label={isZh ? '满意度' : 'Rating'} color="#a78bfa #818cf8" />
                            <RingGauge value={avgAccuracy} max={5} label={isZh ? '准确度' : 'Accuracy'} color="#34d399 #10b981" />
                        </div>
                    </div>
                )}

                {/* Weekly Trend */}
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '近7天趋势' : '7-Day Trend'}</h3>
                    <div className="flex items-end gap-1 h-32">
                        {last7Days.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[9px] font-bold text-white/40">{day.count || ''}</span>
                                <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden" style={{ height: `${Math.max((day.count / maxDaily) * 100, 4)}%` }}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg" />
                                </div>
                                <span className="text-[9px] text-white/30">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category Distribution */}
                {Object.keys(typeCounts).length > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '项目类型分布' : 'Project Type Distribution'}</h3>
                        <BarChart data={typeCounts} color="from-violet-500 to-indigo-500" />
                    </div>
                )}

                {/* Area Distribution */}
                {Object.keys(areaCounts).length > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '区域分布' : 'Area Distribution'}</h3>
                        <BarChart data={areaCounts} color="from-blue-500 to-cyan-500" />
                    </div>
                )}

                {/* Severity Distribution */}
                {Object.keys(severityCounts).length > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '严重程度分布' : 'Severity Distribution'}</h3>
                        <div className="flex gap-3">
                            {Object.entries(severityCounts).map(([sev, count]) => {
                                const colors: Record<string, string> = { critical: 'from-red-500 to-rose-600', moderate: 'from-amber-400 to-orange-500', low: 'from-emerald-400 to-green-500' };
                                const labels: Record<string, string> = isZh ? { critical: '紧急', moderate: '中等', low: '轻微' } : { critical: 'Critical', moderate: 'Moderate', low: 'Low' };
                                return (
                                    <div key={sev} className="flex-1 text-center">
                                        <div className={`bg-gradient-to-br ${colors[sev] || colors.moderate} rounded-xl py-3 px-2 mb-1`}>
                                            <span className="text-xl font-black">{count}</span>
                                        </div>
                                        <span className="text-[10px] text-white/50 font-bold uppercase">{labels[sev] || sev}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Feedback Tags */}
                {Object.keys(tagCounts).length > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '用户反馈标签' : 'Feedback Tags'}</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                                <div key={tag} className="bg-violet-500/10 border border-violet-500/20 rounded-full px-3.5 py-1.5 flex items-center gap-2">
                                    <span className="text-sm text-violet-300">{tag}</span>
                                    <span className="text-[10px] font-bold text-violet-400/60 bg-violet-500/20 rounded-full px-1.5 py-0.5">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Feedback List */}
                {feedback.length > 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white/70 mb-4">{isZh ? '最近评价' : 'Recent Feedback'}</h3>
                        <div className="space-y-3">
                            {feedback.slice(-5).reverse().map((f, i) => (
                                <div key={i} className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <span key={s} className={`material-symbols-outlined text-sm ${s <= f.rating ? 'text-amber-400' : 'text-white/10'}`}
                                                    style={{ fontVariationSettings: `'FILL' ${s <= f.rating ? 1 : 0}` }}>star</span>
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-white/20">{new Date(f.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    {f.tags.length > 0 && (
                                        <div className="flex gap-1 flex-wrap mb-1">
                                            {f.tags.map(t => <span key={t} className="text-[10px] text-white/40 bg-white/5 rounded-full px-2 py-0.5">{t}</span>)}
                                        </div>
                                    )}
                                    {f.comment && <p className="text-xs text-white/50">{f.comment}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {totalInquiries === 0 && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-6xl text-white/10 mb-4 block">monitoring</span>
                        <h3 className="text-white/40 font-bold mb-2">{isZh ? '暂无数据' : 'No Data Yet'}</h3>
                        <p className="text-white/20 text-sm max-w-xs mx-auto">{isZh ? '完成一些诊断咨询后，数据将显示在此处' : 'Complete some diagnosis inquiries and data will appear here'}</p>
                        <button onClick={() => navigate('/diagnosis')}
                            className="mt-6 px-6 py-3 bg-violet-600 rounded-2xl font-bold text-sm hover:bg-violet-700 transition-colors">
                            {isZh ? '开始诊断' : 'Start Diagnosis'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricsDashboard;
