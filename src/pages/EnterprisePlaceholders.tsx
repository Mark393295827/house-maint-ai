import React, { useState, useEffect } from 'react';
import { getReports, getWorkers } from '../services/api';
import type { Report, Worker } from '../types';
import MetricsDashboard from './MetricsDashboard';
import { useLanguage } from '../i18n/LanguageContext';

// ============ Tickets Page ============
export const TicketsPage: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const { t, locale } = useLanguage();

    useEffect(() => {
        getReports(null, 100, 0).then(res => {
            setReports(res.reports || []);
        }).finally(() => setLoading(false));
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-white text-[#ff9500] border-[#ff9500]/20';
            case 'matching': return 'bg-white text-[#1a73e8] border-[#1a73e8]/20';
            case 'matched': return 'bg-white text-[#a142f4] border-[#a142f4]/20';
            case 'in_progress': return 'bg-white text-[#32ade6] border-[#32ade6]/20';
            case 'completed': return 'bg-white text-[#34a853] border-[#34a853]/20';
            default: return 'bg-white text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="page-enter">
            <div className="mb-10 lg:mb-14">
                <h1 className="text-4xl font-black text-black tracking-tighter">{t('enterprise.tickets.title')}</h1>
                <p className="text-[14px] font-black text-[#86868b] mt-2">{t('enterprise.tickets.subtitle')}</p>
            </div>
            
            {loading ? (
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/40 rounded-2xl border border-white/40" />)}
                </div>
            ) : (
                <div className="ent-card overflow-hidden bg-white/30 ent-glass">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead className="text-[10px] font-black uppercase tracking-[0.25em] bg-white/40 border-b border-black/5 text-[#86868b]">
                                <tr>
                                    <th className="px-10 py-6">{t('enterprise.tickets.columns.id')}</th>
                                    <th className="px-10 py-6">{t('enterprise.tickets.columns.title')}</th>
                                    <th className="px-10 py-6">{t('enterprise.tickets.columns.category')}</th>
                                    <th className="px-10 py-6">{t('enterprise.tickets.columns.status')}</th>
                                    <th className="px-10 py-6">{t('enterprise.tickets.columns.assignee')}</th>
                                    <th className="px-10 py-6 text-right">{t('enterprise.tickets.columns.date')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 bg-white/20">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-white/60 transition-all duration-300 group">
                                        <td className="px-10 py-6 font-mono text-[12px] text-[#86868b]">#{report.id}</td>
                                        <td className="px-10 py-6">
                                            <div className="text-[15px] font-black text-black group-hover:text-[#1a73e8] transition-colors tracking-tight">{report.title}</div>
                                            <div className="text-[11px] text-[#86868b] font-black mt-1 truncate max-w-sm line-clamp-1">{report.description}</div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className="text-[13px] font-bold text-[#424245] capitalize">{report.category || t('enterprise.workers.na')}</span>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`inline-flex items-center px-3.5 py-1.5 text-[10px] font-black rounded-full border ${getStatusColor(report.status)} uppercase tracking-widest shadow-sm`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                                    report.status === 'completed' ? 'bg-[#34a853]' : 
                                                    report.status === 'in_progress' ? 'bg-[#32ade6]' : 
                                                    'bg-current'
                                                }`} />
                                                {t(`enterprise.tickets.status.${report.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6">
                                            {report.matched_worker_id ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-[11px] font-black text-blue-600 border border-blue-500/20 shadow-sm">
                                                        <span className="material-symbols-outlined text-[16px]">engineering</span>
                                                    </div>
                                                    <span className="text-[13px] font-black text-black">{t('enterprise.tickets.workerId', { id: report.matched_worker_id })}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[13px] font-bold text-[#86868b] italic opacity-60">{t('enterprise.tickets.unassigned')}</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right text-[13px] font-bold text-[#86868b] tabular-nums">
                                            {new Date(report.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {reports.length === 0 && (
                        <div className="px-10 py-24 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">receipt_long</span>
                            <p className="text-base text-[#86868b] font-black tracking-tight">{t('enterprise.tickets.empty')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============ Enterprise Workers Page ============
export const EnterpriseWorkersPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        getWorkers(undefined, true).then(res => {
            setWorkers(res.workers || []);
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="page-enter">
            <div className="mb-10 lg:mb-14">
                <h1 className="text-4xl font-black text-black tracking-tighter">{t('enterprise.workers.title')}</h1>
                <p className="text-[14px] font-black text-[#86868b] mt-2">{t('enterprise.workers.subtitle')}</p>
            </div>
            
            {loading ? (
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/40 rounded-2xl border border-white/40" />)}
                </div>
            ) : (
                <div className="ent-card overflow-hidden bg-white/30 ent-glass">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead className="text-[10px] font-black uppercase tracking-[0.25em] bg-white/40 border-b border-black/5 text-[#86868b]">
                                <tr>
                                    <th className="px-10 py-6">{t('enterprise.workers.columns.worker')}</th>
                                    <th className="px-10 py-6">{t('enterprise.workers.columns.phone')}</th>
                                    <th className="px-10 py-6">{t('enterprise.workers.columns.skills')}</th>
                                    <th className="px-10 py-6">{t('enterprise.workers.columns.rating')}</th>
                                    <th className="px-10 py-6 text-right">{t('enterprise.workers.columns.jobs') || 'Mission Count'}</th>
                                    <th className="px-10 py-6 text-right">{t('enterprise.workers.columns.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 bg-white/20">
                                {workers.map((worker) => (
                                    <tr key={worker.id} className="hover:bg-white/60 transition-all duration-400 group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                {worker.avatar ? (
                                                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-xl shadow-black/5 ring-1 ring-black/5 transition-transform group-hover:scale-105">
                                                        <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f8f9fa] to-white border-2 border-white shadow-xl shadow-black/5 ring-1 ring-black/5 flex items-center justify-center text-[15px] font-black text-[#86868b] transition-transform group-hover:scale-105">
                                                        {worker.name?.charAt(0) || 'W'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[15px] font-black text-black tracking-tight">{worker.name}</p>
                                                    <p className="text-[10px] text-[#86868b] font-black uppercase tracking-[0.15em] mt-1">{t('enterprise.workers.id', { id: worker.id })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 font-sans text-[13px] font-black text-black tabular-nums">{worker.phone || t('enterprise.workers.na')}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-wrap gap-2">
                                                {worker.skills?.slice(0, 3).map(skill => (
                                                    <span key={skill} className="px-3 py-1 text-[9px] font-black bg-white text-black rounded-lg border border-black/5 shadow-sm uppercase tracking-tighter">{skill}</span>
                                                ))}
                                                {worker.skills?.length > 3 && <span className="px-3 py-1 text-[9px] font-black bg-white text-[#86868b] rounded-lg border border-black/5 shadow-sm">+{worker.skills.length - 3}</span>}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px] text-[#ff9500]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                <span className="text-[14px] font-black text-black tabular-nums">{worker.rating?.toFixed(1) || '5.0'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right text-[14px] font-black text-[#202124] tabular-nums">{worker.total_jobs || 0}</td>
                                        <td className="px-10 py-6 text-right">
                                            <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors shadow-sm ${
                                                worker.available ? 'bg-white text-[#34a853] border-[#34a853]/20' : 'bg-white text-slate-400 border-slate-100'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${worker.available ? 'bg-[#34a853]' : 'bg-slate-300'}`} />
                                                {worker.available ? t('enterprise.workers.available') : t('enterprise.workers.offline')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============ Properties Page (Sanya Mock) ============
export const PropertiesPage: React.FC = () => {
    const { t } = useLanguage();
    const properties = [
        { id: 'SY-001', name: 'Yalong Bay Villa 4B', units: 12, status: 'active', alerts: 0, lastCheck: 'twoHours' },
        { id: 'SY-002', name: 'Sanya Bay Resort Condos', units: 45, status: 'active', alerts: 2, lastCheck: 'fiveHours' },
        { id: 'SY-003', name: 'Haitang Bay Premium Suites', units: 8, status: 'maintenance', alerts: 1, lastCheck: 'oneDay' },
        { id: 'SY-004', name: 'Dadonghai Seaview Apts', units: 24, status: 'active', alerts: 0, lastCheck: 'thirtyMins' },
    ];

    return (
        <div className="page-enter">
            <div className="mb-10 lg:mb-14 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter">{t('enterprise.properties.title')}</h1>
                    <p className="text-[14px] font-black text-[#86868b] mt-2">{t('enterprise.properties.subtitle')}</p>
                </div>
                <button className="px-8 py-3.5 bg-[#1a73e8] text-white rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-blue-600 transition-all duration-400 active:scale-95 flex items-center gap-2.5 shadow-xl shadow-blue-500/25">
                    <span className="material-symbols-outlined text-[20px] font-light">add_circle</span>
                    {t('enterprise.properties.add')}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                <div className="ent-card p-8 bg-white/60 ent-glass">
                    <p className="text-[11px] text-[#86868b] uppercase font-black tracking-[0.2em]">{t('enterprise.properties.metrics.totalProps')}</p>
                    <div className="flex items-baseline gap-3 mt-4">
                        <p className="text-5xl font-black text-black tracking-tighter">4</p>
                        <span className="text-[12px] font-black text-[#86868b] uppercase tracking-wider">{t('enterprise.properties.metrics.regions')}</span>
                    </div>
                </div>
                <div className="ent-card p-8 bg-white/60 ent-glass">
                    <p className="text-[11px] text-[#86868b] uppercase font-black tracking-[0.2em]">{t('enterprise.properties.metrics.totalUnits')}</p>
                    <div className="flex items-baseline gap-3 mt-4">
                        <p className="text-5xl font-black text-black tracking-tighter">89</p>
                        <span className="text-[12px] font-black text-[#86868b] uppercase tracking-wider">{t('enterprise.properties.metrics.activeUnits')}</span>
                    </div>
                </div>
                <div className="ent-card p-8 border-[#ff3b30]/10 bg-white/60 ent-glass">
                    <p className="text-[11px] text-[#ff3b30] uppercase font-black tracking-[0.2em]">{t('enterprise.properties.metrics.activeAlerts')}</p>
                    <div className="flex items-baseline gap-3 mt-4">
                        <p className="text-5xl font-black text-[#ff3b30] tracking-tighter">3</p>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] animate-ping" />
                    </div>
                </div>
            </div>

            <div className="ent-card overflow-hidden bg-white/30 ent-glass">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="text-[10px] font-black uppercase tracking-[0.25em] bg-white/40 border-b border-black/5 text-[#86868b]">
                            <tr>
                                <th className="px-10 py-6">{t('enterprise.properties.columns.id')}</th>
                                <th className="px-10 py-6">{t('enterprise.properties.columns.name')}</th>
                                <th className="px-10 py-6">{t('enterprise.properties.columns.units')}</th>
                                <th className="px-10 py-6">{t('enterprise.properties.columns.status')}</th>
                                <th className="px-10 py-6">{t('enterprise.properties.columns.alerts')}</th>
                                <th className="px-10 py-6 text-right">{t('enterprise.properties.columns.inspected')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 bg-white/20">
                            {properties.map((prop) => (
                                <tr key={prop.id} className="hover:bg-white/60 transition-all duration-400 group">
                                    <td className="px-10 py-6 font-mono text-[12px] text-[#86868b]">#{prop.id}</td>
                                    <td className="px-10 py-6 font-black text-[15px] text-black group-hover:text-[#1a73e8] transition-colors tracking-tight">{prop.name}</td>
                                    <td className="px-10 py-6 font-black text-[14px] text-black tabular-nums tracking-tight">{prop.units}</td>
                                    <td className="px-10 py-6">
                                        <span className={`inline-flex items-center px-3.5 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest border border-current/20 shadow-sm ${
                                            prop.status === 'active' ? 'bg-white text-[#34a853]' : 'bg-white text-[#ff9500]'
                                        }`}>
                                            <div className="w-1.5 h-1.5 rounded-full mr-2 bg-current" />
                                            {t(`enterprise.properties.status.${prop.status}`)}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6">
                                        {prop.alerts > 0 ? (
                                            <div className="inline-flex items-center gap-2 text-[#ff3b30] font-black text-[11px] uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-red-100 shadow-sm">
                                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                                {t('enterprise.properties.warnings', { count: prop.alerts })}
                                            </div>
                                        ) : (
                                            <span className="text-[#86868b] font-black text-[11px] uppercase tracking-widest flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-black/5 shadow-sm">
                                                <span className="material-symbols-outlined text-[16px] text-[#34a853]">check_circle</span>
                                                {t('enterprise.properties.clear')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-right text-[12px] font-black text-slate-400 uppercase tracking-widest">{t(`enterprise.properties.lastCheck.${prop.lastCheck}`)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ============ Analytics Page ============
export const AnalyticsPage: React.FC = () => (
    <div className="page-enter -m-10 lg:-m-14">
        {/* Fill the layout with the MetricsDashboard */}
        <MetricsDashboard />
    </div>
);
