import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';

const SuggestionList = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const suggestions = [
        {
            image: IMAGES.AC_FILTER,
            alt: 'Air conditioner vent with filter being replaced',
            time: `15${t('suggestions.time.minutes')}`,
            title: t('suggestions.acFilter'),
            urgency: { label: t('suggestions.urgency.low'), color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
            difficulty: { label: t('suggestions.difficulty.easy'), color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' },
        },
        {
            image: IMAGES.GUTTER_CLEANING,
            alt: 'Person cleaning leaves from roof gutter',
            time: `1${t('suggestions.time.hour')}`,
            title: t('suggestions.gutter'),
            urgency: { label: t('suggestions.urgency.med'), color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
            difficulty: { label: t('suggestions.difficulty.medium'), color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300' },
        },
        {
            image: IMAGES.SMOKE_DETECTOR,
            alt: 'Outdoor water spigot wrapped with insulation',
            time: `30${t('suggestions.time.minutes')}`,
            title: t('suggestions.pipes'),
            urgency: { label: t('suggestions.urgency.high'), color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
            difficulty: { label: t('suggestions.difficulty.hard'), color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' },
        },
    ];

    return (
        <section className="pl-5 pb-4 page-enter" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center justify-between pr-5 mb-3 px-1">
                <h3 className="text-lg font-bold">{t('suggestions.title')}</h3>
                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">{t('suggestions.season')}</span>
            </div>
            <div className="flex overflow-x-auto gap-4 hide-scrollbar pb-4 pr-5 snap-x snap-mandatory">
                {suggestions.map((item, i) => (
                    <div
                        key={i}
                        className="snap-start shrink-0 w-[280px] bg-white dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3 group cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all press-scale"
                        onClick={() => navigate('/repair')}
                    >
                        <div className="h-32 w-full rounded-xl bg-gray-100 overflow-hidden relative">
                            <div
                                className="bg-center bg-no-repeat bg-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                style={{ backgroundImage: `url("${item.image}")` }}
                                aria-label={item.alt}
                            />
                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                                <span className="text-xs font-bold text-text-main-light dark:text-text-main-dark">{item.time}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-base mb-2">{item.title}</h4>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.urgency.color}`}>{item.urgency.label}</span>
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.difficulty.color}`}>{item.difficulty.label}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SuggestionList;
