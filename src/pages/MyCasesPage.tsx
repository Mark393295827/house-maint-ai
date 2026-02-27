import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import BottomNav from '../components/BottomNav';
import { getCases, type CaseRecord } from '../store/cases';

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; label: string; labelZh: string }> = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Critical', labelZh: '严重' },
    moderate: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Moderate', labelZh: '中度' },
    low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: 'Low', labelZh: '轻微' },
};

/* Icon lookup by category */
const catIcon = (c: CaseRecord) => {
    const map: Record<string, string> = { plumbing: 'plumbing', hvac: 'ac_unit', structural: 'foundation', electrical: 'bolt' };
    return map[(c.category || '').toLowerCase()] || 'build';
};

const MyCasesPage = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'active' | 'archived'>('active');
    const [search, setSearch] = useState('');

    const allCases = getCases();
    const filtered = allCases.filter(c =>
        c.status === tab &&
        (search === '' ||
            c.title.includes(search) ||
            c.titleEn.toLowerCase().includes(search.toLowerCase()))
    );

    const zh = locale === 'zh';

    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 120, // Estimated card height
        overscan: 5
    });

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] shadow-2xl">
            {/* Header */}
            <div className="px-5 pt-6 pb-3">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-extrabold text-text-main-light dark:text-text-main-dark font-display">
                        📋 {zh ? '我的案例' : 'My Cases'}
                    </h1>
                    <button
                        onClick={() => navigate('/diagnosis')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-transform"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        {zh ? '新建' : 'New'}
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={zh ? '搜索案例...' : 'Search cases...'}
                        className="w-full h-10 pl-9 pr-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {(['active', 'archived'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 h-9 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                        >
                            {t === 'active' ? (zh ? '进行中' : 'Active') : (zh ? '已完成' : 'Archived')}
                            <span className="ml-1 text-xs opacity-70">
                                ({allCases.filter(c => c.status === t).length})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Case list */}
            <div className="px-5" ref={parentRef} style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                        <span className="material-symbols-outlined text-5xl">folder_open</span>
                        <p className="text-sm">{zh ? '暂无案例' : 'No cases yet'}</p>
                        <button onClick={() => navigate('/diagnosis')} className="mt-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                            {zh ? '新建诊断' : 'Start Diagnosis'}
                        </button>
                    </div>
                ) : (
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((virtualRow: any) => {
                            const c = filtered[virtualRow.index];
                            const sev = SEVERITY_CONFIG[c.severity] || SEVERITY_CONFIG.moderate;
                            const totalSteps = 8;
                            const pct = Math.round((c.step / totalSteps) * 100);
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        paddingBottom: '12px'
                                    }}
                                >
                                    <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-transform cursor-pointer h-full">
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${sev.bg}`}>
                                                <span className={`material-symbols-outlined ${sev.text}`} style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}>{catIcon(c)}</span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-bold text-sm text-text-main-light dark:text-text-main-dark truncate">
                                                        {zh ? c.title : c.titleEn}
                                                    </p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${sev.bg} ${sev.text}`}>
                                                        {zh ? sev.labelZh : sev.label}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-gray-400">{c.category || ''}</span>
                                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                                    <span className="text-[10px] text-gray-400">{c.date}</span>
                                                </div>

                                                {/* Progress bar */}
                                                {c.status === 'active' && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-medium text-primary">
                                                                Step {c.step}/{totalSteps}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{pct}%</span>
                                                        </div>
                                                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Root cause (archived) */}
                                                {c.status === 'archived' && c.rootCause && (
                                                    <div className="mt-2 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-emerald-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pin_drop</span>
                                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                            {zh ? `根因: ${c.rootCause}` : `Root cause: ${c.rootCause}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default MyCasesPage;
