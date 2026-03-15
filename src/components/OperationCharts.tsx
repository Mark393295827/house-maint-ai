import React from 'react';

export const PerformanceChart: React.FC = () => {
    // A simple SVG line chart simulating Aegis style
    const points = [40, 60, 55, 70, 65, 85, 45, 60, 75, 80, 70, 90];
    const width = 400;
    const height = 120;
    const step = width / (points.length - 1);
    
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (p / 100 * height)}`).join(' ');
    const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

    return (
        <div className="w-full h-full min-h-[140px] relative mt-6">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(v => (
                    <line key={v} x1="0" y1={height - (v / 100 * height)} x2={width} y2={height - (v / 100 * height)} stroke="#f1f5f9" strokeWidth="1" />
                ))}
                
                <path d={areaData} fill="url(#chartGradient)" />
                <path d={pathData} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Focus Indicator */}
                <circle cx={step * 9} cy={height - (points[9] / 100 * height)} r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
            </svg>
            <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
            </div>
        </div>
    );
};

export const WorkloadDistribution: React.FC = () => {
    return (
        <div className="flex items-center gap-8 mt-6">
            <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="60, 100" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="25, 100" strokeDashoffset="-60" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="10, 100" strokeDashoffset="-85" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 font-mono">85%</span>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Load</span>
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Active Inferences (60%)</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Agent Capacity (25%)</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">System Reserve (15%)</span>
                </div>
            </div>
        </div>
    );
};
