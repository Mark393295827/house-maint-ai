
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { getActiveCaseCount } from '../store/cases';

const BottomNav = () => {
    const { locale } = useLanguage();
    const location = useLocation();
    const currentPath = location.pathname;
    const activeBadge = getActiveCaseCount();

    const navItems = [
        { path: '/', icon: 'home', label: locale === 'zh' ? '首页' : 'Home' },
        { path: '/cases', icon: 'folder_open', label: locale === 'zh' ? '案例' : 'Cases', badge: activeBadge },
        { path: '/diagnosis', icon: 'add_a_photo', label: locale === 'zh' ? '新建' : 'New', isCenter: true },
        { path: '/library', icon: 'auto_stories', label: locale === 'zh' ? '案例库' : 'Library' },
        { path: '/profile', icon: 'person', label: locale === 'zh' ? '我的' : 'Profile' },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 pb-safe-bottom"
            aria-label="Main Navigation"
            style={{
                background: 'rgba(8, 10, 18, 0.85)',
                backdropFilter: 'blur(28px) saturate(140%)',
                WebkitBackdropFilter: 'blur(28px) saturate(140%)',
                borderTop: '1px solid rgba(99, 102, 241, 0.1)',
            }}
        >
            <div className="flex items-center justify-around h-[72px] px-1" role="menubar">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path || (item.path === '/' && currentPath === '/worker/dashboard');
                    const isCenter = item.isCenter;

                    if (isCenter) {
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="relative flex flex-col items-center justify-center -mt-4"
                                role="menuitem"
                                aria-label={item.label}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90 ${isActive
                                    ? 'bg-gradient-to-br from-primary to-accent shadow-primary/40 scale-105'
                                    : 'bg-gradient-to-br from-primary to-accent shadow-primary/20'
                                    }`}
                                    style={isActive ? {
                                        boxShadow: '0 0 20px rgba(99, 102, 241, 0.4), 0 0 40px rgba(6, 182, 212, 0.2), 0 8px 25px rgba(99, 102, 241, 0.3)'
                                    } : undefined}
                                >
                                    <span
                                        className="material-symbols-outlined text-white text-[26px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        {item.icon}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold mt-1 gradient-text">{item.label}</span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-90"
                            role="menuitem"
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={item.label}
                        >
                            {/* LED strip active indicator */}
                            {isActive && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{
                                    background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.6), 0 0 16px rgba(6, 182, 212, 0.3)',
                                    animation: 'fadeSlideIn 0.25s ease both'
                                }} />
                            )}
                            {/* Badge */}
                            <div className="relative">
                                <span
                                    className={`material-symbols-outlined transition-all duration-300 relative z-10 ${isActive ? 'text-primary text-[26px]' : 'text-gray-400 dark:text-gray-500 text-[24px]'
                                        }`}
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                    aria-hidden="true"
                                >
                                    {item.icon}
                                </span>
                                {'badge' in item && (item as any).badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                                        {(item as any).badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] text-center leading-tight relative z-10 ${isActive ? 'font-bold text-primary' : 'font-medium text-gray-400 dark:text-gray-500'
                                }`}>
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
