import React, { useEffect, useState } from 'react';
import type { ToastType } from '../../contexts/ToastContext';

interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for exit animation
        setTimeout(onClose, 300);
    };

    const styles = {
        success: 'bg-green-500 text-white shadow-green-500/30',
        error: 'bg-red-500 text-white shadow-red-500/30',
        info: 'bg-blue-500 text-white shadow-blue-500/30',
        warning: 'bg-orange-500 text-white shadow-orange-500/30',
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning',
    };

    return (
        <div
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
                } ${styles[type]}`}
            role="alert"
        >
            <span className="material-symbols-outlined text-xl">{icons[type]}</span>
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
                <span className="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
    );
};

export default Toast;
