
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const quickResults = [
    { icon: 'plumbing', label: 'Leaking Pipe', labelZh: '漏水管道', path: '/diagnosis' },
    { icon: 'thermostat', label: 'AC Not Working', labelZh: '空调故障', path: '/diagnosis' },
    { icon: 'door_front', label: 'Door Hinge Fix', labelZh: '门铰链修理', path: '/repair' },
    { icon: 'roofing', label: 'Roof Inspection', labelZh: '屋顶检查', path: '/diagnosis' },
];

const SearchBar = () => {
    const { t, locale } = useLanguage();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = query.length > 0
        ? quickResults.filter(r =>
            (locale === 'zh' ? r.labelZh : r.label).toLowerCase().includes(query.toLowerCase())
        )
        : quickResults;

    const showDropdown = isFocused && query.length > 0;

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="px-5 py-3 relative" ref={wrapperRef}>
            <div className={`flex w-full items-center rounded-xl bg-white dark:bg-surface-dark shadow-sm border h-12 transition-all ${isFocused ? 'ring-2 ring-primary/30 border-primary/30' : 'border-gray-100 dark:border-gray-800'
                }`}>
                <div className="pl-4 pr-2 text-primary">
                    <span className="material-symbols-outlined text-[24px]">search</span>
                </div>
                <input
                    className="flex-1 bg-transparent border-none text-base text-text-main-light dark:text-text-main-dark placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 focus:ring-0 focus:outline-none h-full"
                    placeholder={t('search.placeholder')}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                />
                {query && (
                    <button onClick={() => setQuery('')} className="px-2 text-text-sub-light hover:text-text-main-light transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                )}
                <button className="pr-4 pl-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[24px]">mic</span>
                </button>
            </div>

            {/* Dropdown results */}
            {showDropdown && (
                <div className="absolute left-5 right-5 top-full mt-1 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 z-50 overflow-hidden page-enter">
                    {filtered.length > 0 ? filtered.map((item, i) => (
                        <button
                            key={i}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                            onClick={() => {
                                navigate(item.path);
                                setQuery('');
                                setIsFocused(false);
                            }}
                        >
                            <span className="material-symbols-outlined text-primary text-[20px]">{item.icon}</span>
                            <span className="text-sm font-medium">{locale === 'zh' ? item.labelZh : item.label}</span>
                        </button>
                    )) : (
                        <div className="px-4 py-3 text-sm text-text-sub-light dark:text-text-sub-dark text-center">
                            {locale === 'zh' ? '无结果' : 'No results found'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
