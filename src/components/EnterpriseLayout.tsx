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
        <header className="h-16 bg-[#f7f8fa]/80 backdrop-blur-md border-b border-slate-200/60 flex items-center px-8 sticky top-0 z-50">
            <div className="flex-grow flex items-center max-w-2xl bg-white/50 rounded-xl px-4 py-2 border border-slate-200/40 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-xl mr-3">search</span>
                <input 
                    type="text" 
                    placeholder="Search across nodes, agents, or deployment zones..." 
                    className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
                />
            </div>
            
            <div className="flex items-center gap-6 ml-auto">
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                    <div className="relative cursor-pointer group">
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-blue-600 transition-colors">notifications</span>
                        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-slate-800 tracking-tight leading-none mb-1">{user?.name || 'Admin User'}</p>
                        <p className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-tighter">System Architect</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                        {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user?.name?.[0] || 'A'}
                    </div>
                </div>
            </div>
        </header>
    );
};

const Sidebar: React.FC = () => {
    const { t } = useLanguage();
    const navItems = [
        { to: '/enterprise', end: true, icon: 'dashboard', label: t('enterprise.layout.nav.missionControl') },
        { to: '/enterprise/properties', icon: 'business', label: t('enterprise.layout.nav.properties') },
        { to: '/enterprise/tickets', icon: 'confirmation_number', label: t('enterprise.layout.nav.tickets') },
        { to: '/enterprise/workers', icon: 'engineering', label: t('enterprise.layout.nav.workers') },
        { to: '/enterprise/analytics', icon: 'analytics', label: t('enterprise.layout.nav.analytics') },
    ];

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-slate-900 text-white z-50 flex flex-col border-r border-slate-800">
            <div className="p-6 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-white text-xl">security</span>
                    </div>
                    <span className="font-display font-black text-xl tracking-tighter">AEGIS <span className="text-blue-500">OS</span></span>
                </div>
            </div>

            <nav className="flex-grow px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink 
                        key={item.to} 
                        to={item.to} 
                        end={item.end}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all group
                            ${isActive 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                        `}
                    >
                        <span className="material-symbols-outlined text-[22px]">
                            {item.icon}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 mt-auto">
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resource Load</span>
                        <span className="text-[10px] text-blue-400 font-mono">14%</span>
                    </div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-blue-500 w-[14%]" />
                    </div>
                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors font-mono">
                        TERMINAL LOG
                    </button>
                </div>
            </div>
        </aside>
    );
};

const EnterpriseLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#F7F8FA] flex font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-[240px]">
                <Header />
                <main className="p-10 max-w-[1640px] w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default EnterpriseLayout;
