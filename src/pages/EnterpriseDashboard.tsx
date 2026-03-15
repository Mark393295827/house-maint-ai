import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import EnterpriseLayout from '../components/EnterpriseLayout';
import { useAuth } from '../contexts/AuthContext';
import { PropertiesPage, TicketsPage, EnterpriseWorkersPage, AnalyticsPage } from './EnterprisePlaceholders';
import WorkerMap from '../components/WorkerMap';
import { PerformanceChart, WorkloadDistribution } from '../components/OperationCharts';
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

const ScoreRing: React.FC<{ score: number; max: number; color: string; size?: number; stroke?: number }> = ({ score, max, color, size = 80, stroke = 3 }) => {
    const pct = (score / max) * 100;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    const gradientId = `ring-gradient-${color.replace('#', '')}`;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 drop-shadow-sm">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                </linearGradient>
            </defs>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="rgba(0,0,0,0.03)"
                strokeWidth={stroke}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={`url(#${gradientId})`}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
};

const DimensionCard: React.FC<{ dim: DimensionScore }> = ({ dim }) => (
    <div className="aegis-card p-6 lg:p-8 group hover:-translate-y-1.5 transition-all duration-500 bg-white/60">
        <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b]">Strategic Dimension</span>
                <h3 className="text-base font-black text-[#1d1d1f] tracking-tight">{dim.name}</h3>
            </div>
            <div className="relative flex items-center justify-center p-2 bg-white/40 rounded-full border border-white/40 shadow-sm">
                <ScoreRing score={dim.score} max={dim.maxScore} color={dim.color} size={56} stroke={5} />
                <span className="absolute font-sans text-xs font-black text-[#1d1d1f]">
                    {(dim.score / dim.maxScore * 100).toFixed(0)}%
                </span>
            </div>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-black text-[#1d1d1f] tracking-tighter tabular-nums">{dim.score.toFixed(1)}</span>
            <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider">/ {dim.maxScore}</span>
        </div>
        <p className="text-[12px] text-[#86868b] font-medium leading-relaxed max-w-[90%]">{dim.description}</p>
        <div className="mt-8 h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div 
                className="h-full transition-all duration-[1.5s] ease-out rounded-full" 
                style={{ 
                    width: `${(dim.score / dim.maxScore) * 100}%`,
                    background: `linear-gradient(90deg, ${dim.color}, ${dim.color}dd)`,
                    boxShadow: `0 0 20px ${dim.color}33`
                }} 
            />
        </div>
    </div>
);

