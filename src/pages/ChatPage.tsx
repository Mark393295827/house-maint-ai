import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getMessages, sendMessage } from '../services/api';

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    sender_name: string;
    created_at: string;
    read_at?: string;
}

const ChatPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { userId } = useParams<{ userId: string }>();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [partnerName, setPartnerName] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const partnerId = parseInt(userId || '0');

    useEffect(() => {
        if (!partnerId) return;
        const load = async () => {
            try {
                const data = await getMessages(partnerId);
                setMessages(data.messages || []);
                // Extract partner name from messages
                const partnerMsg = data.messages?.find((m: Message) => m.sender_id === partnerId);
                if (partnerMsg) setPartnerName(partnerMsg.sender_name);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [partnerId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        const content = input.trim();
        setInput('');

        // Optimistic update
        const tempMsg: Message = {
            id: Date.now(),
            sender_id: user?.id || 0,
            receiver_id: partnerId,
            content,
            sender_name: user?.name || '',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await sendMessage({ receiverId: partnerId, content });
        } catch {
            // Revert on failure
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            setInput(content);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/conversations')} className="text-text-main-light dark:text-text-main-dark">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {partnerName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                        <h2 className="font-bold text-text-main-light dark:text-text-main-dark">
                            {partnerName || t('messages.chat')}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2" style={{ paddingBottom: '80px' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">chat_bubble</span>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {t('messages.startConversation')}
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine
                                        ? 'bg-primary text-white rounded-br-md'
                                        : 'bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark rounded-bl-md'
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Bar */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 px-4 py-3 z-20">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('messages.placeholder')}
                        rows={1}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm text-text-main-light dark:text-text-main-dark placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        style={{ maxHeight: '100px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
