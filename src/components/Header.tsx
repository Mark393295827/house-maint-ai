
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import LanguageToggle from './LanguageToggle';
import StreakBadge from './StreakBadge';
import { useLanguage } from '../i18n/LanguageContext';

const Header = () => {
    const { t, locale } = useLanguage();
    const navigate = useNavigate();
    const [notifCount] = useState(3);

    const hour = new Date().getHours();
    let greeting: string;
    let emoji: string;
    if (hour < 12) { greeting = locale === 'zh' ? '早上好' : 'Good morning'; emoji = '☀️'; }
    else if (hour < 18) { greeting = locale === 'zh' ? '下午好' : 'Good afternoon'; emoji = '👋'; }
    else { greeting = locale === 'zh' ? '晚上好' : 'Good evening'; emoji = '🌙'; }

    return (
        <header className="sticky top-0 z-30 glass dark:glass-dark pt-safe-top">
            <div className="flex items-center justify-between px-5 pt-6 pb-3">
                <div className="flex flex-col">
                    <span className="text-text-sub-light dark:text-text-sub-dark text-xs font-medium uppercase tracking-wider">{t('header.location')}</span>
                    <h2 className="text-text-main-light dark:text-text-main-dark text-xl font-extrabold leading-tight font-display">
                        {greeting}, Alex {emoji}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <StreakBadge />
                    {/* Notification bell — links to /notifications */}
                    <button
                        onClick={() => navigate('/notifications')}
                        className="relative press-scale w-10 h-10 rounded-xl glass dark:glass-dark flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-text-sub-light dark:text-text-sub-dark text-[22px]">notifications</span>
                        {notifCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-primary to-accent rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-lg shadow-primary/30">
                                {notifCount}
                            </span>
                        )}
                    </button>
                    <LanguageToggle />
                    {/* Avatar with gradient ring */}
                    <div className="relative">
                        <div className="size-10 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark">
                            <div
                                className="bg-center bg-no-repeat bg-cover w-full h-full"
                                style={{ backgroundImage: `url("${IMAGES.USER_AVATAR}")` }}
                                aria-label="User profile portrait"
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background-light dark:border-background-dark" />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
