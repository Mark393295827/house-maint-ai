import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import BottomNav from '../components/BottomNav';

const ProfilePage = () => {
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

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6">
                <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">Profile / 我的</h1>
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
                            style={{ backgroundImage: `url("${IMAGES.USER_AVATAR}")` }}
                        />
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary border-2 border-white dark:border-surface-dark rounded-full"></div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Alex Johnson</h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">alex.j@example.com</p>
                    </div>
                    <button className="text-primary font-semibold text-sm">Edit</button>
                </div>
            </div>

            {/* Settings Section */}
            <div className="px-4 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark px-1">Settings / 设置</h3>

                <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={toggleDarkMode}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                <span className="material-symbols-outlined">{darkMode ? 'dark_mode' : 'light_mode'}</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">Dark Mode</p>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">深色模式</p>
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
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">Notifications</p>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">通知提醒</p>
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
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">Language</p>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">语言设置</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark">
                            <span className="text-sm">English</span>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Section */}
            <div className="px-4 mt-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark px-1">Support / 支持</h3>

                <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                <span className="material-symbols-outlined">help</span>
                            </div>
                            <div>
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">Help Center</p>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">帮助中心</p>
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
                                <p className="font-bold text-text-main-light dark:text-text-main-dark">About</p>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">关于版本 v1.0.2</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 mb-4 text-center">
                <button className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/10 px-6 py-3 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors w-[90%]">
                    Log Out / 退出登录
                </button>
            </div>

            <BottomNav />
        </div>
    );
};

export default ProfilePage;
