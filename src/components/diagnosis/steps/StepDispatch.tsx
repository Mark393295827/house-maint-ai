import React, { useEffect, useState } from 'react';
import AgentBubble from '../AgentBubble';
import type { Worker } from '../../../types';
import { mockWorkers } from '../../../__mocks__/mockData';
import OperatingLoopProgress from '../OperatingLoopProgress';

interface StepDispatchProps {
    diagnosis: any;
    locale: string;
    onDispatch: (worker: Worker) => void;
}

const StepDispatch: React.FC<StepDispatchProps> = ({ diagnosis, locale, onDispatch }) => {
    const [matchingState, setMatchingState] = useState<'searching' | 'found'>('searching');
    const [matchedWorker, setMatchedWorker] = useState<Worker | null>(null);
    const isZh = locale === 'zh';

    useEffect(() => {
        const timer = setTimeout(() => {
            setMatchedWorker(mockWorkers[0]);
            setMatchingState('found');
        }, 3500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative h-full w-full bg-[#fbfbfd] flex flex-col items-center justify-between text-[#1d1d1f] overflow-hidden">
            
            {/* Apple "Silver/Alumni" Map Style Background */}
            <div className="absolute inset-0 z-0 opacity-100 overflow-hidden pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="light-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e1e1e6" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#light-grid)" />
                    {/* Simulated High-Precision Vector Paths */}
                    <path d="M 0 300 Q 200 320 600 100" fill="none" stroke="#d2d2d7" strokeWidth="6" strokeLinecap="round" />
                    <path d="M -100 500 Q 300 450 700 800" fill="none" stroke="#d2d2d7" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                    <path d="M 400 0 V 1000" fill="none" stroke="#e5e5ea" strokeWidth="2" opacity="0.4" />
                </svg>
            </div>

            {/* Premium Soft Radar Animation */}
            {matchingState === 'searching' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                    <div className="w-[600px] h-[600px] rounded-full border border-[#0071e3]/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ping_4s_infinite]" />
                    <div className="w-[400px] h-[400px] rounded-full border border-[#0071e3]/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ping_3s_infinite]" />
                    <div className="w-[200px] h-[200px] rounded-full border border-[#0071e3]/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0071e3]/5 backdrop-blur-3xl animate-[pulse_2s_infinite]" />
                    
                    {/* Pulsing Core */}
                    <div className="relative">
                        <div className="w-12 h-12 rounded-[14px] bg-[#1d1d1f] flex items-center justify-center shadow-2xl animate-bounce">
                             <span className="material-symbols-outlined text-white text-xl">location_searching</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Apple "Setup Assistant" Header */}
            <div className="relative z-10 w-full p-8 pt-24 stagger-item">
                <OperatingLoopProgress locale={locale} activeStageId="dispatch" compact className="mb-6" />
                <div className="max-w-md mx-auto">
                    <AgentBubble 
                        text={matchingState === 'searching' 
                            ? (isZh ? `正在检索 ${diagnosis?.issue_name || '问题'} 专家...` : `Searching for ${diagnosis?.issue_name || 'Issue'} pros...`)
                            : (isZh ? `已为您精准匹配服务商` : `Precision matching complete`)}
                        loading={matchingState === 'searching'}
                        locale={locale}
                    />
                </div>
            </div>

            {/* Worker Precision Card (Bottom Sheet Style) */}
            <div className={`relative z-20 w-full px-6 pb-12 transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${matchingState === 'found' ? 'translate-y-0 opacity-100' : 'translate-y-[200px] opacity-0 pointer-events-none'}`}>
                {matchedWorker && (
                    <div className="group apple-glass bg-white/60 ring-1 ring-black/5 rounded-[32px] p-8 w-full shadow-2xl shadow-black/5 transform hover:-translate-y-1 transition-transform">
                        
                        {/* Status Identifier (New!) */}
                        <div className="flex items-center gap-2 mb-8">
                             <div className="px-3 py-1 bg-[#28cd41]/10 rounded-full border border-[#28cd41]/20">
                                <span className="text-[10px] font-black text-[#28cd41] uppercase tracking-widest">{isZh ? '最优匹配' : 'BEST MATCH'}</span>
                             </div>
                             <div className="h-px flex-1 bg-black/5" />
                        </div>

                        {/* Profile Section */}
                        <div className="flex items-center gap-6 mb-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3] to-[#5e5ce6] rounded-full blur-xl opacity-20 animate-pulse" />
                                <img src={matchedWorker.avatar || ''} alt="Pro" className="relative w-24 h-24 rounded-full border-[4px] border-white shadow-2xl object-cover" />
                                <div className="absolute -bottom-1 -right-1 bg-white ring-1 ring-black/5 text-[#1d1d1f] text-[10px] font-black px-2 py-1 rounded-lg shadow-xl flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] text-[#28cd41]">bolt</span>
                                    1.2km
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[#1d1d1f] font-black text-2xl tracking-tighter mb-1 leading-tight">{matchedWorker.name}</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-[#ff9500]/10 px-2 py-0.5 rounded-md">
                                        <span className="material-symbols-outlined text-[14px] text-[#ff9500] fill-current">star</span>
                                        <span className="font-black text-[#1d1d1f] text-xs ml-1">{matchedWorker.rating}</span>
                                    </div>
                                    <span className="text-[13px] font-bold text-[#86868b] uppercase tracking-tight">
                                        {(matchedWorker.skills && matchedWorker.skills[0]) ? matchedWorker.skills[0] : 'PRO'} MASTER
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Precision Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                             <div className="apple-glass bg-white/40 ring-1 ring-black/5 p-5 rounded-2xl flex flex-col items-center">
                                 <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2">ETA</span>
                                 <div className="flex items-baseline gap-1">
                                     <span className="text-2xl font-black tracking-tighter">8</span>
                                     <span className="text-[12px] font-bold text-[#86868b]">{isZh ? '分钟' : 'min'}</span>
                                 </div>
                             </div>
                             <div className="apple-glass bg-white/40 ring-1 ring-black/5 p-5 rounded-2xl flex flex-col items-center">
                                 <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2">Cost</span>
                                 <div className="flex items-baseline gap-1">
                                     <span className="text-2xl font-black tracking-tighter text-[#0071e3]">
                                        {diagnosis?.estimated_cost && diagnosis.estimated_cost !== 'Unknown' ? diagnosis.estimated_cost : '¥120'}
                                     </span>
                                 </div>
                             </div>
                        </div>

                        {/* Apple-Style Confirmation Button */}
                        <button
                            onClick={() => onDispatch(matchedWorker)}
                            className="w-full h-16 bg-[#1d1d1f] hover:bg-black text-white rounded-[20px] text-[15px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] press-scale transition-all"
                        >
                            {isZh ? '确认委派' : 'Confirm Dispatch'}
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default StepDispatch;
