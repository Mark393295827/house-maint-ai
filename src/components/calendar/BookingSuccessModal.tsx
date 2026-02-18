/**
 * BookingSuccessModal — Extracted from CalendarPage
 * Displays a success confirmation after a booking is made.
 */
import { useLanguage } from '../../i18n/LanguageContext';

interface BookingSuccessModalProps {
    visible: boolean;
}

export default function BookingSuccessModal({ visible }: BookingSuccessModalProps) {
    const { t } = useLanguage();

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 mx-4 text-center animate-bounce-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-2">
                    {t('calendar.booking.success')}
                </h3>
                <p className="text-text-sub-light dark:text-text-sub-dark">
                    Booking Confirmed
                </p>
            </div>
        </div>
    );
}
