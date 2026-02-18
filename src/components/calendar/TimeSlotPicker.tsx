import React from 'react';

export interface TimeSlot {
    id: string;
    label: string;
    time: string;
    icon: string;
}

interface TimeSlotPickerProps {
    slots: TimeSlot[];
    selectedTime: string | null;
    onSelectTime: (timeId: string) => void;
    title: string;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ slots, selectedTime, onSelectTime, title }) => {
    return (
        <div className="px-4 py-4">
            <h3 className="text-sm font-bold text-text-sub-light dark:text-text-sub-dark mb-3">
                {title}
            </h3>
            <div className="flex gap-3">
                {slots.map((slot) => (
                    <button
                        key={slot.id}
                        onClick={() => onSelectTime(slot.id)}
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
    );
};

export default TimeSlotPicker;
