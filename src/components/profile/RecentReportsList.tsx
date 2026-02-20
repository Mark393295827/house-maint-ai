import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { Report, User } from '../../types';

interface RecentReportsListProps {
    user: User | null;
    reports: Report[];
    loading: boolean;
    onCompleteJob: (reportId: number, e: React.MouseEvent) => void;
}

const RecentReportsList: React.FC<RecentReportsListProps> = ({
    user,
    reports,
    loading,
    onCompleteJob
}) => {
    const { t } = useLanguage();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-gray-100 text-gray-500';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const getStatusText = (status: string) => {
        return t(`profile.status.${status}`) || status;
    };

    return (
        <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                    {user?.role === 'worker' ? 'Assigned Jobs' : t('profile.reports.title')}
                </h3>
                <Link to="/quick-report" className="text-xs text-primary font-bold">
                    {t('profile.reports.viewAll')}
                </Link>
            </div>

            {loading ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            ) : reports.length > 0 ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    {reports.slice(0, 5).map((report, index) => (
                        <div
                            key={report.id}
                            className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${index !== reports.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                                }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-xl">build</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-text-main-light dark:text-text-main-dark text-sm truncate">
                                    {report.title || report.description?.substring(0, 30)}
                                </p>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                    {new Date(report.created_at).toLocaleDateString('zh-CN')}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                    {getStatusText(report.status)}
                                </span>
                                {user?.role === 'worker' &&
                                    report.status !== 'completed' &&
                                    report.status !== 'cancelled' && (
                                        <button
                                            onClick={(e) => onCompleteJob(report.id, e)}
                                            className="text-xs bg-green-500 text-white px-2 py-1 rounded shadow-sm hover:bg-green-600"
                                        >
                                            Complete
                                        </button>
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">inbox</span>
                    <p className="text-sm text-text-sub-light dark:text-text-sub-dark">{t('profile.reports.empty')}</p>
                    <Link
                        to="/quick-report"
                        className="inline-block mt-3 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg"
                    >
                        {t('profile.reports.create')}
                    </Link>
                </div>
            )}
        </div>
    );
};

export default RecentReportsList;
