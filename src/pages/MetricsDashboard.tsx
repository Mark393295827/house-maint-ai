import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { getMetrics, getMetricsHealth } from '../services/api';

// Sub-components
import { LiveBadge, GlassCard } from '../components/metrics/MetricCard';
import { CircularGauge, StatBar } from '../components/metrics/MetricGauges';
import { PipelineStage, MiniStat, HealthRow, AgentBar } from '../components/metrics/MetricDetails';

/* ─── Types ─── */
interface Metrics {
    system: { uptime_ms: number; uptime_human: string };
    requests: { total: number; success: number; error: number; success_rate: string };
    response_time: { avg_ms: string; min_ms: number; max_ms: number };
    sda_cycles: { total: number; simulate_passes: number; deploys: number; augments: number };
    agents: { total_invocations: number; by_agent: Record<string, number> };
}

interface HealthStats {
    memory: { rss_mb: number; heap_used_mb: number; heap_total_mb: number; external_mb: number };
    cpu: { user_ms: number; system_ms: number };
    node_version: string;
    platform: string;
    pid: number;
}

/* ─── Main Component ─── */
export default function MetricsDashboard() {
    const { t } = useLanguage();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [health, setHealth] = useState<HealthStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [m, h] = await Promise.all([getMetrics(), getMetricsHealth()]);
            setMetrics(m as Metrics);
            setHealth(h as HealthStats);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 5000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={styles.bg}>
                <div style={styles.spinner} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={styles.bg}>
                <div style={styles.glassCard} className="p-8 text-center max-w-md">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-white mb-2">{t('metrics.error', { defaultValue: 'Connection Error' })}</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button onClick={fetchAll} style={styles.retryBtn}>
                        {t('metrics.retry', { defaultValue: 'Retry' })}
                    </button>
                </div>
            </div>
        );
    }

    if (!metrics || !health) return null;

    const memPercent = health.memory.heap_total_mb > 0
        ? Math.round((health.memory.heap_used_mb / health.memory.heap_total_mb) * 100)
        : 0;

    const agentEntries = Object.entries(metrics.agents.by_agent).sort((a, b) => b[1] - a[1]);
    const maxAgentCount = agentEntries.length > 0 ? agentEntries[0][1] : 1;

    return (
        <div className="min-h-screen" style={styles.bg}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ─── Header ─── */}
                <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span style={styles.headerIcon}>📊</span>
                            {t('metrics.title', { defaultValue: 'System Metrics' })}
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {t('metrics.subtitle', { defaultValue: 'Real-time system monitoring' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <LiveBadge styles={styles} />
                        <button onClick={fetchAll} style={styles.refreshBtn}>
                            🔄 {t('metrics.refresh', { defaultValue: 'Refresh' })}
                        </button>
                    </div>
                </div>

                {/* ─── System Overview Cards ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <GlassCard accent="#6366f1" icon="⏱️" label={t('metrics.uptime', { defaultValue: 'Uptime' })} value={metrics.system.uptime_human} styles={styles} />
                    <GlassCard accent="#22c55e" icon="📨" label={t('metrics.totalRequests', { defaultValue: 'Total Requests' })} value={metrics.requests.total.toLocaleString()} styles={styles} />
                    <GlassCard accent="#10b981" icon="✅" label={t('metrics.successRate', { defaultValue: 'Success Rate' })} value={metrics.requests.success_rate} styles={styles} />
                    <GlassCard accent="#f59e0b" icon="⚡" label={t('metrics.avgResponse', { defaultValue: 'Avg Response' })} value={`${metrics.response_time.avg_ms}ms`} styles={styles} />
                </div>

                {/* ─── Two-Column Layout ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* ─── SDA Pipeline ─── */}
                    <div className="lg:col-span-2" style={styles.glassCard}>
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                🔄 {t('metrics.sdaCycles', { defaultValue: 'SDA Cycles' })}
                                <span style={styles.badge}>{metrics.sda_cycles.total}</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <PipelineStage icon="🧪" phase={t('metrics.simulate', { defaultValue: 'Simulate' })} count={metrics.sda_cycles.simulate_passes} color="#818cf8" />
                                <PipelineStage icon="🚀" phase={t('metrics.deploy', { defaultValue: 'Deploy' })} count={metrics.sda_cycles.deploys} color="#a78bfa" />
                                <PipelineStage icon="📈" phase={t('metrics.augment', { defaultValue: 'Augment' })} count={metrics.sda_cycles.augments} color="#c084fc" />
                            </div>
                        </div>
                    </div>

                    {/* ─── Memory Gauge ─── */}
                    <div style={styles.glassCard}>
                        <div className="p-6 flex flex-col items-center">
                            <h2 className="text-lg font-bold text-white mb-4">
                                💾 {t('metrics.memory', { defaultValue: 'Memory' })}
                            </h2>
                            <CircularGauge percent={memPercent} label={`${health.memory.heap_used_mb}MB`} />
                            <p className="text-gray-400 text-sm mt-3">
                                {health.memory.heap_used_mb} / {health.memory.heap_total_mb} MB
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── Health + Request Detail ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Request Breakdown */}
                    <div style={styles.glassCard}>
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-white mb-5">
                                📊 {t('metrics.requestBreakdown', { defaultValue: 'Request Breakdown' })}
                            </h2>
                            <div className="space-y-4">
                                <StatBar label={t('metrics.success', { defaultValue: 'Success' })} value={metrics.requests.success} max={metrics.requests.total || 1} color="#22c55e" />
                                <StatBar label={t('metrics.errors', { defaultValue: 'Errors' })} value={metrics.requests.error} max={metrics.requests.total || 1} color="#ef4444" />
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/10">
                                <MiniStat label="Min" value={`${metrics.response_time.min_ms.toFixed(1)}ms`} />
                                <MiniStat label="Avg" value={`${metrics.response_time.avg_ms}ms`} />
                                <MiniStat label="Max" value={`${metrics.response_time.max_ms.toFixed(1)}ms`} />
                            </div>
                        </div>
                    </div>

                    {/* System Health */}
                    <div style={styles.glassCard}>
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-white mb-5">
                                🖥️ {t('metrics.systemHealth', { defaultValue: 'System Health' })}
                            </h2>
                            <div className="space-y-3">
                                <HealthRow label="Node.js" value={health.node_version} />
                                <HealthRow label={t('metrics.platform', { defaultValue: 'Platform' })} value={health.platform} />
                                <HealthRow label="PID" value={health.pid.toString()} />
                                <HealthRow label="RSS" value={`${health.memory.rss_mb} MB`} />
                                <HealthRow label="CPU (user)" value={`${health.cpu.user_ms}ms`} />
                                <HealthRow label="CPU (system)" value={`${health.cpu.system_ms}ms`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Agent Activity ─── */}
                <div style={styles.glassCard}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                🤖 {t('metrics.agentActivity', { defaultValue: 'Agent Activity' })}
                            </h2>
                            <span className="text-2xl font-bold text-indigo-400">{metrics.agents.total_invocations}</span>
                        </div>
                        {agentEntries.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">{t('metrics.noAgents', { defaultValue: 'No agent activity yet' })}</p>
                        ) : (
                            <div className="space-y-3">
                                {agentEntries.map(([agent, count]) => (
                                    <AgentBar key={agent} name={agent} count={count} max={maxAgentCount} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Footer ─── */}
                {lastUpdated && (
                    <p className="text-center text-gray-500 text-xs mt-6">
                        {t('metrics.lastUpdated', { defaultValue: 'Last updated' })}: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ─── Styles ─── */
const styles: Record<string, React.CSSProperties> = {
    bg: {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        minHeight: '100vh',
    },
    glassCard: {
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
    },
    headerIcon: {
        fontSize: '2rem',
        filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))',
    },
    badge: {
        background: 'rgba(99,102,241,0.2)',
        color: '#818cf8',
        padding: '2px 10px',
        borderRadius: '99px',
        fontSize: '0.85rem',
        fontWeight: 600,
    },
    refreshBtn: {
        background: 'rgba(255,255,255,0.08)',
        color: '#e5e7eb',
        padding: '8px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        fontSize: '0.875rem',
        transition: 'background 0.2s',
    },
    retryBtn: {
        background: '#6366f1',
        color: 'white',
        padding: '10px 24px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
    },
    liveDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#22c55e',
        boxShadow: '0 0 6px #22c55e',
        animation: 'pulse 2s infinite',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
};
