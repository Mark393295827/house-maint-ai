import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Header: React.FC = () => {
    const { user } = useAuth();
    return (
        <header className="h-20 apple-glass border-b border-white/20 flex items-center px-10 sticky top-0 z-50">
            <div className="flex-grow flex items-center max-w-2xl bg-white/40 rounded-2xl px-5 py-2.5 border border-white/40 focus-within:bg-white/60 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all duration-300">
                <span className="material-symbols-outlined text-slate-400 text-xl mr-3 font-light">search</span>
                <input 
                    type="text" 
                    placeholder="Search intelligence, reports, agents..." 
                    className="bg-transparent border-none outline-none text-[13px] font-medium text-slate-800 placeholder:text-slate-400 w-full"
                />
            </div>
            <div className="ml-8 flex items-center gap-6">
                <button className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined font-light">notifications</span>
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200/60">
                    <div className="text-right">
                        <p className="text-[12px] font-bold text-slate-900 leading-none mb-1">{user?.name || 'Administrator'}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user?.role || 'Exec Ops'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-white flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                        <span className="material-symbols-outlined font-light">person</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

const Sidebar: React.FC = () => {
    const { t } = useLanguage();
    const navItems = [
        { path: '/enterprise', end: true, icon: 'dashboard', title: t('enterprise.layout.nav.missionControl') },
        { path: '/enterprise/properties', icon: 'business', title: t('enterprise.layout.nav.properties') },
        { path: '/enterprise/tickets', icon: 'confirmation_number', title: t('enterprise.layout.nav.tickets') },
        { path: '/enterprise/workers', icon: 'engineering', title: t('enterprise.layout.nav.workers') },
        { path: '/enterprise/analytics', icon: 'analytics', title: t('enterprise.layout.nav.analytics') },
    ];

    return (
        <aside className="w-[260px] h-screen fixed left-0 top-0 bg-[#1d1d1f] text-white flex flex-col z-50 shadow-2xl">
            <div className="p-10">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-xl font-light">shield_with_heart</span>
                    </div>
                    <h1 className="text-xl font-black tracking-tighter">AEGIS<span className="text-blue-500">.</span></h1>
                </div>
            </div>
            
            <nav className="flex-grow px-6 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 group
                            ${isActive 
                                ? 'bg-white/10 text-white shadow-sm' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined transition-colors font-light ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-[13px] font-bold tracking-tight">{item.title}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
            <div className="p-8 mx-6 mb-8 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System Status</p>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-300">Operations Nominal</span>
                </div>
            </div>
        </aside>
    );
};

const EnterpriseLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#f5f5f7] flex font-sans antialiased text-slate-900">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-[260px]">
                <Header />
                <main className="p-10 lg:p-14 max-w-[1800px] w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default EnterpriseLayout;
