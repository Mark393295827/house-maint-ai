import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { getOrders } from '../services/api';
import BottomNav from '../components/BottomNav';

interface Order {
    id: number;
    report_id?: number;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    report_title?: string;
    receipt_url?: string;
    created_at: string;
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusIcons: Record<string, string> = {
    pending: 'schedule',
    paid: 'check_circle',
    refunded: 'undo',
    failed: 'cancel',
};

const OrdersPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await getOrders();
                setOrders(data.orders || []);
            } catch (err) {
                setError('Failed to load orders');
            } finally {
                setLoading(false);
            }
        };
        loadOrders();
    }, []);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount);
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
                        {t('orders.title')}
                    </h1>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 px-6 pt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-red-500">
                        <span className="material-symbols-outlined text-4xl mb-2">error</span>
                        <p>{error}</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-400">receipt_long</span>
                        </div>
                        <p className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
                            {t('orders.empty')}
                        </p>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1">
                            {t('orders.emptyDesc')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`material-symbols-outlined text-lg ${statusColors[order.status]?.split(' ').pop()}`}>
                                                {statusIcons[order.status]}
                                            </span>
                                            <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                                                {order.report_title || `Order #${order.id}`}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                            {t('orders.orderDate')}: {formatDate(order.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                                            {formatAmount(order.amount, order.currency)}
                                        </span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                                            {t(`orders.status.${order.status}`)}
                                        </span>
                                    </div>
                                </div>
                                {order.receipt_url && (
                                    <a
                                        href={order.receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                                    >
                                        <span className="material-symbols-outlined text-base">receipt</span>
                                        {t('orders.receipt')}
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default OrdersPage;
