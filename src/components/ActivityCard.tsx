
import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import { useReports } from '../hooks/useReports';

interface ActivityCardProps {
    hasActivity?: boolean;
}

const ActivityCard = ({ hasActivity: _hasActivity = true }: ActivityCardProps) => {
    const { t, locale } = useLanguage();
    const navigate = useNavigate();

    // Fetch recent pending reports
    const { data: reportsData, isLoading } = useReports('pending', 1);

    // Determine active task based on API data
    const activeReport = reportsData?.reports?.[0];
    const hasActiveTask = !!activeReport;

    // Empty state
    if (!hasActiveTask && !isLoading) {
        return (
            <section className="px-5 page-enter" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-lg font-bold">{t('activity.title')}</h3>
                </div>
                <div className="bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-[48px] text-gray-300 dark:text-gray-600">task_alt</span>
                    <p className="text-sm text-text-sub-light dark:text-text-sub-dark font-medium">
                        {locale === 'zh' ? '一切正常！没有进行中的活动' : 'All clear! No ongoing activities'}
                    </p>
                    <button
                        onClick={() => navigate('/diagnosis')}
                        className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors press-scale"
                    >
                        {locale === 'zh' ? '开始新检查' : 'Start a new check'}
                    </button>
                </div>
            </section>
        );
    }

    if (isLoading) {
        return (
            <section className="px-5 page-enter" style={{ animationDelay: '150ms' }}>
                <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            </section>
        );
    }

    return (
        <section className="px-5 page-enter" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg font-bold">{t('activity.title')}</h3>
                <a className="text-sm font-semibold text-primary" href="#" onClick={(e) => { e.preventDefault(); navigate('/profile'); }}>{t('activity.viewAll')}</a>
            </div>
            <div
                className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-4 cursor-pointer press-scale"
                onClick={() => navigate(activeReport ? `/reports/${activeReport.id}` : '/repair')}
            >
                <div className="flex gap-4">
                    <div className="size-16 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full"
                            style={{ backgroundImage: `url("${activeReport ? (activeReport.image_urls?.[0] || IMAGES.LEAKING_PIPE) : IMAGES.LEAKING_PIPE}")` }}
                            aria-label={activeReport?.title || "Active task"}
                        >
                        </div>
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                        <h4 className="font-bold text-text-main-light dark:text-text-main-dark truncate">{activeReport?.title || t('activity.leakingPipe')}</h4>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1">{activeReport?.status || t('activity.step')}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[24px]">play_arrow</span>
                        </div>
                    </div>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: "50%" }}></div>
                </div>
            </div>
        </section>
    );
};

export default ActivityCard;
