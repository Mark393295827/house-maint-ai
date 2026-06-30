import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from './LanguageToggle';

interface LayoutProps {
    children: React.ReactNode;
}

const useEnterpriseNavItems = () => {
    const { t } = useLanguage();
    const { pathname } = useLocation();
    const basePath = pathname.toLowerCase().startsWith('/enterpriseui') ? '/enterpriseUI' : '/enterprise';

    return [
        { path: basePath, end: true, icon: 'dashboard', title: t('enterprise.layout.nav.missionControl') },
        { path: `${basePath}/properties`, icon: 'business', title: t('enterprise.layout.nav.properties') },
        { path: `${basePath}/tickets`, icon: 'confirmation_number', title: t('enterprise.layout.nav.tickets') },
        { path: `${basePath}/workers`, icon: 'engineering', title: t('enterprise.layout.nav.workers') },
        { path: `${basePath}/analytics`, icon: 'analytics', title: t('enterprise.layout.nav.analytics') },
        { path: `${basePath}/ai-config`, icon: 'tune', title: t('enterprise.layout.nav.aiConfig') },
    ];
};

const NotificationButton: React.FC = () => {
    const { t } = useLanguage();

    return (
        <button
            aria-label={t('enterprise.layout.notifications')}
            className="relative p-2.5 text-slate-500 hover:text-slate-900 transition-colors bg-white/50 rounded-xl ent-glass border-none"
        >
            <span className="material-symbols-outlined font-light">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
    );
};

const SearchField: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="enterprise-search flex-grow flex items-center max-w-xl bg-black/5 rounded-2xl px-4 sm:px-5 py-2.5 border border-transparent focus-within:bg-white focus-within:border-blue-500/20 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all duration-400">
            <span className="material-symbols-outlined text-slate-400 text-xl mr-3 font-light">search</span>
            <input
                type="text"
                placeholder={t('enterprise.layout.searchPlaceholder')}
                className="bg-transparent border-none outline-none text-[13px] font-black text-black placeholder:text-slate-400 w-full min-w-0"
            />
        </div>
    );
};

const Header: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    return (
        <header className="enterprise-topbar ent-glass border-b border-black/5 sticky top-0 z-40 px-4 py-3 pt-safe-top md:h-20 md:px-6 md:py-0 lg:px-10">
            <div className="hidden h-full md:flex md:items-center">
                <SearchField />
                <div className="ml-8 flex items-center gap-6">
                    <NotificationButton />
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                        <LanguageToggle />
                    </div>
                    <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                        <div className="text-right">
                            <p className="text-[12px] font-black text-black leading-none mb-1">{user?.name || t('enterprise.layout.defaultUser')}</p>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user?.role || t('enterprise.layout.defaultRole')}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white ent-glass flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                            <span className="material-symbols-outlined font-light">person</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="md:hidden space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="material-symbols-outlined text-white text-xl font-light">shield_with_heart</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mb-1">{user?.role || t('enterprise.layout.defaultRole')}</p>
                            <h1 className="text-xl font-black tracking-tighter text-black leading-none">AEGIS<span className="text-blue-600">.</span></h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationButton />
                        <div className="flex items-center rounded-xl bg-white/50 ent-glass">
                            <LanguageToggle />
                        </div>
                    </div>
                </div>
                <SearchField />
            </div>
        </header>
    );
};

const Sidebar: React.FC = () => {
    const navItems = useEnterpriseNavItems();
    const { t } = useLanguage();

    return (
        <aside className="hidden lg:flex w-[280px] h-screen fixed left-0 top-0 ent-glass border-r border-black/5 text-slate-900 flex-col z-50">
            <div className="p-10">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-xl font-light">shield_with_heart</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-black">AEGIS<span className="text-blue-600">.</span></h1>
                </div>
            </div>
            
            <nav className="flex-grow px-6 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-400 group
                            ${isActive 
                                ? 'bg-white text-black shadow-xl shadow-black/5 ring-1 ring-black/5' 
                                : 'text-slate-500 hover:text-black hover:bg-black/5'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined transition-colors font-light ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-black'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-[13px] font-black tracking-tight">{item.title}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
            <div className="p-8 mx-6 mb-8 rounded-2xl bg-black/5 border border-black/5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('enterprise.layout.systemStatus')}</p>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] font-black text-slate-700">{t('enterprise.layout.operationsNominal')}</span>
                </div>
            </div>
        </aside>
    );
};

const MobileTabBar: React.FC = () => {
    const navItems = useEnterpriseNavItems();

    return (
        <div className="enterprise-mobile-tabs lg:hidden fixed inset-x-0 bottom-0 z-50 px-3 pt-2 pb-safe-bottom pointer-events-none">
            <nav className="ent-glass mx-auto flex max-w-md items-center justify-between rounded-[26px] border border-white/60 px-2 py-2 shadow-2xl shadow-slate-900/12 pointer-events-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `
                            flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 transition-all duration-300
                            ${isActive ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:text-black'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined text-[21px] font-light ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {item.icon}
                                </span>
                                <span className="max-w-full truncate text-[9px] font-black leading-none tracking-tight">
                                    {item.title}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

const EnterpriseLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="enterprise-shell min-h-dvh bg-[#F7F8FA] font-sans antialiased text-black selection:bg-blue-100 selection:text-blue-700">
            <Sidebar />
            <div className="flex min-w-0 flex-col lg:ml-[280px]">
                <Header />
                <main className="enterprise-main px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5 md:px-6 md:pt-8 lg:p-10 xl:p-14 max-w-[1920px] w-full mx-auto min-w-0">
                    {children}
                </main>
            </div>
            <MobileTabBar />
        </div>
    );
};

export default EnterpriseLayout;
