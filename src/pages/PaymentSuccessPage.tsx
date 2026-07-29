import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { getOrder, type Order } from '../services/api';

type VerificationState = 'loading' | 'paid' | 'pending' | 'failed';

const PaymentSuccessPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [order, setOrder] = useState<Order | null>(null);
    const [verificationState, setVerificationState] = useState<VerificationState>('loading');

    useEffect(() => {
        let cancelled = false;

        if (!orderId || !/^\d+$/.test(orderId)) {
            setVerificationState('failed');
            return () => {
                cancelled = true;
            };
        }

        setVerificationState('loading');
        void getOrder(orderId)
            .then(({ order: verifiedOrder }) => {
                if (cancelled) return;
                setOrder(verifiedOrder);
                setVerificationState(verifiedOrder.status === 'paid' ? 'paid' : verifiedOrder.status === 'pending' ? 'pending' : 'failed');
            })
            .catch(() => {
                if (!cancelled) {
                    setVerificationState('failed');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [orderId]);

    const formatAmount = (amountInCents: number, currency: string) => {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amountInCents / 100);
    };

    const content = {
        loading: {
            icon: 'progress_activity',
            iconClass: 'text-primary animate-spin',
            containerClass: 'bg-primary/10',
            title: t('payment.verification.loadingTitle'),
            message: t('payment.verification.loadingMessage'),
        },
        paid: {
            icon: 'check_circle',
            iconClass: 'text-green-600 dark:text-green-400',
            containerClass: 'bg-green-100 dark:bg-green-900/30',
            title: t('payment.success.title'),
            message: t('payment.success.message'),
        },
        pending: {
            icon: 'schedule',
            iconClass: 'text-amber-600 dark:text-amber-400',
            containerClass: 'bg-amber-100 dark:bg-amber-900/30',
            title: t('payment.verification.pendingTitle'),
            message: t('payment.verification.pendingMessage'),
        },
        failed: {
            icon: 'error',
            iconClass: 'text-red-600 dark:text-red-400',
            containerClass: 'bg-red-100 dark:bg-red-900/30',
            title: t('payment.verification.failedTitle'),
            message: t('payment.verification.failedMessage'),
        },
    }[verificationState];

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark text-center">
            <div className={`size-20 rounded-full flex items-center justify-center mb-6 ${content.containerClass}`}>
                <span className={`material-symbols-outlined text-[48px] ${content.iconClass}`} aria-hidden="true">
                    {content.icon}
                </span>
            </div>

            <h1 className="text-2xl font-bold mb-2 text-text-main-light dark:text-text-main-dark">
                {content.title}
            </h1>
            <p className="text-text-sub-light dark:text-text-sub-dark mb-6">
                {content.message}
            </p>

            {order && (
                <div className="w-full max-w-xs bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-md mb-6 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {t('payment.success.orderId')}
                        </span>
                        <span className="font-bold text-text-main-light dark:text-text-main-dark">
                            #{order.id}
                        </span>
                    </div>
                    {order.report_title && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                {t('payment.verification.service')}
                            </span>
                            <span className="font-medium text-text-main-light dark:text-text-main-dark">
                                {order.report_title}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {t('payment.success.amount')}
                        </span>
                        <span className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                            {formatAmount(order.amount, order.currency)}
                        </span>
                    </div>
                </div>
            )}

            <div className="w-full max-w-xs flex flex-col gap-3">
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                    {t('payment.backToHome')}
                </button>
                <Link
                    to="/orders"
                    className="w-full bg-transparent border border-primary/30 text-primary font-medium py-3 rounded-xl flex items-center justify-center gap-1 hover:bg-primary/5 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">receipt_long</span>
                    {t('payment.success.viewOrders')}
                </Link>
            </div>
        </main>
    );
};

export default PaymentSuccessPage;
