import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { getOperatingStageCopies } from '../constants/operatingModel';

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 2000, startOnVisible = true) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        if (!startOnVisible || !ref.current) return;
        if (typeof IntersectionObserver === 'undefined') {
            setCount(target);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const tick = (now: number) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.round(eased * target));
                        if (progress < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration, startOnVisible]);

    return { count, ref };
}

/* ─── Scroll Reveal Hook ─── */
function useReveal() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        if (typeof IntersectionObserver === 'undefined') {
            ref.current.classList.add('visible');
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return ref;
}

/* ─── Feature Data (icon + gradient only, text from i18n) ─── */
const STAGE_GRADIENTS = [
    'from-violet-500 to-purple-600',
    'from-cyan-500 to-teal-600',
    'from-emerald-500 to-green-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
];

const TECH_STACK = [
    { name: 'React 19', icon: '⚛️' },
    { name: 'TypeScript', icon: '🔷' },
    { name: 'Node.js', icon: '🟢' },
    { name: 'Gemini AI', icon: '🤖' },
    { name: 'PostgreSQL', icon: '🐘' },
    { name: 'Redis', icon: '🔴' },
    { name: 'Stripe', icon: '💳' },
    { name: 'Docker', icon: '🐳' },
    { name: 'Sentry', icon: '🔍' },
    { name: 'Mixpanel', icon: '📊' },
    { name: 'Vite', icon: '⚡' },
    { name: 'TailwindCSS', icon: '🎨' },
];

const STATS_CONFIG = [
    { value: 200, suffix: '+', key: 'stat1Label' },
    { value: 9.5, suffix: '/10', key: 'stat2Label', decimals: 1 },
    { value: 10, suffix: '+', key: 'stat3Label' },
    { value: 29, suffix: '', key: 'stat4Label' },
];

const DEMO_ROUTES = [
    { path: '/', key: 'dashboard' },
    { path: '/welcome', key: 'welcome' },
    { path: '/login', key: 'login' },
    { path: '/diagnosis', key: 'diagnosis' },
    { path: '/worker/dashboard', key: 'workerPortal' },
    { path: '/worker/register', key: 'registration' },
    { path: '/community', key: 'community' },
    { path: '/calendar', key: 'calendar' },
    { path: '/enterprise', key: 'enterprise' },
];

/* ═══════════════════════════════════════════
    SHOWCASE PAGE
   ═══════════════════════════════════════════ */
