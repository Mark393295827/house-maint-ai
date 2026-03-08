import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import EnterpriseLayout from '../components/EnterpriseLayout';
import { useAuth } from '../contexts/AuthContext';
import { PropertiesPage, TicketsPage, EnterpriseWorkersPage, AnalyticsPage } from './EnterprisePlaceholders';

// ============ Types ============

interface StrategyAlert {
    severity: 'info' | 'warning' | 'critical';
    dimension: string;
    rule_triggered: string;
    metric_name: string;
    metric_value: number;
    threshold: number;
    recommended_action: string;
    requires_human_approval: boolean;
}

interface AgentStatus {
    name: string;
    status: 'online' | 'idle' | 'error';
    lastCall: string;
    callsToday: number;
    costToday: number;
    model: string;
}

interface DimensionScore {
    name: string;
    label: string;
    score: number;
    maxScore: number;
    icon: string;
    color: string;
    description: string;
}

// ============ Sub-components ============

const ScoreRing: React.FC<{ score: number; max: number; color: string; size?: number }> = ({ score, max, color, size = 80 }) => {
    const pct = (score / max) * 100;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor"
                strokeWidth="4" className="text-gray-100 dark:text-gray-800" />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
                strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
    );
};

const DimensionCard: React.FC<{ dim: DimensionScore; delay: number }> = ({ dim, delay }) => (
    <div className="stagger-item telemetry-card rounded-2xl p-6 scan-line group hover:scale-[1.02] transition-transform duration-300"
        style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <span className="text-3xl">{dim.icon}</span>
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{dim.name}</h3>
                    <p className="text-xs text-gray-500">{dim.label}</p>
                </div>
            </div>
            <div className="relative flex items-center justify-center">
                <ScoreRing score={dim.score} max={dim.maxScore} color={dim.color} size={64} />
                <span className="absolute font-telemetry text-lg font-bold" style={{ color: dim.color }}>
                    {dim.score.toFixed(1)}
                </span>
            </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{dim.description}</p>
        {/* Score bar */}
        <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(dim.score / dim.maxScore) * 100}%`, background: dim.color }} />
        </div>
    </div>
);

const AlertBadge: React.FC<{ alert: StrategyAlert }> = ({ alert }) => {
    const colors = {
        info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
        warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
        critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400 live-dot-red' },
    };
    const c = colors[alert.severity];

    return (
        <div className={`${c.bg} ${c.border} border rounded-xl p-4 mb-3 transition-all hover:scale-[1.01]`}>
            <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${c.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>
                            {alert.severity}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{alert.rule_triggered}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{alert.recommended_action}</p>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs font-mono text-gray-500">
                            {alert.metric_name}: <span className={c.text}>{alert.metric_value.toFixed(2)}</span> / {alert.threshold}
                        </span>
                        {alert.requires_human_approval && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                                需人工审批
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AgentCard: React.FC<{ agent: AgentStatus }> = ({ agent }) => {
    const statusColors = {
        online: 'bg-emerald-400',
        idle: 'bg-amber-400',
        error: 'bg-red-400 live-dot-red',
    };

    return (
        <div className="telemetry-card rounded-xl p-4 hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                    <h4 className="text-sm font-semibold text-gray-200 font-mono">{agent.name}</h4>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{agent.model}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xs text-gray-500">Calls</p>
                    <p className="font-telemetry text-sm font-bold text-gray-200">{agent.callsToday}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Cost</p>
                    <p className="font-telemetry text-sm font-bold text-data-green">${agent.costToday.toFixed(3)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Last</p>
                    <p className="text-xs text-gray-400">{agent.lastCall}</p>
                </div>
            </div>
        </div>
    );
};

// ============ Main Dashboard ============

const EnterpriseDashboardHome: React.FC = () => {
    const { user } = useAuth();

    // Research Swarm state
    const [researchSector, setResearchSector] = useState('本地家政物业维修');
    const [researchFocus, setResearchFocus] = useState('效率断层');
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchResult, setResearchResult] = useState<any>(null);

    const handleResearch = async () => {
        setResearchLoading(true);
        try {
            const res = await fetch('/api/ai/research-market', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sector: researchSector, focusArea: researchFocus })
            });
            const data = await res.json();
            setResearchResult(data);
        } catch (e) {
            console.error('Research failed:', e);
        } finally {
            setResearchLoading(false);
        }
    };

    // 4D Strategy Scores (from STRESS_TEST_4D.md)
    const dimensions: DimensionScore[] = [
        {
            name: 'TAM', label: '天花板 / Ceiling', score: 8.0, maxScore: 10, icon: '🎯', color: '#6366f1',
            description: 'AI-Expanded TAM: ¥913B. 3x suppressed demand uplift identified.'
        },
        {
            name: '10X', label: '斜率 / Slope', score: 7.0, maxScore: 10, icon: '⚡', color: '#06b6d4',
            description: 'Diagnosis 720x faster. Disputes 2,000x faster. 2 gaps to close.'
        },
        {
            name: 'TEAM', label: '地基 / Foundation', score: 6.0, maxScore: 10, icon: '🏗️', color: '#f59e0b',
            description: 'Architect role strong. Agent Tuning Specialist + BD Lead needed.'
        },
        {
            name: 'FINANCIALS', label: '血条 / Health Bar', score: 8.0, maxScore: 10, icon: '💰', color: '#10b981',
            description: 'Token costs 0.15% of revenue at scale. Breakeven at 1,700 doors.'
        },
    ];

    const compositeScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;

    // Agent Status Matrix
    const [agents] = useState<AgentStatus[]>([
        { name: 'DiagnosisAgent', status: 'online', lastCall: '2m ago', callsToday: 47, costToday: 0.094, model: 'gemini-flash' },
        { name: 'PlanningAgent', status: 'online', lastCall: '5m ago', callsToday: 23, costToday: 0.115, model: 'deepseek-r1' },
        { name: 'MaterialAgent', status: 'idle', lastCall: '—', callsToday: 0, costToday: 0, model: 'gemini-flash' },
        { name: 'FaultAgent', status: 'idle', lastCall: '—', callsToday: 0, costToday: 0, model: 'gemini-flash' },
        { name: 'TurnoverAgent', status: 'idle', lastCall: '—', callsToday: 0, costToday: 0, model: 'gemini-flash' },
        { name: 'CFO Agent', status: 'online', lastCall: '1h ago', callsToday: 3, costToday: 0.003, model: 'algorithmic' },
        { name: 'COO Agent', status: 'online', lastCall: '30m ago', callsToday: 5, costToday: 0, model: 'algorithmic' },
    ]);

    // Strategy Alerts (simulated from executive service)
    const [alerts] = useState<StrategyAlert[]>([
        {
            severity: 'info', dimension: 'financials', rule_triggered: 'Rule 4: Monthly Check',
            metric_name: 'gross_margin_pct', metric_value: 99.7, threshold: 50,
            recommended_action: '本月毛利率99.7%，Token成本占比极低。单位经济模型健康。',
            requires_human_approval: false
        },
        {
            severity: 'warning', dimension: 'team', rule_triggered: 'Rule 2: Supply Alert',
            metric_name: 'ticket_worker_ratio', metric_value: 3.0, threshold: 5,
            recommended_action: '活跃工单/可用师傅比例为3:1，接近警戒线。建议在天涯区招募2名新师傅。',
            requires_human_approval: false
        },
        {
            severity: 'info', dimension: 'tenx', rule_triggered: 'Blue Ocean S1 Ready',
            metric_name: 'material_agent_status', metric_value: 1, threshold: 1,
            recommended_action: 'MaterialAgent (材料清单) 已部署就绪。等待首次实际调用验证BOM生成准确率。',
            requires_human_approval: false
        },
    ]);

    // KPI summary cards
    const kpis = [
        { label: '管理门数', value: '0', target: '30', unit: 'doors', icon: '🏠', color: '#6366f1' },
        { label: '活跃工单', value: '0', target: '—', unit: 'tickets', icon: '🎫', color: '#f59e0b' },
        { label: '今日AI调用', value: '78', target: '500', unit: 'calls', icon: '🤖', color: '#06b6d4' },
        { label: '今日Token成本', value: '$0.21', target: '<$10', unit: 'USD', icon: '💸', color: '#10b981' },
        { label: '师傅在线', value: '0', target: '8', unit: 'workers', icon: '👷', color: '#8b5cf6' },
        { label: 'AI准确率', value: '—', target: '≥85%', unit: '', icon: '🎯', color: '#ef4444' },
    ];

    // Current time for header
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="dark page-enter">
            {/* ─── Mission Control Header ─── */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="live-dot" />
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                                Enterprise Digital Twin
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold font-display">
                            <span className="text-shimmer">Hasiki Mission Control</span>
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            {user?.name || 'Architect'} · Stage 1-2 · Sanya Beachhead
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="font-telemetry text-2xl font-bold text-gray-200">
                                {time.toLocaleTimeString('zh-CN', { hour12: false })}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                                {time.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </p>
                        </div>
                        <div className="relative flex items-center justify-center">
                            <ScoreRing score={compositeScore} max={10} color="#6366f1" size={72} />
                            <div className="absolute text-center">
                                <span className="font-telemetry text-lg font-bold text-primary-light">{compositeScore.toFixed(1)}</span>
                                <p className="text-[8px] text-gray-500 uppercase">4D Score</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── KPI Ribbon ─── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {kpis.map((kpi, i) => (
                    <div key={i} className="telemetry-card rounded-xl p-4 text-center stagger-item"
                        style={{ animationDelay: `${i * 60}ms` }}>
                        <span className="text-2xl">{kpi.icon}</span>
                        <p className="font-telemetry text-xl font-bold mt-1" style={{ color: kpi.color }}>
                            {kpi.value}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                            {kpi.label}
                        </p>
                        <p className="text-[9px] text-gray-600 mt-1">
                            Target: <span className="text-gray-400">{kpi.target}</span>
                        </p>
                    </div>
                ))}
            </div>

            {/* ─── 4D Strategy Scores ─── */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-gray-200">4D Strategy Health</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary-light font-mono">
                        from STRESS_TEST_4D.md
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dimensions.map((dim, i) => (
                        <DimensionCard key={dim.name} dim={dim} delay={i * 100} />
                    ))}
                </div>
            </div>

            {/* ─── Agent Matrix + Alerts ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                {/* Agent Matrix (3 cols) */}
                <div className="lg:col-span-3">
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-bold text-gray-200">Agent Matrix</h2>
                        <span className="text-xs text-gray-500 font-mono">7 agents deployed</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {agents.map((agent) => (
                            <AgentCard key={agent.name} agent={agent} />
                        ))}
                    </div>
                </div>

                {/* Executive Alerts (2 cols) */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-bold text-gray-200">Executive Alerts</h2>
                        <div className="live-dot" />
                    </div>
                    <div>
                        {alerts.map((alert, i) => (
                            <AlertBadge key={i} alert={alert} />
                        ))}
                    </div>

                    {/* Cost Burn Summary */}
                    <div className="telemetry-card rounded-xl p-5 mt-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Cost Transform (¥/月)
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500">Traditional Team</span>
                                    <span className="text-red-400 font-mono">¥98,000</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500/60 rounded-full" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500">Agent Matrix (Tokens)</span>
                                    <span className="text-data-green font-mono">¥1,400</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: '1.4%', background: '#00FF87' }} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                                <span className="text-xs text-gray-500">降维打击</span>
                                <span className="font-telemetry text-lg font-bold text-data-green">-98.6%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Blue Ocean Scenarios Status ─── */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-gray-200">Blue Ocean Scenarios</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-neon-cyan font-mono">
                        from AI_BLUE_OCEAN.md
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                        { id: 'S1', name: '材料清单 BOM', status: 'deployed', priority: 'P0', agent: 'MaterialAgent' },
                        { id: 'S2', name: '责任判定', status: 'deployed', priority: 'P0', agent: 'FaultAgent' },
                        { id: 'S3', name: '度假房交接', status: 'deployed', priority: 'P0', agent: 'TurnoverAgent' },
                        { id: 'S4', name: '预测性维修', status: 'planned', priority: 'P1', agent: '—' },
                        { id: 'S5', name: '霉菌预警', status: 'planned', priority: 'P1', agent: '—' },
                    ].map((scenario) => {
                        const isDeployed = scenario.status === 'deployed';
                        return (
                            <div key={scenario.id}
                                className={`telemetry-card rounded-xl p-4 ${isDeployed ? 'border-data-green/20' : 'opacity-60'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-telemetry text-sm font-bold text-gray-300">{scenario.id}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isDeployed
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-gray-700 text-gray-400'
                                        }`}>
                                        {isDeployed ? 'DEPLOYED' : 'PLANNED'}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-200 mb-1">{scenario.name}</p>
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-gray-500">{scenario.agent}</span>
                                    <span className={`font-semibold ${scenario.priority === 'P0' ? 'text-red-400' : 'text-amber-400'}`}>
                                        {scenario.priority}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Research Swarm Panel ─── */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-gray-200">调研代理群 (Research Swarm)</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono">
                        3 Agents × Cross-Validation
                    </span>
                </div>
                <div className="telemetry-card rounded-2xl p-6 scan-line">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Target Sector</label>
                            <input type="text" value={researchSector} onChange={(e) => setResearchSector(e.target.value)}
                                placeholder="例: 本地家政物业维修" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-primary/50 focus:outline-none" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Focus Area</label>
                            <input type="text" value={researchFocus} onChange={(e) => setResearchFocus(e.target.value)}
                                placeholder="例: 效率断层" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-primary/50 focus:outline-none" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleResearch} disabled={researchLoading || !researchSector}
                                className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500">
                                {researchLoading ? '⏳ 3 Agents Working...' : '🔍 启动调研'}
                            </button>
                        </div>
                    </div>
                    {researchResult && (
                        <div className="mt-6 space-y-4">
                            <div className={`p-4 rounded-xl border ${researchResult.go_no_go?.overall_verdict === 'GO' ? 'bg-emerald-500/10 border-emerald-500/20'
                                    : researchResult.go_no_go?.overall_verdict === 'NEEDS_MORE_DATA' ? 'bg-amber-500/10 border-amber-500/20'
                                        : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{researchResult.go_no_go?.overall_verdict === 'GO' ? '✅' : '⚠️'}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-200">{researchResult.go_no_go?.overall_verdict}</h3>
                                        <p className="text-xs text-gray-400">Confidence: {researchResult.confidence_score}%</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-300 mt-3 leading-relaxed">{researchResult.executive_summary}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2"><span>🔥</span><h4 className="text-xs font-semibold text-gray-400 uppercase">Pain Density</h4></div>
                                    <p className="font-telemetry text-2xl font-bold text-orange-400">{researchResult.pain_points?.pain_density_score}<span className="text-sm text-gray-500">/100</span></p>
                                    <p className="text-[10px] text-gray-500 mt-1">Bottleneck: {researchResult.pain_points?.primary_bottleneck}</p>
                                </div>
                                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2"><span>📡</span><h4 className="text-xs font-semibold text-gray-400 uppercase">Digital Vacuum</h4></div>
                                    <p className="font-telemetry text-2xl font-bold text-cyan-400">{researchResult.digital_vacuum?.vacuum_grade}<span className="text-sm text-gray-500 ml-1">({(researchResult.digital_vacuum?.vacuum_ratio * 100).toFixed(0)}%)</span></p>
                                    <p className="text-[10px] text-gray-500 mt-1">Feasibility: {researchResult.digital_vacuum?.automation_feasibility}%</p>
                                </div>
                                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2"><span>🚀</span><h4 className="text-xs font-semibold text-gray-400 uppercase">TAM Expansion</h4></div>
                                    <p className="font-telemetry text-2xl font-bold text-emerald-400">{researchResult.tam_expansion?.suppressed_demand_multiplier?.toFixed(1)}x</p>
                                    <p className="text-[10px] text-gray-500 mt-1">¥{(researchResult.tam_expansion?.current_tam_cny / 1e9).toFixed(0)}B → ¥{(researchResult.tam_expansion?.expanded_tam_cny / 1e9).toFixed(0)}B</p>
                                </div>
                            </div>
                            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Go/No-Go Checklist</h4>
                                <div className="space-y-2">
                                    {[
                                        { label: '增量需求', ...researchResult.go_no_go?.incremental_demand },
                                        { label: '10X 可能性', ...researchResult.go_no_go?.tenx_possibility },
                                        { label: '竞争壁垒', ...researchResult.go_no_go?.competitive_moat },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className={`text-sm ${item.pass ? 'text-emerald-400' : 'text-red-400'}`}>{item.pass ? '✓' : '✗'}</span>
                                            <div><span className="text-xs font-medium text-gray-300">{item.label}</span><p className="text-[10px] text-gray-500">{item.evidence}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Quick Actions ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="telemetry-card rounded-xl p-5 text-left hover:border-primary/30 transition-all group">
                    <span className="text-2xl mb-2 block">📸</span>
                    <h3 className="text-sm font-bold text-gray-200 mb-1 group-hover:text-primary-light transition-colors">AI 故障诊断</h3>
                    <p className="text-xs text-gray-500">Upload photo → AI diagnosis in 2 minutes</p>
                </button>
                <button className="telemetry-card rounded-xl p-5 text-left hover:border-cyan-500/30 transition-all group">
                    <span className="text-2xl mb-2 block">⚖️</span>
                    <h3 className="text-sm font-bold text-gray-200 mb-1 group-hover:text-neon-cyan transition-colors">责任判定 (S2)</h3>
                    <p className="text-xs text-gray-500">Photo → landlord/tenant fault in 30 seconds</p>
                </button>
                <button className="telemetry-card rounded-xl p-5 text-left hover:border-emerald-500/30 transition-all group">
                    <span className="text-2xl mb-2 block">🏖️</span>
                    <h3 className="text-sm font-bold text-gray-200 mb-1 group-hover:text-data-green transition-colors">度假房交接 (S3)</h3>
                    <p className="text-xs text-gray-500">Before/after photo diff → damage report</p>
                </button>
            </div>
        </div>
    );
};

// ============ Enterprise Dashboard Router ============

const EnterpriseDashboard: React.FC = () => {
    return (
        <EnterpriseLayout>
            <Routes>
                <Route index element={<EnterpriseDashboardHome />} />
                <Route path="properties" element={<PropertiesPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="workers" element={<EnterpriseWorkersPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
            </Routes>
        </EnterpriseLayout>
    );
};

export default EnterpriseDashboard;
