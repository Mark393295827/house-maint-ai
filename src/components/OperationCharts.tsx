import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export const PerformanceChart: React.FC = () => {
    // A simple SVG line chart simulating Aegis style
    const points = [40, 60, 55, 70, 65, 85, 45, 60, 75, 80, 70, 90];
    const width = 400;
    const height = 120;
    const step = width / (points.length - 1);
    
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (p / 100 * height)}`).join(' ');
    const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

    return (
        <div className="w-full h-full min-h-[140px] sm:min-h-[160px] relative mt-6 lg:mt-10">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007aff" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#007aff" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                {/* Subtle Grid */}
                {[0, 50, 100].map(v => (
                    <line key={v} x1="0" y1={height - (v / 100 * height)} x2={width} y2={height - (v / 100 * height)} stroke="rgba(0,0,0,0.03)" strokeWidth="0.5" />
                ))}
                
                <path d={areaData} fill="url(#chartGradient)" />
                <path d={pathData} fill="none" stroke="#007aff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                
                {/* Active Tooltip Indicator */}
                <circle cx={step * 9} cy={height - (points[9] / 100 * height)} r="6" fill="#007aff" stroke="white" strokeWidth="3" className="shadow-xl" />
            </svg>
            <div className="flex justify-between gap-3 mt-6 lg:mt-8 pt-5 border-t border-black/5 text-[8px] sm:text-[9px] text-[#86868b] font-black uppercase tracking-[0.12em] sm:tracking-[0.25em]">
                <span>08:00 AM</span>
                <span>12:00 PM</span>
                <span>04:00 PM</span>
                <span>08:00 PM</span>
            </div>
        </div>
    );
};

export const WorkloadDistribution: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-8 sm:gap-10 lg:gap-12 mt-6 lg:mt-10">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto sm:mx-0 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0,0,0,0.02)" strokeWidth="4.5" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#007aff" strokeWidth="4.5" strokeDasharray="60, 100" strokeLinecap="round" strokeOpacity="0.9" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#28cd41" strokeWidth="4.5" strokeDasharray="25, 100" strokeDashoffset="-60" strokeLinecap="round" strokeOpacity="0.9" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#ff9500" strokeWidth="4.5" strokeDasharray="10, 100" strokeDashoffset="-85" strokeLinecap="round" strokeOpacity="0.9" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-black text-[#1d1d1f] tracking-tighter tabular-nums">85%</span>
                    <span className="text-[10px] text-[#86868b] font-black uppercase tracking-[0.2em] mt-1">{t('enterprise.charts.load')}</span>
                </div>
            </div>
            <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center gap-5 group">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#007aff] shadow-lg shadow-blue-500/20" />
                    <div>
                        <span className="block text-[13px] font-black text-[#1d1d1f] tracking-tight">{t('enterprise.charts.aiCompute')}</span>
                        <span className="text-[11px] font-black text-[#86868b] opacity-60">{t('enterprise.charts.capacity', { value: 60 })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-5 group">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#28cd41] shadow-lg shadow-green-500/20" />
                    <div>
                        <span className="block text-[13px] font-black text-[#1d1d1f] tracking-tight">{t('enterprise.charts.agentLatency')}</span>
                        <span className="text-[11px] font-black text-[#86868b] opacity-60">{t('enterprise.charts.capacity', { value: 25 })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-5 group">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff9500] shadow-lg shadow-orange-500/20" />
                    <div>
                        <span className="block text-[13px] font-black text-[#1d1d1f] tracking-tight">{t('enterprise.charts.systemIdle')}</span>
                        <span className="text-[11px] font-black text-[#86868b] opacity-60">{t('enterprise.charts.capacity', { value: 15 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
