import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useWorkers } from '../hooks/useWorkers';
import BottomNav from '../components/BottomNav';

const CATEGORIES = ['plumbing', 'electrical', 'hvac', 'painting', 'carpentry', 'roofing', 'flooring', 'appliance'];

const WorkerDirectoryPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const { data, isLoading } = useWorkers(selectedCategory || undefined);

    const workers = data?.workers || [];

    // Client-side search filter
    const filtered = workers.filter((w: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            w.name?.toLowerCase().includes(q) ||
            (w.skills || []).some((s: string) => s.toLowerCase().includes(q))
        );
    });

    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 130, // Estimated worker card height
        overscan: 5
    });

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate(-1)} className="text-text-main-light dark:text-text-main-dark">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                        {t('workerDirectory.title')}
                    </h1>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('workerDirectory.search')}
                        className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                {/* Category Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setSelectedCategory('')}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark'
                            }`}
                    >
                        {t('workerDirectory.all')}
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark'
                                }`}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 px-6 pt-2" ref={parentRef} style={{ overflowY: 'auto' }}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">person_search</span>
                        <p className="text-text-sub-light dark:text-text-sub-dark text-sm">{t('workerDirectory.noResults')}</p>
                    </div>
                ) : (
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((virtualRow: any) => {
                            const worker = filtered[virtualRow.index];
                            return (
                                <div
                                    key={worker.id}
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
                                    <button
                                        onClick={() => navigate(`/match?category=${selectedCategory}`)}
                                        className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-left w-full hover:shadow-md transition-all h-full"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                                                {worker.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-bold text-text-main-light dark:text-text-main-dark">{worker.name}</h3>
                                                    {worker.rating > 0 && (
                                                        <span className="flex items-center gap-0.5 text-sm text-yellow-600">
                                                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                            {Number(worker.rating).toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(worker.skills || []).slice(0, 3).map((skill: string) => (
                                                        <span key={skill} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                                {worker.available ? (
                                                    <span className="text-xs text-green-600 dark:text-green-400 mt-1 inline-block">{t('workerDirectory.availableNow')}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 mt-1 inline-block">{t('workerDirectory.busy')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default WorkerDirectoryPage;
