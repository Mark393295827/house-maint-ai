
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const BottomNav = () => {
    const { t } = useLanguage();
    const location = useLocation();
    const currentPath = location.pathname;

    const navItems = [
        { path: '/', icon: 'home', label: t('nav.home') },
        { path: '/diagnosis', icon: 'build', label: t('nav.diagnosis') },
        { path: '/calendar', icon: 'calendar_today', label: t('nav.calendar') },
        { path: '/community', icon: 'group', label: t('nav.community') },
        { path: '/profile', icon: 'person', label: t('nav.profile') },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 pb-safe-bottom"
            aria-label={t('nav.ariaLabel', { defaultValue: 'Main Navigation' })}
        >
            <div className="flex items-center justify-around h-[70px] px-2" role="menubar">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-primary'
                                }`}
                            role="menuitem"
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={item.label}
                        >
                            {/* Active dot indicator */}
                            {isActive && (
                                <div className="absolute top-1 w-1 h-1 rounded-full bg-primary" style={{
                                    animation: 'fadeSlideIn 0.25s ease both'
                                }} />
                            )}
                            <span
                                className={`material-symbols-outlined transition-transform duration-200 ${isActive ? 'text-[28px] -translate-y-0.5' : 'text-[26px]'}`}
                                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                aria-hidden="true"
                            >
                                {item.icon}
                            </span>
                            <span className={`text-[10px] text-center leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
