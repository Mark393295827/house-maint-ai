import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import EnterpriseLayout from '../components/EnterpriseLayout';
import { useAuth } from '../contexts/AuthContext';
import { PropertiesPage, TicketsPage, EnterpriseWorkersPage, AnalyticsPage } from './EnterprisePlaceholders';
import EnterpriseAIConfigPage from './EnterpriseAIConfigPage';
import EnterpriseMap from '../components/EnterpriseMap';
import { PerformanceChart, WorkloadDistribution } from '../components/OperationCharts';
import { post } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { getOperatingStageCopies, getOperationalResults, type OperatingStageCopy } from '../constants/operatingModel';
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

const DimensionCard: React.FC<{ dim: DimensionScore; label: string }> = ({ dim, label }) => (
    <div className="ent-card p-4 sm:p-5 lg:p-7 group hover:-translate-y-1.5 transition-all duration-500 bg-white/60">
        <div className="flex items-center justify-between gap-4 mb-6 lg:mb-8">
            <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b]">{label}</span>
                <h3 className="text-base font-black text-[#1d1d1f] tracking-tight">{dim.name}</h3>
            </div>
            <div className="relative flex items-center justify-center p-2 bg-white/40 rounded-full border border-white/40 shadow-sm">
                <ScoreRing score={dim.score} max={dim.maxScore} color={dim.color} size={56} stroke={5} />
                <span className="absolute font-sans text-xs font-black text-black">
                    {(dim.score / dim.maxScore * 100).toFixed(0)}%
                </span>
            </div>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-black text-black tracking-tighter tabular-nums">{dim.score.toFixed(1)}</span>
            <span className="text-xs font-black text-[#86868b] uppercase tracking-wider">/ {dim.maxScore}</span>
        </div>
        <p className="text-[12px] text-[#86868b] font-medium leading-relaxed max-w-[95%]">{dim.description}</p>
        <div className="mt-6 lg:mt-8 h-1.5 bg-black/5 rounded-full overflow-hidden">
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

