import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from './LanguageToggle';

interface LayoutProps {
    children: React.ReactNode;
}

interface EnterpriseNavItem {
    path: string;
    end?: boolean;
    icon: string;
    title: string;
}

const useEnterpriseNavItems = (): EnterpriseNavItem[] => {
    const { t } = useLanguage();
    const { pathname } = useLocation();
    const basePath = pathname.toLowerCase().startsWith('/enterpriseui') ? '/enterpriseUI' : '/enterprise';

    return [
        { path: basePath, end: true, icon: 'dashboard', title: t('enterprise.layout.nav.missionControl') },
        { path: `${basePath}/properties`, icon: 'domain', title: t('enterprise.layout.nav.properties') },
        { path: `${basePath}/tickets`, icon: 'assignment', title: t('enterprise.layout.nav.tickets') },
        { path: `${basePath}/workers`, icon: 'build', title: t('enterprise.layout.nav.workers') },
        { path: `${basePath}/analytics`, icon: 'bar_chart', title: t('enterprise.layout.nav.analytics') },
        { path: `${basePath}/ai-config`, icon: 'settings', title: t('enterprise.layout.nav.aiConfig') },
    ];
};

const NotificationButton: React.FC = () => {
    const { t } = useLanguage();

    return (
        <button
            type="button"
            aria-label={t('enterprise.layout.notifications')}
            title={t('enterprise.layout.notifications')}
            className="enterprise-icon-button enterprise-notification-button"
        >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notifications</span>
            <span className="enterprise-notification-dot" />
        </button>
    );
};

const SearchField: React.FC = () => {
    const { t } = useLanguage();

    return (
        <label className="enterprise-search hidden md:flex">
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">search</span>
            <input type="search" placeholder={t('enterprise.layout.searchPlaceholder')} />
        </label>
    );
};

const Header: React.FC = () => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const { t } = useLanguage();
    const navItems = useEnterpriseNavItems();
    const activeItem = navItems.find((item) => item.end ? pathname === item.path : pathname.startsWith(item.path));

    return (
        <header className="enterprise-topbar">
            <div className="enterprise-topbar-context">
                <span>{t('enterprise.layout.title')}</span>
                <span aria-hidden="true">/</span>
                <strong>{activeItem?.title || t('enterprise.layout.nav.missionControl')}</strong>
            </div>

            <SearchField />

            <div className="enterprise-topbar-actions">
                <button className="md:hidden enterprise-icon-button" aria-label={t('enterprise.layout.searchPlaceholder')} title={t('enterprise.layout.searchPlaceholder')}>
                    <span className="material-symbols-outlined text-[18px]">search</span>
                </button>
                <LanguageToggle />
                <NotificationButton />
                <div className="enterprise-user">
                    <span className="enterprise-user-avatar">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person</span>
                    </span>
                    <span className="enterprise-user-copy hidden md:flex">
                        <strong>{user?.name || t('enterprise.layout.defaultUser')}</strong>
                        <small>{user?.role || t('enterprise.layout.defaultRole')}</small>
                    </span>
                </div>
            </div>
        </header>
    );
};

const Sidebar: React.FC = () => {
    const navItems = useEnterpriseNavItems();
    const { t } = useLanguage();

    return (
        <aside className="enterprise-sidebar hidden md:flex">
            <div className="enterprise-brand">
                <span className="enterprise-brand-mark">
                    <span className="material-symbols-outlined text-[21px]" aria-hidden="true">shield</span>
                </span>
                <span>
                    <strong>AEGIS</strong>
                    <small>{t('enterprise.layout.subtitle')}</small>
                </span>
            </div>

            <nav className="enterprise-nav" aria-label={t('enterprise.layout.title')}>
                {navItems.map((item) => {
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) => `enterprise-nav-item${isActive ? ' is-active' : ''}`}
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
                            <span>{item.title}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="enterprise-system-status">
                <div>
                    <span className="enterprise-status-dot" />
                    <strong>{t('enterprise.layout.operationsNominal')}</strong>
                </div>
                <small>{t('enterprise.layout.systemStatus')}</small>
            </div>
        </aside>
    );
};

const MobileTabBar: React.FC = () => {
    const navItems = useEnterpriseNavItems();

    return (
        <nav className="enterprise-mobile-tabs md:hidden" aria-label="Enterprise navigation">
            {navItems.map((item) => {
                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `enterprise-mobile-tab${isActive ? ' is-active' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{item.icon}</span>
                        <span>{item.title}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
};

const EnterpriseLayout: React.FC<LayoutProps> = ({ children }) => (
    <div className="enterprise-shell">
        <Sidebar />
        <div className="enterprise-workspace">
            <Header />
            <main className="enterprise-main">{children}</main>
        </div>
        <MobileTabBar />
    </div>
);

export default EnterpriseLayout;
