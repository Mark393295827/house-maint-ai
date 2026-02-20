import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const SupportSection: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="px-4 mt-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark px-1">
                {t('profile.support.title')}
            </h3>

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
    );
};

export default SupportSection;