const AlertBadge: React.FC<{ alert: StrategyAlert; severityLabel: string }> = ({ alert, severityLabel }) => {
    const colors = {
        info: { bg: 'bg-white', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-600' },
        warning: { bg: 'bg-white', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-600' },
        critical: { bg: 'bg-white', text: 'text-red-700', border: 'border-red-100', dot: 'bg-red-600 animate-pulse' },
    };
    const c = colors[alert.severity];

    return (
        <div className={`ent-card p-4 mb-3 border ${c.border} ${c.bg} group/alert`}>
            <div className="flex items-start gap-4">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${c.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-black tracking-widest uppercase ${c.text}`}>
                            {severityLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">[{alert.rule_triggered}]</span>
                    </div>
                    <p className="text-[13px] text-black font-black leading-tight mb-2.5">{alert.recommended_action}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-black/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {alert.metric_name}: <span className={c.text}>{alert.metric_value.toFixed(1)}</span>
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover/alert:text-blue-600 transition-colors">arrow_forward</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AgentCard: React.FC<{ agent: AgentStatus; costLabel: string; callsLabel: string }> = ({ agent, costLabel, callsLabel }) => {
    const statusColors = {
        online: 'bg-[#28cd41]',
        idle: 'bg-[#ff9500]',
        error: 'bg-[#ff3b30] animate-pulse shadow-[0_0_8px_#ff3b3088]',
    };

    return (
        <div className="ent-card p-5 lg:p-6 border-white/20 group hover:border-[#007aff]/30 transition-all duration-500 bg-white/40">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColors[agent.status]}`} />
                    <h4 className="text-[13px] font-black text-[#1d1d1f] tracking-tight uppercase">{agent.name}</h4>
                </div>
                <div className="px-2 py-0.5 bg-black/5 rounded-md border border-black/5">
                   <span className="text-[9px] text-[#86868b] font-black uppercase tracking-widest">{agent.model}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                   <p className="text-[9px] text-[#86868b] uppercase font-black tracking-[0.15em] mb-1.5">{costLabel}</p>
                   <p className="font-sans text-sm font-black text-black tracking-tight">${agent.costToday.toFixed(4)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] text-[#86868b] uppercase font-black tracking-[0.15em] mb-1.5">{callsLabel}</p>
                    <p className="font-sans text-sm font-black text-black tracking-tight">{agent.callsToday.toLocaleString()}</p>
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

const OperatingLoopPanel: React.FC<{ stages: OperatingStageCopy[]; title: string; subtitle: string }> = ({ stages, title, subtitle }) => (
    <div className="ent-card overflow-hidden bg-white/60 ent-glass">
        <div className="border-b border-black/5 bg-white/40 p-4 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#007aff]">{title}</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-black sm:text-2xl">{subtitle}</h2>
        </div>
        <div className="grid grid-cols-1 gap-px bg-black/5 sm:grid-cols-2 xl:grid-cols-6">
            {stages.map((stage, index) => (
                <div key={stage.id} className="bg-white/80 p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef7f4] text-[#16745f]">
                            <span className="material-symbols-outlined text-[20px]">{stage.icon}</span>
                        </span>
                        <span className="font-mono text-[10px] font-black text-[#86868b]">S{index + 1}</span>
                    </div>
                    <h3 className="text-[13px] font-black leading-tight text-black">{stage.title}</h3>
                    <p className="mt-2 text-[11px] font-bold leading-5 text-[#86868b]">{stage.metric}</p>
                </div>
            ))}
        </div>
    </div>
);

const EnterpriseDashboardHome: React.FC = () => {
    const { user } = useAuth();
    const { t, locale } = useLanguage();
    const operatingLocale = locale === 'zh' ? 'zh' : 'en';
    const operatingStages = getOperatingStageCopies(operatingLocale);
    const resultMetrics = getOperationalResults(operatingLocale);
    const [researchSector, setResearchSector] = useState(() => t('enterprise.dashboard.research.defaultSector'));
    const [researchFocus] = useState(() => t('enterprise.dashboard.research.defaultFocus'));
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchResult, setResearchResult] = useState<any>(null);

    const handleResearch = async () => {
        setResearchLoading(true);
        try {
            const data = await post('/ai/research-market', { sector: researchSector, focusArea: researchFocus });
            setResearchResult(data);
        } catch (e) {
            console.error('Research failed:', e);
        } finally {
            setResearchLoading(false);
        }
    };

    const dimensions: DimensionScore[] = [
        { name: 'INTAKE', label: 'INTAKE', score: 8.8, maxScore: 10, icon: 'forum', color: '#007aff', description: resultMetrics[0].label },
        { name: 'DIAGNOSIS', label: 'DIAGNOSIS', score: 8.5, maxScore: 10, icon: 'camera_enhance', color: '#00c6ff', description: resultMetrics[1].label },
        { name: 'DEFLECT', label: 'DEFLECT', score: 7.2, maxScore: 10, icon: 'self_improvement', color: '#ff9500', description: resultMetrics[2].label },
        { name: 'WECHAT', label: 'WECHAT', score: 9.0, maxScore: 10, icon: 'hub', color: '#28cd41', description: resultMetrics[3].label },
    ];

    const compositeScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;

    const [agents] = useState<AgentStatus[]>([
        { name: 'IntakeAgent', status: 'online', lastCall: '1m ago', callsToday: 62, costToday: 0.031, model: 'gateway' },
        { name: 'DiagnosisAgent', status: 'online', lastCall: '2m ago', callsToday: 47, costToday: 0.094, model: 'gemini' },
        { name: 'DispatchAgent', status: 'online', lastCall: '5m ago', callsToday: 23, costToday: 0.048, model: 'ranker' },
        { name: 'VerificationAgent', status: 'idle', lastCall: '18m ago', callsToday: 14, costToday: 0.012, model: 'rules' },
    ]);

    const [alerts] = useState<StrategyAlert[]>([
        { severity: 'info', dimension: 'fin', rule_triggered: 'Rule 4', metric_name: 'margin', metric_value: 99.7, threshold: 50, recommended_action: 'enterprise.dashboard.alerts.marginHealthy', requires_human_approval: false },
        { severity: 'warning', dimension: 'team', rule_triggered: 'Rule 2', metric_name: 'ratio', metric_value: 3.0, threshold: 5, recommended_action: 'enterprise.dashboard.alerts.hireTianya', requires_human_approval: false },
    ]);

    // Added to resolve lint error for user if needed (proactive check)
    useEffect(() => {
        if (user) console.log('Aegis Terminal Active for:', user.name);
    }, [user]);

    return (
        <div className="space-y-5 lg:space-y-8 page-enter">
            <OperatingLoopPanel
                stages={operatingStages}
                title={locale === 'zh' ? '统一运营模型' : 'Unified operating model'}
                subtitle={locale === 'zh' ? '报修、分流、派单、验收和业主报表使用同一套状态机。' : 'Intake, deflection, dispatch, verification, and owner reporting now share one state machine.'}
            />

            {/* Row 1: 4D Strategy Health (Key Metics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-8">
                {dimensions.map((dim) => (
                    <DimensionCard key={dim.name} dim={dim} label={t('enterprise.dashboard.strategicDimension')} />
                ))}
            </div>

            {/* Row 2: Main Visualization (Map + Performance) */}
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-5 lg:gap-8">
                <div className="xl:col-span-7 ent-card overflow-hidden bg-white/50 ent-glass">
                    <div className="p-4 sm:p-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/40">
                        <div>
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">{t('enterprise.dashboard.map.title')}</h3>
                            <p className="text-[10px] text-[#007aff] font-black uppercase tracking-widest font-mono">{t('enterprise.dashboard.map.subtitle', { count: 12 })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_#2563eb]" /> 
                                <span className="text-[10px] text-blue-600 font-black font-mono tracking-widest">{t('enterprise.dashboard.map.live')}</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-sm cursor-pointer hover:text-blue-600 transition-colors">fullscreen</span>
                        </div>
                    </div>
                    <div className="h-[340px] sm:h-[420px] lg:h-[500px] relative">
                         <EnterpriseMap />
                    </div>
                </div>

                <div className="xl:col-span-3 ent-card p-4 sm:p-6 bg-white/80 ent-glass">
                    <div className="flex items-center justify-between gap-4 mb-6 lg:mb-8">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('enterprise.dashboard.systemLoad.title')}</h3>
                        <div className="flex items-center gap-2 bg-black/5 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            {t('enterprise.dashboard.systemLoad.realtime')} <span className="material-symbols-outlined text-[14px]">expand_more</span>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('enterprise.dashboard.systemLoad.diagnosisCapacity')}</span>
                                <span className="text-[11px] text-[#28cd41] font-black font-mono">{(compositeScore * 10).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#28cd41] to-[#00f260] rounded-full transition-all duration-1000 shadow-[0_0_10px_#28cd41]" style={{ width: `${compositeScore * 10}%` }} />
                            </div>
                        </div>
                        <PerformanceChart />
                        <div className="grid grid-cols-2 gap-4 mt-4 py-6 border-t border-black/5">
                            <div>
                                <p className="text-[9px] text-[#86868b] uppercase font-black mb-1.5 tracking-widest">{t('enterprise.dashboard.systemLoad.latency')}</p>
                                <p className="text-2xl font-black text-black tracking-tighter font-display">1.2<span className="text-xs text-slate-400 ml-1">ms</span></p>
                            </div>
                            <div>
                                <p className="text-[9px] text-[#86868b] uppercase font-black mb-1.5 tracking-widest">{t('enterprise.dashboard.systemLoad.success')}</p>
                                <p className="text-2xl font-black text-[#007aff] tracking-tighter font-display">99.9<span className="text-xs text-slate-400 ml-1">%</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Agent Swarm & Strategy Alerts */}
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-5 lg:gap-8">
                <div className="xl:col-span-6 ent-card overflow-hidden bg-white/50 ent-glass">
                    <div className="p-4 sm:p-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/40">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('enterprise.dashboard.agents.title')}</h3>
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#28cd41]" /> {t('enterprise.dashboard.agents.online')}</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ff9500]" /> {t('enterprise.dashboard.agents.idle')}</div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {agents.map((agent) => (
                            <AgentCard key={agent.name} agent={agent} costLabel={t('enterprise.dashboard.agents.computeCost')} callsLabel={t('enterprise.dashboard.agents.nodesHit')} />
                        ))}
                        <div className="ent-card p-4 border-dashed border-black/10 flex flex-col items-center justify-center opacity-40 hover:opacity-100 cursor-pointer transition-all hover:bg-white bg-transparent">
                            <span className="material-symbols-outlined text-slate-400 text-2xl">add_circle</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{t('enterprise.dashboard.agents.deploy')}</span>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 ent-card overflow-hidden bg-white/80 ent-glass">
                    <div className="p-4 sm:p-6 border-b border-black/5 flex items-center justify-between gap-4">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('enterprise.dashboard.alerts.title')}</h3>
                        <span className="material-symbols-outlined text-slate-400 text-sm">notifications_active</span>
                    </div>
                    <div className="p-4 sm:p-6 max-h-[400px] overflow-y-auto ent-scrollbar">
                        {alerts.map((alert, i) => (
                            <AlertBadge key={i} alert={{ ...alert, recommended_action: t(alert.recommended_action) }} severityLabel={t(`enterprise.dashboard.alerts.${alert.severity}`)} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 4: Research Swarm & Efficiency */}
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-5 lg:gap-8">
                <div className="xl:col-span-7 ent-card p-4 sm:p-6 lg:p-8 bg-white/60 ent-glass">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('enterprise.dashboard.research.title')}</h2>
                            <p className="text-[14px] text-slate-900 font-black tracking-tight uppercase">{t('enterprise.dashboard.research.subtitle')}</p>
                        </div>
                        <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest">
                           {t('enterprise.dashboard.research.validation')}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <input 
                                type="text" 
                                value={researchSector} 
                                onChange={(e) => setResearchSector(e.target.value)}
                                placeholder={t('enterprise.dashboard.research.sectorPlaceholder')} 
                                className="w-full bg-white border border-black/5 rounded-2xl px-5 py-4 text-sm text-black font-black focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                            />
                        </div>
                        <button onClick={handleResearch} disabled={researchLoading}
                            className="px-6 sm:px-8 py-4 bg-[#007aff] hover:bg-blue-600 text-white rounded-2xl text-[12px] font-black transition-all disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95">
                             {researchLoading ? t('enterprise.dashboard.research.executing') : t('enterprise.dashboard.research.execute')} <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                        </button>
                    </div>
                    
                    {researchResult && (
                        <div className="mt-6 p-6 bg-white rounded-2xl border border-black/5 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#28cd41] shadow-[0_0_8px_#28cd41]" />
                                <span className="text-[11px] font-black text-[#28cd41] uppercase tracking-[0.15em]">{t('enterprise.dashboard.research.verdict')}: {researchResult.go_no_go?.overall_verdict}</span>
                            </div>
                            <p className="text-[14px] text-slate-600 font-medium leading-relaxed italic">"{researchResult.executive_summary}"</p>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-3 ent-card p-4 sm:p-6 lg:p-8 relative overflow-hidden group bg-white/80 ent-glass">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 lg:mb-8">{t('enterprise.dashboard.efficiency.title')}</h3>
                    <WorkloadDistribution />
                    <div className="mt-8 pt-6 border-t border-black/5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">
                            <span>{t('enterprise.dashboard.efficiency.costOptimization')}</span>
                            <span className="text-[#28cd41] font-mono">-98.6%</span>
                        </div>
                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#28cd41] to-[#00f260] w-[98.6%] rounded-full shadow-[0_0_10px_rgba(40,205,65,0.3)]" />
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 leading-relaxed tracking-tight">{t('enterprise.dashboard.efficiency.description')}</p>
                    </div>
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
                <Route path="ai-config" element={<EnterpriseAIConfigPage />} />
            </Routes>
        </EnterpriseLayout>
    );
};

export default EnterpriseDashboard;
