import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import BottomNav from '../components/BottomNav';

const CATEGORIES = [
    { id: 'all', icon: 'apps', labelZh: '全部', labelEn: 'All', color: 'from-gray-500 to-gray-600' },
    { id: 'plumbing', icon: 'plumbing', labelZh: '管道', labelEn: 'Plumbing', color: 'from-blue-500 to-cyan-500' },
    { id: 'electrical', icon: 'bolt', labelZh: '电气', labelEn: 'Electrical', color: 'from-amber-500 to-orange-500' },
    { id: 'hvac', icon: 'ac_unit', labelZh: '暖通', labelEn: 'HVAC', color: 'from-violet-500 to-purple-500' },
    { id: 'structural', icon: 'foundation', labelZh: '结构', labelEn: 'Structural', color: 'from-rose-500 to-pink-500' },
    { id: 'appliance', icon: 'kitchen', labelZh: '家电', labelEn: 'Appliances', color: 'from-teal-500 to-emerald-500' },
];

const LIBRARY_CASES = [
    {
        id: 'l001', category: 'plumbing',
        titleZh: '厨房水槽漏水', titleEn: 'Kitchen Sink Leak',
        rootCauseZh: '排水管密封圈老化', rootCauseEn: 'Drain pipe seal ring degraded',
        solutionZh: '更换密封圈，涂抹防水胶', solutionEn: 'Replace seal ring, apply waterproof adhesive',
        cost: '¥50–100', time: '2h', difficulty: 'easy', views: 312, saves: 47,
        severity: 'moderate', tags: ['DIY', '管道']
    },
    {
        id: 'l002', category: 'electrical',
        titleZh: '开关频繁跳闸', titleEn: 'Circuit Breaker Keeps Tripping',
        rootCauseZh: '支路过载，功率超限', rootCauseEn: 'Branch circuit overloaded, exceeds rated power',
        solutionZh: '均衡用电负载，考虑增加回路', solutionEn: 'Balance electrical load, consider adding circuit',
        cost: '¥200–800', time: '4h', difficulty: 'hard', views: 528, saves: 89,
        severity: 'critical', tags: ['专业', '安全']
    },
    {
        id: 'l003', category: 'hvac',
        titleZh: '空调制冷效果差', titleEn: 'Poor AC Cooling Performance',
        rootCauseZh: '滤网积尘堵塞，制冷剂不足', rootCauseEn: 'Clogged air filter, low refrigerant',
        solutionZh: '清洗滤网，检测补充制冷剂', solutionEn: 'Clean filter, check and refill refrigerant',
        cost: '¥100–400', time: '3h', difficulty: 'medium', views: 741, saves: 132,
        severity: 'moderate', tags: ['DIY', '夏季']
    },
    {
        id: 'l004', category: 'structural',
        titleZh: '瓷砖空鼓脱落', titleEn: 'Hollow Tile Detachment',
        rootCauseZh: '粘接层失效，基层潮湿', rootCauseEn: 'Adhesive layer failed, substrate moisture',
        solutionZh: '注浆加固或重铺', solutionEn: 'Grout injection or re-tile',
        cost: '¥300–1200', time: '8h', difficulty: 'hard', views: 198, saves: 31,
        severity: 'moderate', tags: ['浴室', '结构']
    },
    {
        id: 'l005', category: 'appliance',
        titleZh: '洗碗机不排水', titleEn: 'Dishwasher Not Draining',
        rootCauseZh: '排水管弯折或过滤网堵塞', rootCauseEn: 'Drain hose kinked or filter blocked',
        solutionZh: '疏通过滤网，检查排水管走向', solutionEn: 'Clear filter, check drain hose routing',
        cost: '¥0–50', time: '1h', difficulty: 'easy', views: 445, saves: 76,
        severity: 'low', tags: ['DIY', '家电']
    },
    {
        id: 'l006', category: 'plumbing',
        titleZh: '马桶持续漏水', titleEn: 'Toilet Keeps Running',
        rootCauseZh: '浮球阀或进水阀故障', rootCauseEn: 'Float valve or fill valve malfunction',
        solutionZh: '更换进水阀组件', solutionEn: 'Replace fill valve assembly',
        cost: '¥30–80', time: '1h', difficulty: 'easy', views: 623, saves: 98,
        severity: 'low', tags: ['DIY', '节水']
    },
];

