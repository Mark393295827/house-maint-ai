

export function LiveBadge({ styles }: { styles: any }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <span style={styles.liveDot} />
            <span className="text-green-400 text-xs font-semibold tracking-wider">LIVE</span>
        </div>
    );
}

export function GlassCard({ accent, icon, label, value, styles }: { accent: string; icon: string; label: string; value: string; styles: any }) {
    return (
        <div style={{ ...styles.glassCard, borderLeft: `3px solid ${accent}` }} className="p-5 group hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium">{label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                </div>
                <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>
            </div>
        </div>
    );
}
