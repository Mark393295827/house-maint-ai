import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLanguage } from '../i18n/LanguageContext';
import { useReport } from '../hooks/useReports';

const statusTone: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    matching: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    matched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const formatDate = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const ReportDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { data, isLoading, isError } = useReport(id || '');
    const report = data?.report;

    const handleFindWorker = () => {
        if (!report) return;
        sessionStorage.setItem('lastReportId', String(report.id));
        const params = new URLSearchParams({ report_id: String(report.id) });
        if (report.category) params.set('category', report.category);
        navigate(`/match?${params.toString()}`);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <LoadingSpinner />
            </div>
        );
    }

    if (isError || !report) {
        return (
            <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background-light px-6 py-10 text-center dark:bg-background-dark">
                <span className="material-symbols-outlined mx-auto mb-4 text-5xl text-gray-300">error</span>
                <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                    {t('reports.detail.notFound')}
                </h1>
                <button
                    type="button"
                    onClick={() => navigate('/cases')}
                    className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                >
                    {t('reports.detail.backToCases')}
                </button>
            </div>
        );
    }

    return (
        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-background-light pb-[90px] shadow-2xl dark:bg-background-dark">
            <header className="sticky top-0 z-10 bg-background-light/90 px-6 pb-4 pt-6 backdrop-blur-md dark:bg-background-dark/90">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        aria-label={t('reports.detail.back')}
                        className="text-text-main-light dark:text-text-main-dark"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-sub-light dark:text-text-sub-dark">
                            {t('reports.detail.eyebrow', { id: report.id })}
                        </p>
                        <h1 className="truncate text-xl font-bold text-text-main-light dark:text-text-main-dark">
                            {report.title}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 space-y-4 px-6 pt-2">
                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[report.status] || statusTone.pending}`}>
                            {t(`profile.status.${report.status}`, { defaultValue: report.status })}
                        </span>
                        <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                            {formatDate(report.created_at)}
                        </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-widest text-text-sub-light dark:text-text-sub-dark">
                                {t('reports.detail.category')}
                            </dt>
                            <dd className="mt-1 font-semibold text-text-main-light dark:text-text-main-dark">
                                {report.category || t('reports.detail.unknown')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-widest text-text-sub-light dark:text-text-sub-dark">
                                {t('reports.detail.worker')}
                            </dt>
                            <dd className="mt-1 font-semibold text-text-main-light dark:text-text-main-dark">
                                {report.matched_worker_id
                                    ? t('reports.detail.workerId', { id: report.matched_worker_id })
                                    : t('reports.detail.unassigned')}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
                    <h2 className="mb-2 text-sm font-bold text-text-main-light dark:text-text-main-dark">
                        {t('reports.detail.description')}
                    </h2>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-sub-light dark:text-text-sub-dark">
                        {report.description}
                    </p>
                </section>

                <section className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleFindWorker}
                        className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20"
                    >
                        {t('reports.detail.findWorker')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/repair/${report.id}`)}
                        className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                        {t('reports.detail.repairGuide')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/messages')}
                        className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                        {t('reports.detail.messages')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/review/${report.id}`)}
                        disabled={report.status !== 'completed'}
                        className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-200"
                    >
                        {t('reports.detail.review')}
                    </button>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};

export default ReportDetailPage;
