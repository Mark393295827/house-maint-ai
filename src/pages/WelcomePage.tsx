import { Link } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

const WelcomePage = () => {
    const { t } = useLanguage();
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-sans text-text-main-light dark:text-text-main-dark overflow-x-hidden page-enter">
            <div className="flex items-center justify-between pt-8 pb-4 px-6">
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-center uppercase tracking-wider opacity-80">{t('app.name')}</h2>
                <LanguageToggle />
            </div>
            <div className="flex-1 flex flex-col items-center w-full max-w-md mx-auto px-6 overflow-y-auto">
                <div className="w-full mt-4 mb-8">
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url("${IMAGES.WELCOME_HERO}")` }}
                            aria-label="Person holding a smartphone scanning a bathroom faucet"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        <div className="absolute bottom-4 right-4 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-xl flex items-center gap-2 animate-pulse">
                            <span className="material-symbols-outlined text-primary">check_circle</span>
                            <div className="flex flex-col leading-none gap-0.5">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{t('welcome.issueDetected')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-text-main-light dark:text-text-main-dark">
                        {t('welcome.title')}
                        <span className="block text-xl md:text-2xl text-primary font-bold mt-1">{t('welcome.subtitle')}</span>
                    </h1>
                </div>
                <div className="w-full flex flex-col gap-4 mb-8">
                    <div className="flex items-start gap-4 min-h-14 p-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary mt-1">
                            <span className="material-symbols-outlined text-[24px]">auto_fix_high</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold leading-tight">{t('welcome.scanTitle')}</h3>
                            <p className="text-sm opacity-70">{t('welcome.scanDesc')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 min-h-14 p-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary mt-1">
                            <span className="material-symbols-outlined text-[24px]">build</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold leading-tight">{t('welcome.strategiesTitle')}</h3>
                            <p className="text-sm opacity-70">{t('welcome.strategiesDesc')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 min-h-14 p-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary mt-1">
                            <span className="material-symbols-outlined text-[24px]">checklist</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold leading-tight">{t('welcome.checklistTitle')}</h3>
                            <p className="text-sm opacity-70">{t('welcome.checklistDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-md mx-auto p-6 pt-0 mt-auto">
                <div className="flex justify-center gap-2 mb-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                </div>
                <Link
                    to="/"
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg h-14 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {t('welcome.getStarted')}
                    <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <div className="h-4"></div>
            </div>
        </div >
    );
};

export default WelcomePage;
