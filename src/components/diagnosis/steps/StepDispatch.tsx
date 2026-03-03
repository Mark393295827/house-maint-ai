import React, { useEffect, useState } from 'react';
import AgentBubble from '../AgentBubble';
import type { Worker } from '../../../types';
import { mockWorkers } from '../../../__mocks__/mockData';

interface StepDispatchProps {
    diagnosis: any;
    locale: string;
    imageUrl: string | null;
    onDispatch: (worker: Worker) => void;
}

const StepDispatch: React.FC<StepDispatchProps> = ({ diagnosis, locale, imageUrl, onDispatch }) => {
    const [matchingState, setMatchingState] = useState<'searching' | 'found'>('searching');
    const [matchedWorker, setMatchedWorker] = useState<Worker | null>(null);

    useEffect(() => {
        // Simulate searching for nearby worker
        const timer = setTimeout(() => {
            // "Find" the top rated mock worker
            setMatchedWorker(mockWorkers[0]);
            setMatchingState('found');
        }, 3000); // 3 seconds of radar searching

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative h-full w-full bg-[#0a0f18] flex flex-col items-center justify-between text-white overflow-hidden">

            {/* The "Map" Background Simulation */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen overflow-hidden pointer-events-none">
                {/* Simulated roads and intersections for a dark map theme */}
                <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a3b5a" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    {/* Add some diagonal "highways" */}
                    <path d="M 0 150 Q 150 200 400 50" fill="none" stroke="#3a4b6c" strokeWidth="8" />
                    <path d="M -50 400 Q 200 350 500 600" fill="none" stroke="#3a4b6c" strokeWidth="6" />
                </svg>
            </div>

            {/* Radar Animation Overlay when searching */}
            {matchingState === 'searching' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
                    <div className="w-96 h-96 rounded-full border border-violet-500/30 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-[ping_3s_infinite]" />
                    <div className="w-64 h-64 rounded-full border border-violet-500/50 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-[ping_2s_infinite]" />
                    <div className="w-32 h-32 rounded-full border border-violet-500/80 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-violet-500/10 backdrop-blur-sm" />
                    <div className="w-4 h-4 rounded-full bg-violet-400 shadow-[0_0_20px_rgba(139,92,246,1)] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
            )}

            {/* Agent / Diagnosis Callout at top */}
            <div className="relative z-10 w-full p-6 pt-20 animate-fade-in-down">
                <AgentBubble
                    text={matchingState === 'searching'
                        ? (locale === 'zh'
                            ? `诊断结果: 发现【${diagnosis?.issue_name || '问题'}】。正在为您匹配附近的维修师傅...`
                            : `Diagnosis: Detected [${diagnosis?.issue_name || 'Issue'}]. Pinging nearby pros...`)
                        : (locale === 'zh'
                            ? `为您找到最近的师傅！`
                            : `Found a nearby pro!`)}
                    loading={matchingState === 'searching'}
                    locale={locale}
                />
            </div>

            {/* Bottom Sheet for Worker Details */}
            <div className={`relative z-10 w-full px-4 pb-8 transition-transform duration-700 ease-out ${matchingState === 'found' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 absolute bottom-0'}`}>
                {matchedWorker && (
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-6 w-full shadow-2xl">

                        {/* Worker Info */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative">
                                <img src={matchedWorker.avatar} alt="Pro Avatar" className="w-16 h-16 rounded-full border-2 border-emerald-400 object-cover" />
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 shadow-md flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">bolt</span>
                                    1.2km
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-xl">{matchedWorker.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center text-amber-400 text-sm">
                                        <span className="material-symbols-outlined text-[14px] fill-current">star</span>
                                        <span className="font-bold ml-1">{matchedWorker.rating}</span>
                                    </div>
                                    <span className="text-white/40 text-xs">•</span>
                                    <span className="text-white/80 text-sm">{matchedWorker.skills[0]} Pro</span>
                                </div>
                            </div>
                        </div>

                        {/* ETA & Info */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-black/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                                <span className="text-white/50 text-xs mb-1">ETA</span>
                                <span className="text-white font-bold text-xl">8 min</span>
                            </div>
                            <div className="bg-black/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                                <span className="text-white/50 text-xs mb-1">Est. Cost</span>
                                <span className="text-white font-bold text-xl text-emerald-400 font-mono">
                                    {diagnosis?.estimated_cost && diagnosis.estimated_cost !== 'Unknown' ? diagnosis.estimated_cost : '$85'}
                                </span>
                            </div>
                        </div>

                        {/* Dispatch Button */}
                        <button
                            onClick={() => onDispatch(matchedWorker)}
                            className="w-full bg-violet-600 hover:bg-violet-700 active:scale-95 transition-all text-white font-bold text-lg rounded-2xl py-4 shadow-[0_0_25px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2"
                        >
                            {locale === 'zh' ? '立即派单' : 'Dispatch Now'}
                            <span className="material-symbols-outlined rotate-[-45deg]">send</span>
                        </button>

                    </div>
                )}
            </div>

        </div>
    );
};

export default StepDispatch;
