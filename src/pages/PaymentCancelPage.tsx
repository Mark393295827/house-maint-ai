import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const PaymentCancelPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark text-center">
            <div className="size-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-[48px]">cancel</span>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-text-main-light dark:text-text-main-dark">
                {t('payment.cancel.title') || 'Payment Cancelled'}
            </h1>
            <p className="text-text-sub-light dark:text-text-sub-dark mb-8">
                {t('payment.cancel.message') || 'The payment process was aborted. No charges were made.'}
            </p>
            <button
                onClick={() => navigate(-1)}
                className="w-full max-w-xs bg-primary text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
            >
                {t('payment.tryAgain') || 'Try Again'}
            </button>
        </div>
    );
};

export default PaymentCancelPage;
