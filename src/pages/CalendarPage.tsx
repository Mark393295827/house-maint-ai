import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { hapticSuccess } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';
import type { Worker } from '../types';

import type { TaskItem } from '../components/calendar/TaskCard';
import BookingSuccessModal from '../components/calendar/BookingSuccessModal';
import WorkerBanner from '../components/calendar/WorkerBanner';
import WeekSelector from '../components/calendar/WeekSelector';
import DateStrip from '../components/calendar/DateStrip';
import TimeSlotPicker from '../components/calendar/TimeSlotPicker';
import DaySection from '../components/calendar/DaySection';

const CalendarPage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Fetch reports with React Query
    // const { data: reportsData } = useQuery({
    //     queryKey: ['reports'],
    //     queryFn: () => api.getReports(),
    // });
    // const reports = reportsData?.reports ?? []; // kept for future use if we filter by report

    // Get current date info
    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', { month: 'short' });
    const currentYear = today.getFullYear();

    // Generate next 7 days
    const generateDays = () => {
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            days.push({
                day: dayNames[date.getDay()],
                date: date.getDate(),
                fullDate: date,
                hasTask: i === 0 || i === 2, // Mock: today and day after tomorrow have tasks
            });
        }
        return days;
    };

    const days = generateDays();

    // Available time slots
    const timeSlots = [
        { id: 'morning', label: t('calendar.time.morning'), time: '8:00 - 12:00', icon: 'wb_sunny' },
        { id: 'afternoon', label: t('calendar.time.afternoon'), time: '12:00 - 17:00', icon: 'wb_twilight' },
        { id: 'evening', label: t('calendar.time.night'), time: '17:00 - 21:00', icon: 'nights_stay' },
    ];

    // Load selected worker and reports on mount
    useEffect(() => {
        // Get selected worker from session storage
        const workerData = sessionStorage.getItem('selectedWorker');
        if (workerData) {
            try {
                setSelectedWorker(JSON.parse(workerData));
            } catch (e) {
                console.warn('Failed to parse worker data');
            }
        }

        // Set default selected day to today
        if (days.length > 0) {
            setSelectedDay(days[0].date);
        }
    }, []);

    // Get tasks for selected day
    const getTasksForDay = () => {
        if (!selectedDay) return { morning: [], afternoon: [], night: [] };

        // Mock tasks - in real app, filter from reports
        const morningTasks: TaskItem[] = selectedDay === days[0]?.date ? [
            {
                title: 'Fix Leaking Faucet',
                titleZh: '修复漏水龙头',
                location: 'Master Bathroom Sink',
                duration: '30m',
                icon: 'water_drop',
                iconBg: 'bg-blue-50 dark:bg-blue-900/20',
                iconColor: 'text-blue-600 dark:text-blue-400',
                hasAiScan: true,
            },
        ] : [];

        const afternoonTasks: TaskItem[] = selectedDay === days[2]?.date ? [
            {
                title: 'Gutter Cleaning',
                titleZh: '清理雨水槽',
                location: 'Exterior Maintenance',
                duration: '1h 45m',
                icon: 'roofing',
                iconBg: 'bg-green-50 dark:bg-green-900/20',
                iconColor: 'text-primary',
                isAutoFilled: true,
            },
        ] : [];

        return { morning: morningTasks, afternoon: afternoonTasks, night: [] };
    };

    const tasks = getTasksForDay();

    // Handle booking confirmation
    const handleConfirmBooking = async () => {
        if (!selectedDay || !selectedTime) return;

        setIsBooking(true);
        try {
            const reportId = sessionStorage.getItem('lastReportId');

            if (reportId && selectedWorker) {
                // Update report status to 'matched' and assign worker
                await api.updateReport(reportId, {
                    status: 'matched',
                    matched_worker_id: selectedWorker.id
                });
            } else {
                // Fallback for demo without a real report
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            hapticSuccess();
            setBookingSuccess(true);

            // Clear session storage
            sessionStorage.removeItem('selectedWorker');
            sessionStorage.removeItem('lastReportId');

            // Navigate back to home or profile after delay
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (err) {
            console.error('Booking failed:', err);
            alert('Booking failed, please try again'); // Add to i18n if needed
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl page-enter">
            <BookingSuccessModal visible={bookingSuccess} />

            {/* Top App Bar */}
            <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center p-4 justify-between">
                    <div className="flex-1">
                        <h1 className="text-xl font-bold leading-tight tracking-[-0.015em] text-text-main-light dark:text-text-main-dark">
                            {selectedWorker ? t('calendar.selectWorker') : t('calendar.title')}
                        </h1>
                        <p className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark mt-0.5">
                            {selectedWorker ? t('calendar.selectWorkerSub') : t('calendar.subtitle')}
                        </p>
                    </div>
                    <button className="flex items-center justify-center rounded-xl h-10 w-10 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all duration-300">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>picture_as_pdf</span>
                    </button>
                </div>
            </div>

            {/* Selected Worker Banner */}
            {selectedWorker && (
                <WorkerBanner
                    worker={selectedWorker}
                    onDismiss={() => { setSelectedWorker(null); sessionStorage.removeItem('selectedWorker'); }}
                />
            )}

            {/* Week Selector */}
            <WeekSelector
                currentMonth={currentMonth}
                currentYear={currentYear}
                startDate={days[0]?.date}
                endDate={days[6]?.date}
            />

            {/* Date Tabs */}
            <DateStrip
                days={days}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
            />

            {/* Time Slot Selection (when booking) */}
            {selectedWorker && (
                <TimeSlotPicker
                    slots={timeSlots}
                    selectedTime={selectedTime}
                    onSelectTime={setSelectedTime}
                    title={t('calendar.booking.selectTime')}
                />
            )}

            {/* Morning Section */}
            {!selectedWorker && (
                <>
                    <DaySection
                        title={t('calendar.sections.morning')}
                        timeRange="8:00 AM - 12:00 PM"
                        colorClass="bg-yellow-400"
                        tasks={tasks.morning}
                        emptyMessage={t('calendar.tasks.none')}
                    />

                    {/* Afternoon Section */}
                    <DaySection
                        title={t('calendar.sections.afternoon')}
                        timeRange="12:00 PM - 5:00 PM"
                        colorClass="bg-orange-400"
                        tasks={tasks.afternoon}
                        emptyMessage={t('calendar.tasks.none')}
                        isHighlighted={true}
                    />

                    {/* Night Section (Empty State / Add Button) */}
                    <DaySection
                        title={t('calendar.sections.night')}
                        timeRange="5:00 PM - 9:00 PM"
                        colorClass="bg-indigo-400"
                        tasks={[]}
                        emptyMessage={t('calendar.tasks.add')}
                        showAddButton={true}
                    />
                </>
            )}

            {/* Booking Confirmation Button */}
            {selectedWorker && (
                <div className="px-4 py-6 mt-auto">
                    <button
                        onClick={handleConfirmBooking}
                        disabled={!selectedDay || !selectedTime || isBooking}
                        className={`w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                            ${!selectedDay || !selectedTime || isBooking
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30 active:scale-[0.98]'
                            }`}
                    >
                        {isBooking ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>{t('calendar.booking.processing')}</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">event_available</span>
                                <span>{t('calendar.booking.confirm')}</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Floating Action Button (only when not booking) */}
            {!selectedWorker && (
                <button className="fixed z-40 bottom-24 right-5 w-14 h-14 bg-primary rounded-full shadow-xl shadow-primary/30 text-white flex items-center justify-center hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all duration-300">
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>add</span>
                </button>
            )}

            <BottomNav />
        </div>
    );
};

export default CalendarPage;
