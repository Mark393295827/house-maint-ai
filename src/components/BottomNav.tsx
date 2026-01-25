
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const navItems = [
        { path: '/', icon: 'home', label: 'Home', labelCn: '首页' },
        { path: '/diagnosis', icon: 'build', label: 'Diagnosis', labelCn: '诊断' },
        { path: '/calendar', icon: 'calendar_today', label: 'Calendar', labelCn: '日历' },
        { path: '/community', icon: 'group', label: 'Community', labelCn: '社区' },
        { path: '/profile', icon: 'person', label: 'Profile', labelCn: '我的' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 pb-safe-bottom">
            <div className="flex items-center justify-around h-[70px] px-2">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-primary'
                                }`}
                        >
                            <span
                                className="material-symbols-outlined text-[26px]"
                                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                                {item.icon}
                            </span>
                            <span className={`text-[10px] text-center leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}<br />{item.labelCn}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