const DIFFICULTY_CONFIG: Record<string, { label: string; labelZh: string; color: string }> = {
    easy: { label: 'Easy', labelZh: '简单', color: 'text-emerald-600' },
    medium: { label: 'Medium', labelZh: '中等', color: 'text-amber-600' },
    hard: { label: 'Hard', labelZh: '较难', color: 'text-red-600' },
};

const CaseLibraryPage = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const [activeCat, setActiveCat] = useState('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'views' | 'saves'>('views');

    const zh = locale === 'zh';

    const filtered = LIBRARY_CASES
        .filter(c =>
            (activeCat === 'all' || c.category === activeCat) &&
            (search === '' ||
                c.titleZh.includes(search) ||
                c.titleEn.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => b[sort] - a[sort]);

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] shadow-2xl">
            {/* Header */}
            <div className="px-5 pt-6 pb-3">
                <h1 className="text-xl font-extrabold text-text-main-light dark:text-text-main-dark font-display mb-1">
                    📚 {zh ? '案例库' : 'Case Library'}
                </h1>
                <p className="text-sm text-gray-500 mb-4">{zh ? '社区共享的维修知识库' : 'Community-shared repair knowledge base'}</p>

                {/* Search */}
                <div className="relative mb-3">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={zh ? '搜索案例库...' : 'Search library...'}
                        className="w-full h-10 pl-9 pr-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            </div>

            {/* Category filter — horizontal scroll */}
            <div className="flex gap-2 px-5 overflow-x-auto pb-3 scrollbar-none">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCat(cat.id)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeCat === cat.id ? 'text-white shadow-md' : 'bg-white dark:bg-surface-dark text-gray-500 border border-gray-200 dark:border-gray-700'}`}
                        style={activeCat === cat.id ? { background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` } : {}}
                    >
                        {activeCat === cat.id ? (
                            <span
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r ${cat.color} text-white -m-3 -mx-3`}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                                {zh ? cat.labelZh : cat.labelEn}
                            </span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                                {zh ? cat.labelZh : cat.labelEn}
                            </>
                        )}
                    </button>
                ))}
            </div>

            {/* Sort */}
            <div className="flex items-center justify-between px-5 mb-3">
                <span className="text-xs text-gray-400">{filtered.length} {zh ? '个案例' : 'cases'}</span>
                <div className="flex gap-1">
                    {(['views', 'saves'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSort(s)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${sort === s ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                        >
                            {s === 'views' ? (zh ? '最热' : 'Popular') : (zh ? '最多收藏' : 'Most Saved')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cases */}
            <div className="px-5 space-y-3">
                {filtered.map(c => {
                    const diff = DIFFICULTY_CONFIG[c.difficulty];
                    return (
                        <div key={c.id} className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                            {/* Title + tags */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-bold text-sm text-text-main-light dark:text-text-main-dark leading-snug">
                                    {zh ? c.titleZh : c.titleEn}
                                </p>
                                <div className="flex gap-1 flex-shrink-0">
                                    {c.tags.slice(0, 1).map(tag => (
                                        <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Root cause */}
                            <div className="flex items-start gap-1.5 mb-2">
                                <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                                    <span className="font-medium">{zh ? '根因: ' : 'Root cause: '}</span>
                                    {zh ? c.rootCauseZh : c.rootCauseEn}
                                </p>
                            </div>

                            {/* Solution */}
                            <div className="flex items-start gap-1.5 mb-3">
                                <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                                    {zh ? c.solutionZh : c.solutionEn}
                                </p>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">payments</span>
                                    {c.cost}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">schedule</span>
                                    {c.time}
                                </span>
                                <span className={`font-bold ${diff.color}`}>{zh ? diff.labelZh : diff.label}</span>
                                <span className="ml-auto flex items-center gap-2">
                                    <span className="flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-xs">visibility</span>
                                        {c.views}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-xs">bookmark</span>
                                        {c.saves}
                                    </span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FAB: Start Diagnosis */}
            <button
                onClick={() => navigate('/diagnosis')}
                className="fixed bottom-24 right-5 w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-10"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
            >
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
            </button>

            <BottomNav />
        </div>
    );
};

export default CaseLibraryPage;
