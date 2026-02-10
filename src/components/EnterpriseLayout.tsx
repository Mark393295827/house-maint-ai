import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { NavLink } from 'react-router-dom';
import Header from './Header';

interface LayoutProps {
    children: React.ReactNode;
}

const EnterpriseLayout: React.FC<LayoutProps> = ({ children }) => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Use a simplified Header or custom Enterprise Header later */}
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-md hidden md:block z-10">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800">Hasiki Enterprise</h2>
                        <p className="text-sm text-gray-500 mt-1">Property Manager</p>
                    </div>

                    <nav className="mt-6 px-4 space-y-2">
                        <NavLink
                            to="/enterprise"
                            end
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="text-xl mr-3">📊</span>
                            {t('nav.dashboard', { defaultValue: 'Overview' })}
                        </NavLink>

                        <NavLink
                            to="/enterprise/properties"
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="text-xl mr-3">🏢</span>
                            {t('nav.properties', { defaultValue: 'Properties' })}
                        </NavLink>

                        <NavLink
                            to="/enterprise/tickets"
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="text-xl mr-3">🎫</span>
                            {t('nav.tickets', { defaultValue: 'Tickets' })}
                        </NavLink>

                        <NavLink
                            to="/enterprise/workers"
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="text-xl mr-3">👷</span>
                            {t('nav.workers', { defaultValue: 'Workers' })}
                        </NavLink>

                        <NavLink
                            to="/enterprise/analytics"
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="text-xl mr-3">📈</span>
                            {t('nav.analytics', { defaultValue: 'Analytics' })}
                        </NavLink>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EnterpriseLayout;
