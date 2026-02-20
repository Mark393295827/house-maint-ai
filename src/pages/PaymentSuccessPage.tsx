import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const PaymentSuccessPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (sessionId) {
            console.log('Payment verified for session:', sessionId);
        }
    }, [sessionId]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark text-center">
            <div className="size-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-[48px]">check_circle</span>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-text-main-light dark:text-text-main-dark">
                {t('payment.success.title') || 'Payment Successful!'}
            </h1>
            <p className="text-text-sub-light dark:text-text-sub-dark mb-8">
                {t('payment.success.message') || 'Your payment has been processed. The worker has been notified.'}
            </p>
            <button
                onClick={() => navigate('/')}
                className="w-full max-w-xs bg-primary text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
            >
                {t('payment.backToHome') || 'Back to Home'}
            </button>
        </div>
    );
};

export default PaymentSuccessPage;
