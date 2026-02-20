import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface SettingsSectionProps {
    darkMode: boolean;
    onToggleDarkMode: () => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ darkMode, onToggleDarkMode }) => {
    const { t } = useLanguage();

    return (
        <div className="px-4 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark px-1">
                {t('profile.settings.title')}
            </h3>

            <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                {/* Dark Mode Toggle */}
                <div
                    className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={onToggleDarkMode}
                >
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
    );
};

export default SettingsSection;
