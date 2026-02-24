import React from 'react';

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
    <div className="space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        ))}
    </div>
);

export const LoadingDots: React.FC = () => (
    <div className="flex gap-1 items-center justify-center py-4">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
    </div>
);

export const InfoChip: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-gray-600 dark:text-gray-300' }) => (
    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
        <p className={`text-xs font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
);
