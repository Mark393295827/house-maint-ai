

export function PipelineStage({ icon, phase, count, color }: { icon: string; phase: string; count: number; color: string }) {
    return (
        <div className="flex flex-col items-center p-4 rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <span className="text-3xl mb-2">{icon}</span>
            <span className="text-white font-bold text-xl">{count}</span>
            <span className="text-gray-400 text-sm mt-1">{phase}</span>
        </div>
    );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-center">
            <p className="text-gray-500 text-xs">{label}</p>
            <p className="text-white font-semibold">{value}</p>
        </div>
    );
}

export function HealthRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className="text-white font-mono text-sm">{value}</span>
        </div>
    );
}

export function AgentBar({ name, count, max }: { name: string; count: number; max: number }) {
    const pct = max > 0 ? (count / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-gray-300 text-sm w-32 truncate font-mono">{name}</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }}
                />
            </div>
            <span className="text-white text-sm font-semibold w-10 text-right">{count}</span>
        </div>
    );
}
