

export function CircularGauge({ percent, label }: { percent: number; label: string }) {
    const r = 50;
    const c = 2 * Math.PI * r;
    const offset = c - (percent / 100) * c;
    const color = percent > 80 ? '#ef4444' : percent > 60 ? '#f59e0b' : '#22c55e';

    return (
        <svg width="140" height="140" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
                cx="60" cy="60" r={r} fill="none"
                stroke={color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="60" y="56" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{percent}%</text>
            <text x="60" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">{label}</text>
        </svg>
    );
}

export function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">{value.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}
