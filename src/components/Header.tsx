
import { useState } from 'react';
import { IMAGES } from '../constants/images';
import LanguageToggle from './LanguageToggle';
import StreakBadge from './StreakBadge';
import { useLanguage } from '../i18n/LanguageContext';

const Header = () => {
    const { t, locale } = useLanguage();
    const [notifCount] = useState(3); // Simulated notification count

    // Time-aware greeting
    const hour = new Date().getHours();
    let greetingKey: string;
    if (hour < 12) greetingKey = locale === 'zh' ? '早上好, Alex' : 'Good morning, Alex';
    else if (hour < 18) greetingKey = locale === 'zh' ? '下午好, Alex' : 'Good afternoon, Alex';
    else greetingKey = locale === 'zh' ? '晚上好, Alex' : 'Good evening, Alex';

    return (
        <header className="sticky top-0 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pt-safe-top">
            <div className="flex items-center justify-between px-5 pt-6 pb-2">
                <div className="flex flex-col">
                    <span className="text-text-sub-light dark:text-text-sub-dark text-sm font-medium">{t('header.location')}</span>
                    <h2 className="text-text-main-light dark:text-text-main-dark text-xl font-bold leading-tight">{greetingKey}</h2>
                </div>
                <div className="flex items-center gap-2.5">
                    <StreakBadge />
                    {/* Notification bell */}
                    <button className="relative press-scale">
                        <span className="material-symbols-outlined text-text-sub-light dark:text-text-sub-dark text-[24px]">notifications</span>
                        {notifCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                                {notifCount}
                            </span>
                        )}
                    </button>
                    <LanguageToggle />
                    <div className="size-10 rounded-full overflow-hidden border border-primary/20">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full"
                            style={{ backgroundImage: `url("${IMAGES.USER_AVATAR}")` }}
                            aria-label="User profile portrait smiling"
                        >
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
