import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import EnterpriseLayout from '../components/EnterpriseLayout';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PropertiesPage, TicketsPage, EnterpriseWorkersPage, AnalyticsPage } from './EnterprisePlaceholders';

// Placeholder interfaces for data
interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, trendUp, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
            </div>
            <div className="p-2 bg-primary-50 rounded-lg text-2xl">
                {icon}
            </div>
        </div>
        {trend && (
            <div className={`mt-4 flex items-center text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                <span>{trendUp ? '↑' : '↓'}</span>
                <span className="ml-1 font-medium">{trend}</span>
                <span className="text-gray-400 ml-1">vs last month</span>
            </div>
        )}
    </div>
);

const EnterpriseDashboardHome: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [stats] = useState({
        activeTickets: 24,
        availableWorkers: 8,
        pendingApprovals: 3,
        satisfaction: 4.8
    });

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    {t('greeting', { defaultValue: 'Welcome back' })}, {user?.name || 'Manager'}
                </h1>
                <p className="text-gray-500 mt-1">Here's what's happening across your properties today.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Active Tickets"
                    value={stats.activeTickets}
                    trend="12%"
                    trendUp={true}
                    icon="🎫"
                />
                <MetricCard
                    title="Available Workers"
                    value={stats.availableWorkers}
                    trend="2"
                    trendUp={false}
                    icon="👷"
                />
                <MetricCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    trend="5%"
                    trendUp={true}
                    icon="📝"
                />
                <MetricCard
                    title="Tenant Satisfaction"
                    value={stats.satisfaction}
                    trend="0.2"
                    trendUp={true}
                    icon="⭐"
                />
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart / List Area */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Recent Maintenance Requests</h2>
                        <button className="text-sm text-primary-600 font-medium hover:text-primary-700">View All</button>
                    </div>
                    {/* Placeholder Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-sm text-gray-500">
                                    <th className="pb-3 font-medium">Ticket ID</th>
                                    <th className="pb-3 font-medium">Issue</th>
                                    <th className="pb-3 font-medium">Property</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Worker</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                        <td className="py-4 text-gray-600">#TK-{1000 + i}</td>
                                        <td className="py-4 font-medium text-gray-900">Leaking Faucet</td>
                                        <td className="py-4 text-gray-600">Unit 40{i}</td>
                                        <td className="py-4">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                                                In Progress
                                            </span>
                                        </td>
                                        <td className="py-4 text-gray-600">Wang Shifu</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Side Panel / Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Dispatch</h2>
                        <div className="space-y-3">
                            <button className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                                + New Work Order
                            </button>
                            <button className="w-full py-2 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors">
                                Add Tenant
                            </button>
                            <button className="w-full py-2 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors">
                                Broadcast Message
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2">AI Insights</h3>
                        <p className="text-sm text-blue-800 mb-4">
                            Predictive analysis suggests 3 HVAC units in Building A may require service soon based on recent patterns.
                        </p>
                        <button className="text-sm font-medium text-blue-700 hover:text-blue-900">
                            View Analysis →
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

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
