import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { hapticSuccess } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';

const CalendarPage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [reports, setReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);

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

        // Fetch user's reports/bookings
        const fetchReports = async () => {
            try {
                const data = await api.getReports('pending', 10);
                setReports(data.reports || []);
            } catch (err) {
                console.warn('Failed to fetch reports:', err);
            } finally {
                setLoadingReports(false);
            }
        };
        fetchReports();
    }, []);

    // Get tasks for selected day
    const getTasksForDay = () => {
        if (!selectedDay) return { morning: [], afternoon: [], night: [] };

        // Mock tasks - in real app, filter from reports
        const morningTasks = selectedDay === days[0]?.date ? [
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

        const afternoonTasks = selectedDay === days[2]?.date ? [
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

    // Render task card
    const renderTaskCard = (task, index, isHighlighted = false) => (
        <div
            key={index}
            className={`group relative flex flex-col bg-white dark:bg-surface-dark rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5
                ${isHighlighted ? 'border-l-4 border-l-primary border-t border-r border-b border-gray-100 dark:border-gray-800' : 'border border-gray-100 dark:border-gray-800'}`}
        >
            <div className="absolute top-4 right-4 text-gray-300 dark:text-gray-600 cursor-grab hover:text-primary transition-colors">
                <span className="material-symbols-outlined">drag_indicator</span>
            </div>
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${task.iconBg} flex items-center justify-center ${task.iconColor}`}>
                    <span className="material-symbols-outlined">{task.icon}</span>
                </div>
                <div className="flex-1 pr-8">
                    <h4 className="text-base font-bold text-text-main-light dark:text-text-main-dark leading-tight mb-1">{task.title}</h4>
                    <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-3">{task.location}</p>
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            <span className="material-symbols-outlined text-[14px]">schedule</span> {task.duration}
                        </span>
                        {task.hasAiScan && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-xs font-bold text-blue-700 dark:text-blue-300">
                                <span className="material-symbols-outlined text-[14px]">smart_toy</span> AI Scan
                            </span>
                        )}
                        {task.isAutoFilled && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-xs font-bold text-primary">
                                <span className="material-symbols-outlined text-[14px]">autorenew</span> Auto-filled
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl page-enter">
            {/* Booking Success Modal */}
            {bookingSuccess && (
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
            )}

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
                <div className="px-4 py-3">
                    <div className="flex items-center gap-3 bg-primary/10 rounded-xl p-3">
                        <div
                            className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white"
                            style={{ backgroundImage: `url("${selectedWorker.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + selectedWorker.name}")` }}
                        />
                        <div className="flex-1">
                            <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                                {selectedWorker.name}
                            </h3>
                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                ⭐ {selectedWorker.rating?.toFixed(1)} · {selectedWorker.distance}km
                            </p>
                        </div>
                        <button
                            onClick={() => { setSelectedWorker(null); sessionStorage.removeItem('selectedWorker'); }}
                            className="p-2 text-gray-400 hover:text-red-500"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Week Selector */}
            <div className="relative flex items-center justify-center py-4 bg-background-light dark:bg-background-dark">
                <button className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 text-center">
                    {currentMonth} {days[0]?.date} - {currentMonth} {days[6]?.date}, {currentYear}
                </h2>
                <button className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            {/* Date Tabs */}
            <div className="pb-2 overflow-x-auto hide-scrollbar px-4">
                <div className="flex justify-between gap-3 min-w-[360px]">
                    {days.slice(0, 5).map((d) => (
                        <button
                            key={d.date}
                            onClick={() => setSelectedDay(d.date)}
                            className={`flex flex-col items-center justify-center rounded-2xl w-16 h-20 flex-shrink-0 transition-all ${selectedDay === d.date
                                ? 'bg-primary shadow-lg shadow-primary/25 text-white'
                                : 'bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 text-text-sub-light dark:text-text-sub-dark hover:border-primary/50'
                                }`}
                        >
                            <span className={`text-xs font-medium mb-1 ${selectedDay === d.date ? 'opacity-80' : ''}`}>{d.day}</span>
                            <span className={`text-xl font-bold ${selectedDay === d.date ? '' : 'text-text-main-light dark:text-text-main-dark'}`}>{d.date}</span>
                            {(selectedDay === d.date || d.hasTask) && (
                                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${selectedDay === d.date ? 'bg-white' : 'bg-primary/40'}`}></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Slot Selection (when booking) */}
            {selectedWorker && (
                <div className="px-4 py-4">
                    <h3 className="text-sm font-bold text-text-sub-light dark:text-text-sub-dark mb-3">
                        {t('calendar.booking.selectTime')}
                    </h3>
                    <div className="flex gap-3">
                        {timeSlots.map((slot) => (
                            <button
                                key={slot.id}
                                onClick={() => setSelectedTime(slot.id)}
                                className={`flex-1 flex flex-col items-center p-3 rounded-xl transition-all ${selectedTime === slot.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                    : 'bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl mb-1 ${selectedTime === slot.id ? 'text-white' : 'text-text-sub-light dark:text-text-sub-dark'
                                    }`}>{slot.icon}</span>
                                <span className="text-sm font-bold">{slot.label}</span>
                                <span className={`text-xs ${selectedTime === slot.id ? 'opacity-80' : 'text-text-sub-light dark:text-text-sub-dark'}`}>
                                    {slot.time}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Morning Section */}
            {!selectedWorker && (
                <>
                    <div className="px-4 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                {t('calendar.sections.morning')}
                            </h3>
                            <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">8:00 AM - 12:00 PM</span>
                        </div>
                        {tasks.morning.length > 0 ? (
                            tasks.morning.map((task, index) => renderTaskCard(task, index))
                        ) : (
                            <div className="text-center py-6 text-text-sub-light dark:text-text-sub-dark text-sm">
                                {t('calendar.tasks.none')}
                            </div>
                        )}
                    </div>

                    {/* Afternoon Section */}
                    <div className="px-4 pt-2">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                {t('calendar.sections.afternoon')}
                            </h3>
                            <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">12:00 PM - 5:00 PM</span>
                        </div>
                        {tasks.afternoon.length > 0 ? (
                            tasks.afternoon.map((task, index) => renderTaskCard(task, index, true))
                        ) : (
                            <div className="text-center py-6 text-text-sub-light dark:text-text-sub-dark text-sm">
                                {t('calendar.tasks.none')}
                            </div>
                        )}
                    </div>

                    {/* Night Section (Empty State) */}
                    <div className="px-4 pt-2 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                {t('calendar.sections.night')}
                            </h3>
                            <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">5:00 PM - 9:00 PM</span>
                        </div>
                        <div className="w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center bg-gray-50/50 dark:bg-surface-dark/30 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm flex items-center justify-center mb-2">
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">add</span>
                            </div>
                            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{t('calendar.tasks.add')}</span>
                        </div>
                    </div>
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
