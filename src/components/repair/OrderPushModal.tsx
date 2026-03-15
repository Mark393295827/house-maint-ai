import React, { useState, useEffect } from 'react';

interface OrderPushModalProps {
    order: {
        id: string | number;
        title: string;
        description: string;
        distance_km: number | null;
        category: string;
        urgency_score: number;
    };
    onAccept: (id: string) => void;
    onDecline: () => void;
}

const OrderPushModal: React.FC<OrderPushModalProps> = ({ order, onAccept, onDecline }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleDecline = () => {
        setIsVisible(false);
        setTimeout(onDecline, 300);
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-all duration-300 ${isVisible ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-transparent backdrop-blur-0 opacity-0'}`}>
            <div className={`w-full max-w-sm telemetry-card rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 transform ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-20 scale-95'}`}>
                {/* Status Bar */}
                <div className="absolute top-0 inset-x-0 h-1 hidden sm:block">
                    <div className="h-full w-1/3 bg-neon-cyan animate-scan-line-fast" />
                </div>

                {/* Map Preview Placeholder */}
                <div className="relative h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    {/* SVG Map Illustration */}
                    <svg className="w-full h-full opacity-30 dark:opacity-20" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 50 L100 80 L300 20 L400 60" stroke="#6366f1" strokeWidth="2" />
                        <path d="M50 0 L80 100 L20 200" stroke="#6366f1" strokeWidth="1" />
                        <path d="M150 0 L120 200" stroke="#6366f1" strokeWidth="1" />
                        {/* Target Marker */}
                        <circle cx="200" cy="100" r="8" fill="#E10600" className="animate-pulse" />
                        <circle cx="200" cy="100" r="20" stroke="#E10600" strokeWidth="1" className="animate-ping" opacity="0.3" />
                    </svg>
                    
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-racing-red text-white text-[10px] font-black tracking-widest uppercase shadow-lg">
                            New Service Request
                        </span>
                    </div>

                    <div className="absolute bottom-4 right-4 flex flex-col items-end">
                        <div className="bg-background-dark/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                            <span className="material-symbols-outlined text-neon-cyan text-sm">near_me</span>
                            <span className="text-sm font-black font-telemetry text-text-main-dark">
                                {order.distance_km || '1.2'} KM
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-white text-2xl">
                                home_repair_service
                            </span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-text-main-dark leading-tight">
                                {order.title}
                            </h2>
                            <p className="text-xs text-text-sub-dark font-medium">
                                Estimated Travel: <span className="text-neon-cyan font-bold">5 mins</span>
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-text-sub-dark leading-relaxed mb-6 line-clamp-3 italic">
                        "{order.description}"
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleDecline}
                            className="h-12 rounded-2xl border border-white/5 bg-white/5 text-text-sub-dark font-bold text-sm transition-all hover:bg-white/10 active:scale-95"
                        >
                            Ignore
                        </button>
                        <button
                            onClick={() => onAccept(String(order.id))}
                            className="h-12 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-sm shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">touch_app</span>
                            ACCEPT JOB
                        </button>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes scan-line-fast {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(300%); }
                }
                .animate-scan-line-fast {
                    animation: scan-line-fast 1.5s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default OrderPushModal;