const ShowcasePage = () => {
    const { t, locale } = useLanguage();
    const [iframeRoute, setIframeRoute] = useState('/');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const operatingStages = getOperatingStageCopies(locale === 'zh' ? 'zh' : 'en');

    const featuresReveal = useReveal();
    const demoReveal = useReveal();
    const techReveal = useReveal();
    const statsReveal = useReveal();
    const ctaReveal = useReveal();

    const handleDemoRoute = useCallback((route: string) => {
        setIframeRoute(route);
    }, []);

    return (
        <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] overflow-x-hidden font-sans">
            {/* Language toggle — fixed top-right */}
            <div className="fixed top-5 right-5 z-50">
                <LanguageToggle />
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 1: HERO
               ═══════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
                {/* Background blobs (Lightened for Apple palette) */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#0071e3]/5 morph-blob opacity-60" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#5e5ce6]/5 morph-blob-fast opacity-60" />
                <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-[#af52de]/3 morph-blob opacity-60" style={{ animationDelay: '-4s' }} />

                {/* Precise light grid overlay */}
                <div className="absolute inset-0 opacity-[0.4]" style={{
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />

                {/* Content */}
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full apple-glass bg-white/40 ring-1 ring-black/5 mb-8 page-enter backdrop-blur-3xl shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#28cd41] animate-pulse" />
                        <span className="text-[10px] font-black text-[#1d1d1f]/60 tracking-widest uppercase">{t('showcase.badge')}</span>
                    </div>

                    {/* Title — high contrast slate */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tighter mb-8 font-display text-[#1d1d1f]">
                         {t('showcase.heroTitle').split(' ').map((word, i) => (
                             <span key={i} className="inline-block stagger-item" style={{ animationDelay: `${i * 100}ms` }}>{word}&nbsp;</span>
                         ))}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xl sm:text-2xl text-[#86868b] max-w-2xl mx-auto mb-12 font-medium leading-relaxed page-enter" style={{ animationDelay: '600ms' }}>
                        {t('showcase.heroSubtitle')}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 page-enter" style={{ animationDelay: '950ms' }}>
                        <Link
                            to="/welcome"
                            className="relative inline-flex items-center gap-3 px-10 py-5 rounded-[22px] bg-[#1d1d1f] text-white font-black text-lg shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:bg-black hover:shadow-[0_25px_50px_rgba(0,0,0,0.15)] transition-all active:scale-[0.97] press-scale"
                        >
                            {t('showcase.ctaTryDemo')}
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                        <a
                            href="https://github.com/Mark393295827/house-maint-ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-10 py-5 rounded-[22px] apple-glass bg-white/40 ring-1 ring-black/5 text-[#1d1d1f] font-black tracking-tight hover:bg-white/60 transition-all shadow-sm active:scale-[0.97]"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                            {t('showcase.ctaGithub')}
                        </a>
                    </div>
                </div>

                {/* Scroll hint — refined for light theme */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
                    <span className="text-[10px] font-black tracking-widest uppercase text-[#1d1d1f]">{t('showcase.scrollHint')}</span>
                    <div className="w-[1px] h-10 bg-gradient-to-b from-[#1d1d1f] to-transparent animate-pulse" />
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 2: FEATURES
               ═══════════════════════════════════════════ */}
            <section ref={featuresReveal} className="reveal py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <span className="text-[11px] font-black tracking-[0.25em] uppercase text-[#0071e3] mb-6 block stagger-item">{t('showcase.featuresLabel')}</span>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-[#1d1d1f] mb-8 stagger-item">
                            {t('showcase.featuresTitle')}{' '}
                            <span className="text-[#86868b]">{t('showcase.featuresTitleHighlight')}</span>
                        </h2>
                    </div>

                    <div className="mb-8 text-center">
                        <span className="inline-flex items-center rounded-full bg-[#1d1d1f] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                            {locale === 'zh' ? '运营闭环' : 'Operating loop'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {operatingStages.map((stage, i) => (
                            <div
                                key={stage.id}
                                className="aegis-card group p-10 bg-white/60 hover:bg-white transition-all duration-700 stagger-item border-none"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${STAGE_GRADIENTS[i]} flex items-center justify-center shadow-xl shadow-black/5 mb-8 transform group-hover:-translate-y-1 transition-transform`}
                                >
                                    <span className="material-symbols-outlined text-white text-[28px]">
                                        {stage.icon}
                                    </span>
                                </div>
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b]">{i + 1}/6</span>
                                    <span className="h-px flex-1 bg-black/5" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0071e3]">{stage.metric}</span>
                                </div>
                                <h3 className="text-xl font-black mb-4 text-[#1d1d1f] tracking-tight">{stage.title}</h3>
                                <p className="text-[15px] text-[#86868b] font-medium leading-relaxed">{stage.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 3: LIVE DEMO
               ═══════════════════════════════════════════ */}
            <section ref={demoReveal} className="reveal py-32 px-6 bg-[#f5f5f7]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <span className="text-[11px] font-black tracking-[0.25em] uppercase text-[#5e5ce6] mb-6 block">{t('showcase.demoLabel')}</span>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-[#1d1d1f]">
                            {t('showcase.demoTitle')} <span className="text-[#86868b]">{t('showcase.demoTitleHighlight')}</span>
                        </h2>
                    </div>

                    {/* Apple-style Route Chips */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-16 max-w-4xl mx-auto">
                        {DEMO_ROUTES.map(route => (
                            <button
                                key={route.path}
                                onClick={() => handleDemoRoute(route.path)}
                                className={`px-6 py-3 rounded-full text-[13px] font-black transition-all duration-300 ${iframeRoute === route.path
                                        ? 'bg-[#1d1d1f] text-white shadow-xl shadow-black/10'
                                        : 'bg-white/40 text-[#1d1d1f]/60 border border-black/5 hover:bg-white/80 hover:text-[#1d1d1f]'
                                    }`}
                            >
                                {t(`showcase.demoRoutes.${route.key}`)}
                            </button>
                        ))}
                    </div>

                    {/* Precision Device Preview */}
                    <div className="flex justify-center">
                        <div className="relative group perspective-1000">
                            {/* Ambient Glow */}
                            <div className="absolute inset-x-0 -bottom-20 bg-gradient-to-t from-black/5 to-transparent h-60 blur-3xl rounded-[100px] opacity-60" />

                            {/* Apple Device Frame */}
                            <div className="relative bg-[#000] rounded-[52px] p-[10px] shadow-[0_50px_100px_rgba(0,0,0,0.12)] ring-1 ring-black/10 transform transition-transform duration-1000">
                                {/* Dynamic Island */}
                                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[110px] h-[34px] bg-black rounded-[20px] z-20 flex items-center justify-center gap-1.5 px-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#1d1d1f] shadow-inner" />
                                    <div className="flex-1" />
                                    <div className="w-4 h-4 rounded-full bg-[#1d1d1f] shadow-inner opacity-20" />
                                </div>

                                {/* Precision Screen */}
                                <div className="w-[375px] h-[780px] sm:w-[393px] sm:h-[820px] rounded-[44px] overflow-hidden bg-white relative">
                                    {/* Glass Overlay on Iframe (Optional) */}
                                    <div className="absolute inset-0 pointer-events-none rounded-[44px] ring-1 ring-inset ring-white/10 z-10" />
                                    
                                    <iframe
                                        ref={iframeRef}
                                        src={`${window.location.host === 'localhost:5173' ? 'http://localhost:5173' : window.location.origin}${iframeRoute}`}
                                        title="Live Demo"
                                        className="w-full h-full border-none"
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                    />
                                </div>

                                {/* Bottom Indicator */}
                                <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 w-[120px] h-1 bg-white/20 rounded-full z-20" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 4: TECH STACK
               ═══════════════════════════════════════════ */}
            <section ref={techReveal} className="reveal py-32 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-[11px] font-black tracking-[0.25em] uppercase text-[#ff9500] mb-6 block">{t('showcase.techLabel')}</span>
                        <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-[#1d1d1f]">
                            {t('showcase.techTitle')} <span className="text-[#86868b]">{t('showcase.techTitleHighlight')}</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
                        {TECH_STACK.map((tech, i) => (
                            <div
                                key={i}
                                className="aegis-card flex flex-col items-center gap-4 p-8 bg-[#fbfbfd] hover:bg-white transition-all duration-500 hover:shadow-xl hover:shadow-black/5 transform hover:-translate-y-1 stagger-item"
                            >
                                <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{tech.icon}</span>
                                <span className="text-[11px] font-black text-[#86868b] uppercase tracking-widest">{tech.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 5: STATS
               ═══════════════════════════════════════════ */}
            <section ref={statsReveal} className="reveal py-32 px-6 bg-[#1d1d1f]">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 lg:gap-20">
                        {STATS_CONFIG.map((stat, i) => (
                            <div key={i} className="text-center group stagger-item">
                                <div className="flex justify-center items-baseline gap-1 mb-4">
                                     <StatValue value={stat.value} decimals={stat.decimals} />
                                     <span className="text-2xl font-black text-white/40">{stat.suffix}</span>
                                </div>
                                <p className="text-[11px] font-black text-white/60 uppercase tracking-[0.25em]">{t(`showcase.${stat.key}`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 6: CTA FOOTER
               ═══════════════════════════════════════════ */}
            <section ref={ctaReveal} className="reveal py-40 px-6 relative overflow-hidden flex flex-col items-center text-center">
                {/* Visual Finish */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#0071e3]/20 to-transparent" />
                <div className="absolute -bottom-[20%] w-[1200px] h-[600px] bg-[#0071e3]/5 rounded-[100%] blur-[120px]" />

                <div className="relative z-10 max-w-4xl mx-auto">
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-[#1d1d1f] mb-8 leading-[1.05]">
                        {t('showcase.ctaTitle')} <br/>
                        <span className="text-[#0071e3]">{t('showcase.ctaTitleHighlight')}</span>
                    </h2>
                    <p className="text-xl sm:text-2xl text-[#86868b] mb-16 max-w-2xl mx-auto font-medium">
                        {t('showcase.ctaSubtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                        <Link
                            to="/welcome"
                            className="inline-flex items-center gap-3 px-10 py-5 rounded-[22px] bg-[#0071e3] text-white font-black text-lg shadow-[0_20px_40px_rgba(0,113,227,0.2)] hover:bg-[#0077ed] hover:shadow-[0_25px_50px_rgba(0,113,227,0.3)] transition-all transform active:scale-[0.97]"
                        >
                            <span className="material-symbols-outlined font-black">play_arrow</span>
                            {t('showcase.ctaLaunch')}
                        </Link>
                        <Link
                            to="/preview"
                            className="inline-flex items-center gap-3 px-10 py-5 rounded-[22px] bg-[#1d1d1f] text-white font-black text-lg hover:bg-black transition-all transform active:scale-[0.97]"
                        >
                            <span className="material-symbols-outlined font-light">devices</span>
                            {t('showcase.ctaPreview')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Global Footer */}
            <footer className="py-12 px-8 border-t border-black/5 bg-white/40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[12px] bg-[#1d1d1f] flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-[20px]">home</span>
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-[#1d1d1f]">House Maint AI</p>
                            <p className="text-[11px] font-black text-[#86868b] uppercase tracking-widest">{t('showcase.footer')}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-10">
                        {['dashboard', 'welcome', 'community'].map(key => (
                            <Link 
                                key={key} 
                                to={DEMO_ROUTES.find(r => r.key === key)?.path || '/'} 
                                className="text-[12px] font-black text-[#86868b] hover:text-[#1d1d1f] uppercase tracking-widest transition-colors"
                            >
                                {t(`showcase.demoRoutes.${key}`)}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

/* ─── Helper Stat Component ─── */
const StatValue = ({ value, decimals }: { value: number; decimals?: number }) => {
    const counter = useCountUp(decimals ? value * 10 : value);
    return (
        <span ref={counter.ref} className="text-6xl md:text-7xl font-black text-white tracking-tighter tabular-nums stagger-item">
            {decimals ? (counter.count / 10).toFixed(1) : counter.count}
        </span>
    );
};

export default ShowcasePage;
