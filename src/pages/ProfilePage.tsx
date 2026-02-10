import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import api from '../services/api';


interface Report {
    id: string;
    title: string;
    description: string;
    created_at: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

const ProfilePage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user, logout, updateUser, isLoading } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);

    // Initialize dark mode from localStorage or system preference using lazy initialization
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    // Sync dark mode class with state
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Fetch user's reports
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await api.getReports(null, 5);
                setReports(data.reports || []);
            } catch (err) {
                console.warn('Failed to fetch reports:', err);
            } finally {
                setLoadingReports(false);
            }
        };
        if (user) {
            fetchReports();
        }
    }, [user]);

    // Toggle dark mode function
    const toggleDarkMode = () => {
        if (darkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setDarkMode(true);
        }
    };

    // Handle edit profile
    const handleEditProfile = () => {
        setEditName(user?.name || '');
        setIsEditing(true);
    };

    // Handle save profile
    const handleSaveProfile = async () => {
        if (!editName.trim()) return;
        setIsSaving(true);
        try {
            await updateUser({ name: editName.trim() });
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-gray-100 text-gray-500';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    // Get status text
    const getStatusText = (status: string) => {
        return t(`profile.status.${status}`) || status;
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6">
                <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">{t('profile.title')}</h1>
                <button className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </div>

            {/* Profile Card */}
            <div className="px-4 mb-6">
                <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="relative size-16">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                            style={{ backgroundImage: `url("${user?.avatar || IMAGES.USER_AVATAR}")` }}
                        />
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary border-2 border-white dark:border-surface-dark rounded-full"></div>
                    </div>
                    <div className="flex-1">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-surface-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder={t('profile.namePlaceholder')}
                                />
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="px-3 py-1 bg-primary text-white rounded-lg text-sm font-bold"
                                >
                                    {isSaving ? '...' : t('profile.save')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                                    {user?.name || t('profile.defaultUser')}
                                </h2>
                                <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                    {user?.phone || t('profile.notLoggedIn')}
                                </p>
                            </>
                        )}
                    </div>
                    {!isEditing && (
                        <button onClick={handleEditProfile} className="text-primary font-semibold text-sm">
                            {t('profile.edit')}
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Reports */}
            <div className="px-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                        {t('profile.reports.title')}
                    </h3>
                    <Link to="/quick-report" className="text-xs text-primary font-bold">
                        {t('profile.reports.viewAll')}
                    </Link>
                </div>

                {loadingReports ? (
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : reports.length > 0 ? (
                    <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                        {reports.slice(0, 3).map((report, index) => (
                            <div
                                key={report.id}
                                className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${index !== reports.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-xl">build</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-main-light dark:text-text-main-dark text-sm truncate">
                                        {report.title || report.description?.substring(0, 30)}
                                    </p>
                                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                        {new Date(report.created_at).toLocaleDateString('zh-CN')}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                    {getStatusText(report.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">inbox</span>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">{t('profile.reports.empty')}</p>
                        <Link
                            to="/quick-report"
                            className="inline-block mt-3 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg"
                        >
                            {t('profile.reports.create')}
                        </Link>
                    </div>
                )}
            </div>

            {/* Settings Section */}
            <div className="px-4 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark px-1">{t('profile.settings.title')}</h3>

                <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={toggleDarkMode}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                <span className="material-symbols-outlined">{darkMode ? 'dark_mode' : 'light_mode'}</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">{t('profile.settings.darkMode')}</p>
                            </div>
                        </div>
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                                <span className="material-symbols-outlined">notifications</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">{t('profile.settings.notifications')}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                <span className="material-symbols-outlined">language</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">{t('profile.settings.language')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark">
                            <span className="text-sm">中文</span>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Section */}
            <div className="px-4 mt-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark px-1">{t('profile.support.title')}</h3>

                <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                <span className="material-symbols-outlined">help</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">{t('profile.support.help')}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-500">
                                <span className="material-symbols-outlined">info</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">{t('profile.support.about')}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 mb-4 text-center">
                <button
                    onClick={handleLogout}
                    className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/10 px-6 py-3 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors w-[90%]"
                >
                    {t('profile.logout')}
                </button>
            </div>

            <BottomNav />
        </div>
    );
};

export default ProfilePage;
