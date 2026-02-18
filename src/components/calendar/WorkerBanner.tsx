/**
 * WorkerBanner — Extracted from CalendarPage
 * Displays the selected worker's info with a dismiss button.
 */
import type { Worker } from '../../types';

interface WorkerBannerProps {
    worker: Worker;
    onDismiss: () => void;
}

export default function WorkerBanner({ worker, onDismiss }: WorkerBannerProps) {
    return (
        <div className="px-4 py-3">
            <div className="flex items-center gap-3 bg-primary/10 rounded-xl p-3">
                <div
                    className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white"
                    style={{ backgroundImage: `url("${worker.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + worker.name}")` }}
                />
                <div className="flex-1">
                    <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                        {worker.name}
                    </h3>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                        ⭐ {worker.rating?.toFixed(1)} · {worker.distance}km
                    </p>
                </div>
                <button
                    onClick={onDismiss}
                    className="p-2 text-gray-400 hover:text-red-500"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        </div>
    );
}
