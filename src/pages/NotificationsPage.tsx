import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { getNotifications, markNotificationRead } from '../services/api';
import BottomNav from '../components/BottomNav';

interface Notification {
    id: number;
    type: 'job_update' | 'message' | 'payment' | 'system';
    title: string;
    body?: string;
    read_at?: string;
    created_at: string;
}

const typeIcons: Record<string, string> = {
    job_update: 'work',
    message: 'chat',
    payment: 'payments',
    system: 'info',
};

const typeColors: Record<string, string> = {
    job_update: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    message: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    payment: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    system: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const NotificationsPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getNotifications();
                setNotifications(data.notifications || []);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleMarkRead = async (id: number) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
        } catch {
            // silent
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('community.time.justNow');
        if (mins < 60) return `${mins} ${t('community.time.minsAgo')}`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} ${t('community.time.hoursAgo')}`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-text-main-light dark:text-text-main-dark">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                        {t('notifications.title')}
                    </h1>
                </div>
            </div>

            <main className="flex-1 px-6 pt-2">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-400">notifications_none</span>
                        </div>
                        <p className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
                            {t('notifications.empty')}
                        </p>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1">
                            {t('notifications.emptyDesc')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {notifications.map((notif) => (
                            <button
                                key={notif.id}
                                onClick={() => !notif.read_at && handleMarkRead(notif.id)}
                                className={`flex items-start gap-3 p-4 rounded-xl w-full text-left transition-colors ${notif.read_at
                                        ? 'bg-transparent'
                                        : 'bg-blue-50/50 dark:bg-blue-900/10'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[notif.type]}`}>
                                    <span className="material-symbols-outlined text-lg">{typeIcons[notif.type]}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className={`text-sm ${notif.read_at ? 'font-medium text-text-sub-light dark:text-text-sub-dark' : 'font-bold text-text-main-light dark:text-text-main-dark'}`}>
                                            {notif.title}
                                        </h3>
                                        {!notif.read_at && (
                                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    {notif.body && (
                                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5 line-clamp-2">{notif.body}</p>
                                    )}
                                    <span className="text-[10px] text-gray-400 mt-1 block">{timeAgo(notif.created_at)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default NotificationsPage;
