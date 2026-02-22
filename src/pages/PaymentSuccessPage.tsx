import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface OrderSummary {
    id: number;
    amount: number;
    currency: string;
    status: string;
    report_title?: string;
}

const PaymentSuccessPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [order] = useState<OrderSummary | null>(null);

    useEffect(() => {
        if (sessionId) {
            console.log('Payment verified for session:', sessionId);
            // In production, you'd fetch the order by session_id here
            // For now, we show a confirmation with the session info
        }
    }, [sessionId]);

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark text-center">
            {/* Success Icon with animation */}
            <div className="size-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400 animate-[bounce_1s_ease-in-out]">
                <span className="material-symbols-outlined text-[48px]">check_circle</span>
            </div>

            <h1 className="text-2xl font-bold mb-2 text-text-main-light dark:text-text-main-dark">
                {t('payment.success.title') || 'Payment Successful!'}
            </h1>
            <p className="text-text-sub-light dark:text-text-sub-dark mb-6">
                {t('payment.success.message') || 'Your payment has been processed. The worker has been notified.'}
            </p>

            {/* Order Details Card */}
            {order && (
                <div className="w-full max-w-xs bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-md mb-6 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {t('payment.success.orderId') || 'Order ID'}
                        </span>
                        <span className="font-bold text-text-main-light dark:text-text-main-dark">
                            #{order.id}
                        </span>
                    </div>
                    {order.report_title && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-text-sub-light dark:text-text-sub-dark">Service</span>
                            <span className="font-medium text-text-main-light dark:text-text-main-dark">
                                {order.report_title}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {t('payment.success.amount') || 'Amount'}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatAmount(order.amount, order.currency)}
                        </span>
                    </div>
                </div>
            )}

            {/* Session ID for receipt reference */}
            {sessionId && (
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-6 font-mono">
                    Ref: {sessionId.slice(0, 20)}...
                </p>
            )}

            {/* Action Buttons */}
            <div className="w-full max-w-xs flex flex-col gap-3">
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                    {t('payment.backToHome') || 'Back to Home'}
                </button>
                <Link
                    to="/orders"
                    className="w-full bg-transparent border border-primary/30 text-primary font-medium py-3 rounded-xl flex items-center justify-center gap-1 hover:bg-primary/5 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    {t('payment.success.viewOrders') || 'View All Orders'}
                </Link>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
