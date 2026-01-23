import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const CalendarPage = () => {
    const [selectedDay, setSelectedDay] = useState(12);

    const days = [
        { day: 'Mon', date: 12 },
        { day: 'Tue', date: 13 },
        { day: 'Wed', date: 14, hasTask: true },
        { day: 'Thu', date: 15 },
        { day: 'Fri', date: 16 },
    ];

    const morningTasks = [
        {
            title: 'Fix Leaking Faucet',
            location: 'Master Bathroom Sink',
            duration: '30m',
            icon: 'water_drop',
            iconBg: 'bg-blue-50 dark:bg-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            hasAiScan: true,
        },
        {
            title: 'Check Smoke Detectors',
            location: 'Hallway & Kitchen',
            duration: '15m',
            icon: 'detector_smoke',
            iconBg: 'bg-purple-50 dark:bg-purple-900/20',
            iconColor: 'text-purple-600 dark:text-purple-400',
        },
    ];

    const afternoonTasks = [
        {
            title: 'Gutter Cleaning',
            location: 'Exterior Maintenance',
            duration: '1h 45m',
            icon: 'roofing',
            iconBg: 'bg-green-50 dark:bg-green-900/20',
            iconColor: 'text-primary',
            isAutoFilled: true,
        },
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Top App Bar */}
            <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center p-4 justify-between">
                    <div className="flex-1">
                        <h1 className="text-xl font-bold leading-tight tracking-[-0.015em] text-text-main-light dark:text-text-main-dark">Maintenance Plan</h1>
                        <p className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark mt-0.5">Your home health schedule</p>
                    </div>
                    <button className="flex items-center justify-center rounded-xl h-10 w-10 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all duration-300">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>picture_as_pdf</span>
                    </button>
                </div>
            </div>

            {/* Week Selector */}
            <div className="relative flex items-center justify-center py-4 bg-background-light dark:bg-background-dark">
                <button className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] px-4 text-center">&lt; Oct 12 - Oct 18 &gt;</h2>
                <button className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            {/* Date Tabs */}
            <div className="pb-2 overflow-x-auto hide-scrollbar px-4">
                <div className="flex justify-between gap-3 min-w-[360px]">
                    {days.map((d) => (
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

            {/* Resource Alert Banner */}
            <div className="px-4 py-2 mt-2">
                <div className="relative overflow-hidden rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/20 p-4 shadow-sm">
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-orange-200/50 dark:bg-orange-800/30 rounded-full blur-xl"></div>
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <div>
                                <p className="text-gray-900 dark:text-gray-100 text-sm font-bold leading-tight">Resource Overload</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5 font-medium">3 heavy tasks on Saturday afternoon.</p>
                            </div>
                        </div>
                        <button className="w-full sm:w-auto flex-shrink-0 h-9 px-4 bg-white dark:bg-surface-dark text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:bg-orange-50 dark:hover:bg-orange-900/40 transition-colors">
                            Reschedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Morning Section */}
            <div className="px-4 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Morning
                    </h3>
                    <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">8:00 AM - 12:00 PM</span>
                </div>
                {morningTasks.map((task, index) => (
                    <div key={index} className="group relative flex flex-col bg-white dark:bg-surface-dark rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
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
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Afternoon Section */}
            <div className="px-4 pt-2">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                        Afternoon
                    </h3>
                    <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">12:00 PM - 5:00 PM</span>
                </div>
                {afternoonTasks.map((task, index) => (
                    <div key={index} className="group relative flex flex-col bg-white dark:bg-surface-dark rounded-xl p-4 mb-3 border-l-4 border-l-primary border-t border-r border-b border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
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
                                    {task.isAutoFilled && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-xs font-bold text-primary">
                                            <span className="material-symbols-outlined text-[14px]">autorenew</span> Auto-filled
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Night Section (Empty State) */}
            <div className="px-4 pt-2 mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        Night
                    </h3>
                    <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">5:00 PM - 9:00 PM</span>
                </div>
                <div className="w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center bg-gray-50/50 dark:bg-surface-dark/30 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">add</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Drag tasks here or tap to add</span>
                </div>
            </div>

            {/* Floating Action Button */}
            <button className="fixed z-40 bottom-24 right-5 w-14 h-14 bg-primary rounded-full shadow-xl shadow-primary/30 text-white flex items-center justify-center hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all duration-300">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>add</span>
            </button>

            <BottomNav />
        </div>
    );
};

export default CalendarPage;
