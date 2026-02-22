import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import { usePosts } from '../hooks/useCommunity';

const SuggestionList = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { data: postsData, isLoading } = usePosts(5);

    const staticSuggestions = [
        {
            image: IMAGES.AC_FILTER,
            alt: 'Air conditioner vent with filter being replaced',
            time: `15${t('suggestions.time.minutes')}`,
            title: t('suggestions.acFilter'),
            urgency: { label: t('suggestions.urgency.low'), color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
            difficulty: { label: t('suggestions.difficulty.easy'), color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
        },
        {
            image: IMAGES.GUTTER_CLEANING,
            alt: 'Person cleaning leaves from roof gutter',
            time: `1${t('suggestions.time.hour')}`,
            title: t('suggestions.gutter'),
            urgency: { label: t('suggestions.urgency.med'), color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
            difficulty: { label: t('suggestions.difficulty.medium'), color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
        },
        {
            image: IMAGES.SMOKE_DETECTOR,
            alt: 'Outdoor water spigot wrapped with insulation',
            time: `30${t('suggestions.time.minutes')}`,
            title: t('suggestions.pipes'),
            urgency: { label: t('suggestions.urgency.high'), color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
            difficulty: { label: t('suggestions.difficulty.hard'), color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
        },
    ];

    const displayItems = (postsData?.posts?.length ?? 0) > 0
        ? postsData!.posts.map(post => ({
            image: post.image || IMAGES.AC_FILTER,
            alt: post.title,
            time: `10${t('suggestions.time.minutes')}`,
            title: post.title,
            urgency: { label: t('suggestions.urgency.med'), color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
            difficulty: { label: t('suggestions.difficulty.medium'), color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
            id: post.id
        }))
        : staticSuggestions;

    return (
        <section className="pl-5 pb-4 page-enter" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center justify-between pr-5 mb-3 px-1">
                <h3 className="text-lg font-extrabold font-display">{t('suggestions.title')}</h3>
                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">{t('suggestions.season')}</span>
            </div>
            <div className="flex overflow-x-auto gap-3.5 hide-scrollbar pb-4 pr-5 snap-x snap-mandatory">
                {isLoading && (
                    <div className="flex gap-3.5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-[260px] h-52 glass dark:glass-dark rounded-3xl animate-pulse shrink-0" />
                        ))}
                    </div>
                )}

                {!isLoading && displayItems.map((item, i) => (
                    <div
                        key={i}
                        className="snap-start shrink-0 w-[260px] glass dark:glass-dark rounded-3xl p-3 flex flex-col gap-3 group cursor-pointer hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] transition-all press-scale"
                        onClick={() => navigate('/community')}
                    >
                        <div className="h-32 w-full rounded-2xl bg-gray-100 dark:bg-white/5 overflow-hidden relative">
                            <div
                                className="bg-center bg-no-repeat bg-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                style={{ backgroundImage: `url("${item.image}")` }}
                                aria-label={item.alt}
                            />
                            <div className="absolute top-2 right-2 glass dark:glass-dark px-2.5 py-1 rounded-lg">
                                <span className="text-xs font-bold text-text-main-light dark:text-text-main-dark">{item.time}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-base mb-2 line-clamp-1">{item.title}</h4>
                            <div className="flex flex-wrap gap-1.5">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${item.urgency.color}`}>{item.urgency.label}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${item.difficulty.color}`}>{item.difficulty.label}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SuggestionList;
