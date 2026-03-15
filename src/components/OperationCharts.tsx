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
        <div className="w-full h-full min-h-[160px] relative mt-8">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007aff" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#007aff" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Subtle Grid */}
                {[0, 50, 100].map(v => (
                    <line key={v} x1="0" y1={height - (v / 100 * height)} x2={width} y2={height - (v / 100 * height)} stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
                ))}
                
                <path d={areaData} fill="url(#chartGradient)" />
                <path d={pathData} fill="none" stroke="#007aff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_4px_8px_#007aff33]" />
                
                {/* Active Tooltip Indicator */}
                <circle cx={step * 9} cy={height - (points[9] / 100 * height)} r="5" fill="#007aff" stroke="white" strokeWidth="3" shadow-sm />
            </svg>
            <div className="flex justify-between mt-5 pt-4 border-t border-black/5 text-[10px] text-[#86868b] font-black uppercase tracking-[0.2em]">
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
        <div className="flex items-center gap-10 mt-8">
            <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="4.5" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#007aff" strokeWidth="4.5" strokeDasharray="60, 100" strokeLinecap="round" className="drop-shadow-sm" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#28cd41" strokeWidth="4.5" strokeDasharray="25, 100" strokeDashoffset="-60" strokeLinecap="round" className="drop-shadow-sm" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#ff9500" strokeWidth="4.5" strokeDasharray="10, 100" strokeDashoffset="-85" strokeLinecap="round" className="drop-shadow-sm" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-[#1d1d1f] tabular-nums">85%</span>
                    <span className="text-[10px] text-[#86868b] font-black uppercase tracking-widest">Load</span>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-4 group">
                    <div className="w-3 h-3 rounded-full bg-[#007aff] shadow-lg shadow-[#007aff]/30" />
                    <span className="text-[12px] font-black text-[#1d1d1f] tracking-tight">AI Compute (60%)</span>
                </div>
                <div className="flex items-center gap-4 group">
                    <div className="w-3 h-3 rounded-full bg-[#28cd41] shadow-lg shadow-[#28cd41]/30" />
                    <span className="text-[12px] font-black text-[#1d1d1f] tracking-tight">Agent Latency (25%)</span>
                </div>
                <div className="flex items-center gap-4 group">
                    <div className="w-3 h-3 rounded-full bg-[#ff9500] shadow-lg shadow-[#ff9500]/30" />
                    <span className="text-[12px] font-black text-[#1d1d1f] tracking-tight">System Idle (15%)</span>
                </div>
            </div>
        </div>
    );
};
