
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

    const { data: reportsData, isLoading } = useReports('pending', 1);
    const activeReport = reportsData?.reports?.[0];
    const hasActiveTask = !!activeReport;

    if (!hasActiveTask && !isLoading) {
        return (
            <section className="px-5 page-enter" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-lg font-extrabold font-display">{t('activity.title')}</h3>
                </div>
                <div className="glass dark:glass-dark p-8 rounded-3xl flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px] gradient-text">task_alt</span>
                    </div>
                    <p className="text-sm text-text-sub-light dark:text-text-sub-dark font-medium">
                        {locale === 'zh' ? '一切正常！没有进行中的活动' : 'All clear! No ongoing activities'}
                    </p>
                    <button
                        onClick={() => navigate('/diagnosis')}
                        className="text-xs font-bold text-white bg-gradient-to-r from-primary to-accent px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all press-scale hover:shadow-xl"
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
                <div className="h-40 glass dark:glass-dark rounded-3xl animate-pulse" />
            </section>
        );
    }

    return (
        <section className="px-5 page-enter" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg font-extrabold font-display">{t('activity.title')}</h3>
                <a className="text-sm font-semibold gradient-text" href="#" onClick={(e) => { e.preventDefault(); navigate('/profile'); }}>{t('activity.viewAll')}</a>
            </div>
            <div
                className="glass dark:glass-dark p-4 rounded-3xl flex flex-col gap-4 cursor-pointer press-scale hover:shadow-lg hover:shadow-primary/10 transition-all"
                onClick={() => navigate(activeReport ? `/reports/${activeReport.id}` : '/repair')}
            >
                <div className="flex gap-4">
                    <div className="size-16 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 ring-1 ring-white/10">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full"
                            style={{ backgroundImage: `url("${activeReport ? (activeReport.image_urls?.[0] || IMAGES.LEAKING_PIPE) : IMAGES.LEAKING_PIPE}")` }}
                            aria-label={activeReport?.title || "Active task"}
                        />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                        <h4 className="font-bold text-text-main-light dark:text-text-main-dark truncate">{activeReport?.title || t('activity.leakingPipe')}</h4>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1">{activeReport?.status || t('activity.step')}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-white text-[22px]">play_arrow</span>
                        </div>
                    </div>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700" style={{ width: "50%" }} />
                </div>
            </div>
        </section>
    );
};

export default ActivityCard;
