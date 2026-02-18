import { useState, useEffect } from 'react';

interface TimerState {
    timeLeft: number;
    isActive: boolean;
    duration: number;
}

export const useRepairTimer = () => {
    // { [stepIndex]: { quantity: number... } }
    const [timers, setTimers] = useState<Record<number, TimerState>>({});

    useEffect(() => {
        const interval = setInterval(() => {
            setTimers(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(key => {
                    const idx = Number(key);
                    if (next[idx].isActive && next[idx].timeLeft > 0) {
                        next[idx] = { ...next[idx], timeLeft: next[idx].timeLeft - 1 };
                        changed = true;

                        // play sound on finish
                        if (next[idx].timeLeft === 0) {
                            next[idx].isActive = false;
                            new Audio('/sounds/timer-done.mp3').play().catch(() => { }); // Fallback if missing
                        }
                    }
                });
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const toggleTimer = (index: number, duration: number) => {
        setTimers(prev => {
            const current = prev[index] || { timeLeft: duration, isActive: false, duration };
            // If finished, reset
            if (current.timeLeft === 0) {
                return { ...prev, [index]: { ...current, timeLeft: duration, isActive: true } };
            }
            return {
                ...prev,
                [index]: { ...current, isActive: !current.isActive, duration }
            };
        });
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return {
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0')
        };
    };

    return { timers, toggleTimer, formatTime };
};
