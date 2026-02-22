import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { getConversations } from '../services/api';
import BottomNav from '../components/BottomNav';

interface Conversation {
    id: number;
    partner_id: number;
    partner_name: string;
    partner_avatar?: string;
    content: string;
    created_at: string;
    unread: number;
}

const ConversationsPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getConversations();
                setConversations(data.conversations || []);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-text-main-light dark:text-text-main-dark">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                            {t('messages.title')}
                        </h1>
                    </div>
                </div>
            </div>

            <main className="flex-1 px-6 pt-2">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-400">chat</span>
                        </div>
                        <p className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
                            {t('messages.empty')}
                        </p>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1">
                            {t('messages.emptyDesc')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {conversations.map((conv) => (
                            <button
                                key={conv.partner_id}
                                onClick={() => navigate(`/chat/${conv.partner_id}`)}
                                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors text-left w-full"
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {conv.partner_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    {conv.unread > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                            {conv.unread > 9 ? '9+' : conv.unread}
                                        </span>
                                    )}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-text-main-light dark:text-text-main-dark">
                                            {conv.partner_name}
                                        </span>
                                        <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                            {timeAgo(conv.created_at)}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate mt-0.5 ${conv.unread > 0 ? 'font-semibold text-text-main-light dark:text-text-main-dark' : 'text-text-sub-light dark:text-text-sub-dark'}`}>
                                        {conv.content}
                                    </p>
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

export default ConversationsPage;
