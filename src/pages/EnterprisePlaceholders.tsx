import React, { useState, useEffect } from 'react';
import { getReports, getWorkers } from '../services/api';
import type { Report, Worker } from '../types';
import MetricsDashboard from './MetricsDashboard';
import { useLanguage } from '../i18n/LanguageContext';

// ============ Tickets Page ============
import { calculateSummaryMetrics, generateMonthlyCSV, downloadCSV } from '../utils/reportExport';

export const TicketsPage: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        getReports(null, 100, 0).then(res => {
            // Apply mock PM Dashboard fields if missing
            const enriched = (res.reports || []).map((r, i) => {
                const mockSeverity = ['Emergency', '48h', 'DIY'][i % 3] as 'Emergency' | '48h' | 'DIY';
                const mockFault = ['landlord', 'tenant', 'unconfirmed'][i % 3] as 'landlord' | 'tenant' | 'unconfirmed';
                return {
                    ...r,
                    ai_severity: r.ai_severity || mockSeverity,
                    fault_attribution: r.fault_attribution || mockFault,
                    duration_hours: r.duration_hours || Math.floor(Math.random() * 24),
                    anonymized_image: r.anonymized_image || 'https://via.placeholder.com/150/1e293b/cbd5e1?text=Face+Blurred'
                };
            });

            // Priority Queue Logic: Emergency > 48h > DIY
            enriched.sort((a, b) => {
               const priorityMap = { 'Emergency': 3, '48h': 2, 'DIY': 1 };
               return (priorityMap[b.ai_severity!] || 0) - (priorityMap[a.ai_severity!] || 0);
            });

            setReports(enriched);
        }).finally(() => setLoading(false));
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-white text-[#ff9500] border-[#ff9500]/20';
            case 'matching': return 'bg-white text-[#007aff] border-[#007aff]/20';
            case 'matched': return 'bg-white text-[#5856d6] border-[#5856d6]/20';
            case 'in_progress': return 'bg-white text-[#32ade6] border-[#32ade6]/20';
            case 'completed': return 'bg-white text-[#28cd41] border-[#28cd41]/20';
            default: return 'bg-white text-slate-500 border-slate-200';
        }
    };

    const getSeverityBadge = (severity?: string) => {
        switch (severity) {
            case 'Emergency': return 'bg-red-100 text-red-700 border-red-200';
            case '48h': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'DIY': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const getFaultBadge = (fault?: string) => {
        switch(fault) {
            case 'landlord': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'tenant': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200'; // unconfirmed
        }
    };

    const handleExportCSV = () => {
        const stats = calculateSummaryMetrics(reports);
        const csvStr = generateMonthlyCSV(reports, stats, '2026-04');
        downloadCSV(csvStr, 'report_2026_04.csv');
    };

    return (
        <div className="page-enter">
            <div className="mb-10 lg:mb-14 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter">Priority Queue</h1>
                    <p className="text-[14px] font-black text-[#86868b] mt-2">Triaged & Assessed via Multimodal Agent</p>
                </div>
                <button 
                  onClick={handleExportCSV}
                  className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
                  data-testid="export-csv-btn"
                >
                    Export Monthly CSV
                </button>
            </div>
            
            {loading ? (
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/40 rounded-2xl border border-white/40" />)}
                </div>
            ) : (
                <div className="ent-card overflow-hidden bg-white/30 ent-glass">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1200px]" data-testid="tickets-table">
                            <thead className="text-[10px] font-black uppercase tracking-[0.25em] bg-white/40 border-b border-black/5 text-[#86868b]">
                                <tr>
                                    <th className="px-6 py-6">Image</th>
                                    <th className="px-6 py-6">Property / Title</th>
                                    <th className="px-6 py-6">AI Priority</th>
                                    <th className="px-6 py-6">Fault Attribution</th>
                                    <th className="px-6 py-6 font-mono">Duration</th>
                                    <th className="px-6 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 bg-white/20">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-white/60 transition-all duration-300 group ticket-row" data-testid={`ticket-row-${report.id}`}>
                                        <td className="px-6 py-6">
                                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 relative">
                                                 <img src={report.anonymized_image} alt="Ticket" className="w-full h-full object-cover blur-[2px] hover:blur-none transition-all duration-300" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sanya #SY-{(report.id * 123) % 900}</div>
                                            <div className="text-[14px] font-black text-black group-hover:text-[#007aff] transition-colors">{report.title}</div>
                                            <div className="text-[12px] text-[#86868b] mt-1 pr-6 truncate max-w-sm">{report.description}</div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`inline-block px-3 py-1 font-bold text-[11px] uppercase tracking-widest border rounded-[6px] ${getSeverityBadge(report.ai_severity)}`}>
                                                {report.ai_severity}
                                            </span>
                                            <div className="text-[11px] text-slate-500 font-bold mt-2 capitalize">{report.category}</div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`inline-block px-3 py-1 font-bold text-[11px] uppercase tracking-widest border rounded-full ${getFaultBadge(report.fault_attribution)}`}>
                                                {report.fault_attribution}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-[13px] font-mono font-bold text-slate-600">
                                            {report.duration_hours} Hrs
                                        </td>
                                        <td className="px-6 py-6 text-right space-x-2">
                                            {report.ai_severity === 'DIY' ? (
                                                <button className="px-4 py-2 bg-green-50 text-green-700 font-bold text-[11px] uppercase tracking-widest rounded-lg border border-green-200 hover:bg-green-100 transition">
                                                    DIY 教程
                                                </button>
                                            ) : (
                                                <button className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-[11px] uppercase tracking-widest rounded-lg border border-blue-200 hover:bg-blue-100 transition" data-testid="dispatch-btn">
                                                    派单
                                                </button>
                                            )}
                                            <button className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-[11px] uppercase tracking-widest rounded-lg border border-slate-200 hover:bg-slate-200 transition">
                                                关闭工单
                                            </button>
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
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f5f5f7] to-white border-2 border-white shadow-xl shadow-black/5 ring-1 ring-black/5 flex items-center justify-center text-[15px] font-black text-[#86868b] transition-transform group-hover:scale-105">
                                                        {worker.name?.charAt(0) || 'W'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[15px] font-black text-black tracking-tight">{worker.name}</p>
                                                    <p className="text-[10px] text-[#86868b] font-black uppercase tracking-[0.15em] mt-1">{t('enterprise.workers.id').replace('{{id}}', worker.id.toString())}</p>
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
                                        <td className="px-10 py-6 text-right text-[14px] font-black text-[#1d1d1f] tabular-nums">{worker.total_jobs || 0}</td>
                                        <td className="px-10 py-6 text-right">
                                            <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors shadow-sm ${
                                                worker.available ? 'bg-white text-[#28cd41] border-[#28cd41]/20' : 'bg-white text-slate-400 border-slate-100'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${worker.available ? 'bg-[#28cd41]' : 'bg-slate-300'}`} />
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
        { id: 'SY-001', name: 'Yalong Bay Villa 4B', units: 12, status: 'Active', alerts: 0, lastCheck: '2 hrs ago' },
        { id: 'SY-002', name: 'Sanya Bay Resort Condos', units: 45, status: 'Active', alerts: 2, lastCheck: '5 hrs ago' },
        { id: 'SY-003', name: 'Haitang Bay Premium Suites', units: 8, status: 'Maintenance', alerts: 1, lastCheck: '1 day ago' },
        { id: 'SY-004', name: 'Dadonghai Seaview Apts', units: 24, status: 'Active', alerts: 0, lastCheck: '30 mins ago' },
    ];

    return (
        <div className="page-enter">
            <div className="mb-10 lg:mb-14 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter">{t('enterprise.properties.title')}</h1>
                    <p className="text-[14px] font-black text-[#86868b] mt-2">{t('enterprise.properties.subtitle')}</p>
                </div>
                <button className="px-8 py-3.5 bg-[#007aff] text-white rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-blue-600 transition-all duration-400 active:scale-95 flex items-center gap-2.5 shadow-xl shadow-blue-500/25">
                    <span className="material-symbols-outlined text-[20px] font-light">add_circle</span>
                    {t('enterprise.properties.add')}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                <div className="ent-card p-8 bg-white/60 ent-glass">
                    <p className="text-[11px] text-[#86868b] uppercase font-black tracking-[0.2em]">{t('enterprise.properties.metrics.totalProps')}</p>
                    <div className="flex items-baseline gap-3 mt-4">
                        <p className="text-5xl font-black text-black tracking-tighter">4</p>
                        <span className="text-[12px] font-black text-[#86868b] uppercase tracking-wider">Regions</span>
                    </div>
                </div>
                <div className="ent-card p-8 bg-white/60 ent-glass">
                    <p className="text-[11px] text-[#86868b] uppercase font-black tracking-[0.2em]">{t('enterprise.properties.metrics.totalUnits')}</p>
                    <div className="flex items-baseline gap-3 mt-4">
                        <p className="text-5xl font-black text-black tracking-tighter">89</p>
                        <span className="text-[12px] font-black text-[#86868b] uppercase tracking-wider">Active Units</span>
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
                                    <td className="px-10 py-6 font-black text-[15px] text-black group-hover:text-[#007aff] transition-colors tracking-tight">{prop.name}</td>
                                    <td className="px-10 py-6 font-black text-[14px] text-black tabular-nums tracking-tight">{prop.units}</td>
                                    <td className="px-10 py-6">
                                        <span className={`inline-flex items-center px-3.5 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest border border-current/20 shadow-sm ${
                                            prop.status === 'Active' ? 'bg-white text-[#28cd41]' : 'bg-white text-[#ff9500]'
                                        }`}>
                                            <div className="w-1.5 h-1.5 rounded-full mr-2 bg-current" />
                                            {prop.status}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6">
                                        {prop.alerts > 0 ? (
                                            <div className="inline-flex items-center gap-2 text-[#ff3b30] font-black text-[11px] uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-red-100 shadow-sm">
                                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                                {t('enterprise.properties.warnings').replace('{{count}}', prop.alerts.toString())}
                                            </div>
                                        ) : (
                                            <span className="text-[#86868b] font-black text-[11px] uppercase tracking-widest flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-black/5 shadow-sm">
                                                <span className="material-symbols-outlined text-[16px] text-[#28cd41]">check_circle</span>
                                                {t('enterprise.properties.clear')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-right text-[12px] font-black text-slate-400 uppercase tracking-widest">{prop.lastCheck}</td>
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