const AlertBadge: React.FC<{ alert: StrategyAlert }> = ({ alert }) => {
    const colors = {
        info: { bg: 'bg-slate-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-600' },
        warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-600' },
        critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', dot: 'bg-red-600 animate-pulse' },
    };
    const c = colors[alert.severity];

    return (
        <div className={`aegis-card p-4 mb-3 border ${c.border} ${c.bg}`}>
            <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${c.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${c.text}`}>
                            {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">[{alert.rule_triggered}]</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-normal mb-2">{alert.recommended_action}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">
                            {alert.metric_name}: <span className={c.text}>{alert.metric_value.toFixed(1)}</span>
                        </span>
                        <span className="material-symbols-outlined text-sm text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">arrow_forward</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AgentCard: React.FC<{ agent: AgentStatus }> = ({ agent }) => {
    const statusColors = {
        online: 'bg-[#28cd41]',
        idle: 'bg-[#ff9500]',
        error: 'bg-[#ff3b30] animate-pulse shadow-[0_0_8px_#ff3b3088]',
    };

    return (
        <div className="aegis-card p-5 lg:p-6 border-white/20 group hover:border-[#007aff]/30 transition-all duration-500 bg-white/40">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                    <h4 className="text-[13px] font-black text-[#1d1d1f] tracking-tight uppercase">{agent.name}</h4>
                </div>
                <div className="px-2 py-0.5 bg-black/5 rounded-md border border-black/5">
                   <span className="text-[9px] text-[#86868b] font-black uppercase tracking-widest">{agent.model}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                   <p className="text-[9px] text-[#86868b] uppercase font-black tracking-[0.15em] mb-1.5">Compute Cost</p>
                   <p className="font-sans text-sm font-black text-[#1d1d1f]">${agent.costToday.toFixed(4)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] text-[#86868b] uppercase font-black tracking-[0.15em] mb-1.5">Nodes Hit</p>
                    <p className="font-sans text-sm font-black text-[#1d1d1f]">{agent.callsToday.toLocaleString()}</p>
                </div>
            </div>
            <div className="h-1 bg-black/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-[#007aff] to-[#00c6ff] transition-all duration-1000 rounded-full" 
                    style={{ width: `${Math.min(100, agent.callsToday * 2)}%` }} 
                />
            </div>
        </div>
    );
};

const EnterpriseDashboardHome: React.FC = () => {
    const { user } = useAuth();
    const [researchSector, setResearchSector] = useState('本地家政物业维修');
    const [researchFocus] = useState('效率断层');
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

    const dimensions: DimensionScore[] = [
        { name: 'TAM', label: '天花板', score: 8.0, maxScore: 10, icon: '🎯', color: '#3b82f6', description: 'AI-Expanded TAM identified.' },
        { name: '10X', label: '斜率', score: 7.0, maxScore: 10, icon: '⚡', color: '#06b6d4', description: 'Diagnosis 720x faster.' },
        { name: 'TEAM', label: '地基', score: 6.0, maxScore: 10, icon: '🏗️', color: '#f59e0b', description: 'Architect role strong.' },
        { name: 'FINANCIALS', label: '血条', score: 8.0, maxScore: 10, icon: '💰', color: '#10b981', description: 'Tokens 0.15% cost.' },
    ];

    const compositeScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;

    const [agents] = useState<AgentStatus[]>([
        { name: 'DiagnosisAgent', status: 'online', lastCall: '2m ago', callsToday: 47, costToday: 0.094, model: 'gemini' },
        { name: 'PlanningAgent', status: 'online', lastCall: '5m ago', callsToday: 23, costToday: 0.115, model: 'r1' },
        { name: 'CFO Agent', status: 'online', lastCall: '1h ago', callsToday: 3, costToday: 0.003, model: 'alg' },
    ]);

    const [alerts] = useState<StrategyAlert[]>([
        { severity: 'info', dimension: 'fin', rule_triggered: 'Rule 4', metric_name: 'margin', metric_value: 99.7, threshold: 50, recommended_action: '本月毛利率99.7%，单位模型健康。', requires_human_approval: false },
        { severity: 'warning', dimension: 'team', rule_triggered: 'Rule 2', metric_name: 'ratio', metric_value: 3.0, threshold: 5, recommended_action: '建议在天涯区招募新师傅。', requires_human_approval: false },
    ]);

    // Added to resolve lint error for user if needed (proactive check)
    useEffect(() => {
        if (user) console.log('Aegis Terminal Active for:', user.name);
    }, [user]);

    return (
        <div className="space-y-6 page-enter">
            {/* Row 1: 4D Strategy Health (Key Metics) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dimensions.map((dim) => (
                    <DimensionCard key={dim.name} dim={dim} />
                ))}
            </div>

            {/* Row 2: Main Visualization (Map + Performance) */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <div className="lg:col-span-7 aegis-card overflow-hidden">
                    <div className="p-5 border-b border-gray-800/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Global Technician Deployment</h3>
                            <p className="text-[10px] text-gray-600 font-medium mt-1 uppercase tracking-tighter font-mono">Live geo-tracking · Sanya District · 12 Active Nodes</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> <span className="text-[9px] text-gray-500 font-bold font-mono">LIVE</span></div>
                            <span className="material-symbols-outlined text-gray-600 text-sm cursor-pointer hover:text-white">full_screen</span>
                        </div>
                    </div>
                    <div className="h-[400px] relative">
                         <WorkerMap />
                    </div>
                </div>

                <div className="lg:col-span-3 aegis-card p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Load & Performance</h3>
                        <div className="flex items-center gap-2 bg-gray-900/50 px-2 py-1 rounded text-[10px] text-gray-500 font-mono">
                            Last 6h <span className="material-symbols-outlined text-[12px]">expand_more</span>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Diagnosis Capacity</span>
                                <span className="text-[10px] text-emerald-400 font-mono">{(compositeScore * 10).toFixed(0)}%</span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${compositeScore * 10}%` }} />
                            </div>
                        </div>
                        <PerformanceChart />
                        <div className="grid grid-cols-2 gap-4 mt-4 py-4 border-t border-gray-800/50">
                            <div>
                                <p className="text-[8px] text-gray-600 uppercase font-bold mb-1 tracking-widest">Avg Response</p>
                                <p className="text-xl font-black text-gray-200 font-mono tracking-tighter">1.2<span className="text-xs text-gray-600 ml-1">s</span></p>
                            </div>
                            <div>
                                <p className="text-[8px] text-gray-600 uppercase font-bold mb-1 tracking-widest">Success Rate</p>
                                <p className="text-xl font-black text-blue-400 font-mono tracking-tighter">99.8<span className="text-xs text-gray-600 ml-1">%</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Agent Matrix & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <div className="lg:col-span-6 aegis-card overflow-hidden">
                    <div className="p-5 border-b border-gray-800/50 flex items-center justify-between bg-gray-900/20">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">LLM Agent Swarm Status</h3>
                        <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ONLINE</div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> IDLE</div>
                        </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {agents.map((agent) => (
                            <AgentCard key={agent.name} agent={agent} />
                        ))}
                        <div className="aegis-card p-3 border-dashed border-gray-800 flex flex-col items-center justify-center opacity-40 hover:opacity-100 cursor-pointer transition-opacity">
                            <span className="material-symbols-outlined text-gray-600">add_circle</span>
                            <span className="text-[9px] font-bold text-gray-600 uppercase mt-1 tracking-widest">Deploy Agent</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 aegis-card overflow-hidden">
                    <div className="p-5 border-b border-gray-800/50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Executive Strategy Alerts</h3>
                        <span className="material-symbols-outlined text-gray-600 text-sm">notifications</span>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {alerts.map((alert, i) => (
                            <AlertBadge key={i} alert={alert} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 4: Research Swarm and Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <div className="lg:col-span-7 aegis-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Terminal Intelligence Terminal</h2>
                            <p className="text-[10px] text-gray-600 font-medium mt-1 uppercase">Automated Market Research Swarm</p>
                        </div>
                        <div className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] font-mono text-purple-400">
                           3 AGENT CROSS-VALIDATION
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input 
                                type="text" 
                                value={researchSector} 
                                onChange={(e) => setResearchSector(e.target.value)}
                                placeholder="Sector Target..." 
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-xs text-gray-300 focus:outline-none focus:border-blue-500/40 font-mono"
                            />
                        </div>
                        <button onClick={handleResearch} disabled={researchLoading}
                            className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black transition-all disabled:opacity-50 uppercase tracking-widest flex items-center gap-2">
                             {researchLoading ? 'Executing...' : 'Execute Scan'} <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        </button>
                    </div>
                    
                    {researchResult && (
                        <div className="mt-6 p-4 bg-gray-950/50 border border-gray-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Verdict: {researchResult.go_no_go?.overall_verdict}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed italic">"{researchResult.executive_summary}"</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-3 aegis-card p-5 relative overflow-hidden group">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Efficiency Profile</h3>
                    <WorkloadDistribution />
                    <div className="mt-8 pt-6 border-t border-gray-800/50">
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                            <span>Cost Optimization</span>
                            <span className="text-emerald-400">-98.6%</span>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[98%]" />
                        </div>
                        <p className="text-[9px] text-gray-600 mt-2 font-medium">LLM Token costs versus traditional labor overhead identified and minimized.</p>
                    </div>
                    {/* Decorative star / aura */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                </div>
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
