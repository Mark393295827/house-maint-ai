import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface LayoutProps {
    children: React.ReactNode;
}

const EnterpriseLayout: React.FC<LayoutProps> = ({ children }) => {
    const { t } = useLanguage();

    const navItems = [
        { to: '/enterprise', end: true, icon: '📊', label: t('enterprise.layout.nav.missionControl') },
        { to: '/enterprise/properties', icon: '🏢', label: t('enterprise.layout.nav.properties') },
        { to: '/enterprise/tickets', icon: '🎫', label: t('enterprise.layout.nav.tickets') },
        { to: '/enterprise/workers', icon: '👷', label: t('enterprise.layout.nav.workers') },
        { to: '/enterprise/analytics', icon: '📈', label: t('enterprise.layout.nav.analytics') },
    ];

    return (
        <div className="min-h-screen bg-background-dark flex flex-col">
            {/* Top Bar */}
            <header className="h-14 bg-surface-dark border-b border-gray-800 flex items-center px-6 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-white font-bold text-sm">H</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-200 font-display">{t('enterprise.layout.title')}</h1>
                        <p className="text-[10px] text-gray-500 font-mono">{t('enterprise.layout.subtitle')}</p>
                    </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                    <div className="live-dot" />
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        {t('enterprise.layout.systemOnline')}
                    </span>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-56 bg-surface-dark border-r border-gray-800 hidden md:flex flex-col z-10">
                    <nav className="flex-1 py-4 px-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-primary/10 text-primary-light border border-primary/20'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                    }`
                                }
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Bottom: Agent Status Summary */}
                    <div className="p-4 border-t border-gray-800">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{t('enterprise.layout.agentsActive')}</div>
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-5 h-5 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-data-green" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-gray-400 font-mono">5/7</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto bg-background-dark">
                    <div className="max-w-7xl mx-auto p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EnterpriseLayout;
