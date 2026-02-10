import { useState, useEffect } from 'react';

interface Metrics {
    system: { uptime_ms: number; uptime_human: string };
    requests: { total: number; success: number; error: number; success_rate: string };
    response_time: { avg_ms: string; min_ms: number; max_ms: number };
    sda_cycles: { total: number; simulate_passes: number; deploys: number; augments: number };
    agents: { total_invocations: number; by_agent: Record<string, number> };
}

export default function MetricsDashboard() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/metrics');
            if (!res.ok) throw new Error('Failed to fetch metrics');
            const data = await res.json();
            setMetrics(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center">Loading metrics...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    if (!metrics) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">📊 System Metrics Dashboard</h1>

            {/* System Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <MetricCard title="Uptime" value={metrics.system.uptime_human} icon="⏱️" />
                <MetricCard title="Total Requests" value={metrics.requests.total.toString()} icon="📨" />
                <MetricCard title="Success Rate" value={metrics.requests.success_rate} icon="✅" color="green" />
                <MetricCard title="Avg Response" value={`${metrics.response_time.avg_ms}ms`} icon="⚡" />
            </div>

            {/* SDA Cycles */}
            <h2 className="text-xl font-semibold mb-4">🔄 SDA Cycle Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <MetricCard title="Total Cycles" value={metrics.sda_cycles.total.toString()} icon="🔁" />
                <MetricCard title="Simulate Passes" value={metrics.sda_cycles.simulate_passes.toString()} icon="🧪" color="blue" />
                <MetricCard title="Deploys" value={metrics.sda_cycles.deploys.toString()} icon="🚀" color="purple" />
                <MetricCard title="Augments" value={metrics.sda_cycles.augments.toString()} icon="📈" color="orange" />
            </div>

            {/* Agent Stats */}
            <h2 className="text-xl font-semibold mb-4">🤖 Agent Invocations</h2>
            <div className="bg-gray-800 rounded-lg p-4 mb-8">
                <p className="text-2xl font-bold mb-4">{metrics.agents.total_invocations} Total</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(metrics.agents.by_agent).map(([agent, count]) => (
                        <div key={agent} className="bg-gray-700 rounded p-2 text-sm">
                            <span className="font-medium">{agent}</span>: {count}
                        </div>
                    ))}
                </div>
            </div>

            {/* Refresh Button */}
            <button
                onClick={fetchMetrics}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
                🔄 Refresh Now
            </button>
        </div>
    );
}

function MetricCard({ title, value, icon, color = 'gray' }: {
    title: string;
    value: string;
    icon: string;
    color?: string;
}) {
    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-800',
        green: 'bg-green-900',
        blue: 'bg-blue-900',
        purple: 'bg-purple-900',
        orange: 'bg-orange-900',
    };

    return (
        <div className={`${colorClasses[color]} rounded-lg p-4`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-sm text-gray-400">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}
