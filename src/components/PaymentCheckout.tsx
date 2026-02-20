import React, { useState } from 'react';
import api from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface PaymentCheckoutProps {
    amount: number;
    reportId: number | string;
}

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({ amount, reportId }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const { url } = await api.createCheckoutSession(amount, reportId);
            if (url) {
                window.location.href = url;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to initialize payment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
            {loading ? t('payment.processing') : `${t('payment.payNow')} $${amount}`}
        </button>
    );
};

export default PaymentCheckout;
