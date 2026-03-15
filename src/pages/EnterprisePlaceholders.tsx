import React, { useState, useEffect } from 'react';
import { getReports, getWorkers } from '../services/api';
import type { Report, Worker } from '../types';
import MetricsDashboard from './MetricsDashboard';
import { useLanguage } from '../i18n/LanguageContext';

// ============ Tickets Page ============
export const TicketsPage: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        getReports(null, 100, 0).then(res => {
            setReports(res.reports || []);
        }).finally(() => setLoading(false));
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
            case 'matching': return 'bg-blue-500/20 text-blue-500 border border-blue-500/30';
            case 'matched': return 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30';
            case 'in_progress': return 'bg-purple-500/20 text-purple-500 border border-purple-500/30';
            case 'completed': return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30';
            default: return 'bg-gray-500/20 text-gray-500 border border-gray-500/30';
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-200">{t('enterprise.tickets.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('enterprise.tickets.subtitle')}</p>
            </div>
            
            {loading ? (
                <div className="animate-pulse flex flex-col gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-dark rounded-xl" />)}
                </div>
            ) : (
                <div className="bg-surface-dark rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-gray-900 border-b border-gray-800 text-gray-500">
                            <tr>
                                <th className="px-6 py-4">{t('enterprise.tickets.columns.id')}</th>
                                <th className="px-6 py-4">{t('enterprise.tickets.columns.title')}</th>
                                <th className="px-6 py-4">{t('enterprise.tickets.columns.category')}</th>
                                <th className="px-6 py-4">{t('enterprise.tickets.columns.status')}</th>
                                <th className="px-6 py-4">{t('enterprise.tickets.columns.assignee')}</th>
                                <th className="px-6 py-4">{t('enterprise.tickets.columns.date')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.id} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-mono">#{report.id}</td>
                                    <td className="px-6 py-4 text-gray-200 font-medium">{report.title}</td>
                                    <td className="px-6 py-4 capitalize">{report.category || 'Other'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${getStatusColor(report.status)} uppercase tracking-wider`}>
                                            {t(`enterprise.tickets.status.${report.status}`)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{report.matched_worker_id ? <span className="text-primary-light">{t('enterprise.tickets.workerId').replace('{{id}}', report.matched_worker_id.toString())}</span> : t('enterprise.tickets.unassigned')}</td>
                                    <td className="px-6 py-4">{new Date(report.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('enterprise.tickets.empty')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-200">{t('enterprise.workers.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('enterprise.workers.subtitle')}</p>
            </div>
            
            {loading ? (
                <div className="animate-pulse flex flex-col gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-dark rounded-xl" />)}
                </div>
            ) : (
                <div className="bg-surface-dark rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-gray-900 border-b border-gray-800 text-gray-500">
                            <tr>
                                <th className="px-6 py-4">{t('enterprise.workers.columns.worker')}</th>
                                <th className="px-6 py-4">{t('enterprise.workers.columns.phone')}</th>
                                <th className="px-6 py-4">{t('enterprise.workers.columns.skills')}</th>
                                <th className="px-6 py-4">{t('enterprise.workers.columns.rating')}</th>
                                <th className="px-6 py-4">{t('enterprise.workers.columns.jobs')}</th>
                                <th className="px-6 py-4">{t('enterprise.workers.columns.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((worker) => (
                                <tr key={worker.id} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {worker.avatar ? (
                                                <img src={worker.avatar} alt={worker.name} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                                                    {worker.name?.charAt(0) || 'W'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-gray-200 font-medium">{worker.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{t('enterprise.workers.id').replace('{{id}}', worker.id.toString())}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{worker.phone || t('enterprise.workers.na')}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {worker.skills?.slice(0, 2).map(skill => (
                                                <span key={skill} className="px-2 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded-full border border-gray-700">{skill}</span>
                                            ))}
                                            {worker.skills?.length > 2 && <span className="px-2 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded-full border border-gray-700">+{worker.skills.length - 2}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            <span className="font-medium text-gray-200">{worker.rating?.toFixed(1) || '5.0'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-200">{worker.total_jobs || 0}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-medium ${worker.available ? 'text-emerald-400' : 'text-gray-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${worker.available ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                            {worker.available ? t('enterprise.workers.available') : t('enterprise.workers.offline')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {workers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('enterprise.workers.empty')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-200">{t('enterprise.properties.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('enterprise.properties.subtitle')}</p>
                </div>
                <button className="px-4 py-2 bg-primary/20 text-primary-light border border-primary/30 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-colors">
                    {t('enterprise.properties.add')}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="telemetry-card rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{t('enterprise.properties.metrics.totalProps')}</p>
                    <p className="font-telemetry text-3xl font-bold text-gray-200 mt-2">4</p>
                </div>
                <div className="telemetry-card rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{t('enterprise.properties.metrics.totalUnits')}</p>
                    <p className="font-telemetry text-3xl font-bold text-gray-200 mt-2">89</p>
                </div>
                <div className="telemetry-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
                    <p className="text-xs text-amber-500 uppercase font-bold tracking-widest">{t('enterprise.properties.metrics.activeAlerts')}</p>
                    <p className="font-telemetry text-3xl font-bold text-amber-400 mt-2">3</p>
                </div>
            </div>

            <div className="bg-surface-dark rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase bg-gray-900 border-b border-gray-800 text-gray-500">
                        <tr>
                            <th className="px-6 py-4">{t('enterprise.properties.columns.id')}</th>
                            <th className="px-6 py-4">{t('enterprise.properties.columns.name')}</th>
                            <th className="px-6 py-4">{t('enterprise.properties.columns.units')}</th>
                            <th className="px-6 py-4">{t('enterprise.properties.columns.status')}</th>
                            <th className="px-6 py-4">{t('enterprise.properties.columns.alerts')}</th>
                            <th className="px-6 py-4">{t('enterprise.properties.columns.inspected')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.map((prop) => (
                            <tr key={prop.id} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 font-mono text-gray-500">{prop.id}</td>
                                <td className="px-6 py-4 text-gray-200 font-medium">{prop.name}</td>
                                <td className="px-6 py-4 font-mono">{prop.units}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                                        prop.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {prop.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {prop.alerts > 0 ? (
                                        <span className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                                            {t('enterprise.properties.warnings').replace('{{count}}', prop.alerts.toString())}
                                        </span>
                                    ) : (
                                        <span className="text-gray-500 italic">{t('enterprise.properties.clear')}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-500">{prop.lastCheck}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============ Analytics Page ============
export const AnalyticsPage: React.FC = () => (
    <div className="-m-6 lg:-m-8">
        {/* We use negative margins to pull the MetricsDashboard out so it looks more native */}
        <MetricsDashboard />
    </div>
);
