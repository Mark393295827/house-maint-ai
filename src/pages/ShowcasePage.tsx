import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 2000, startOnVisible = true) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        if (!startOnVisible || !ref.current) return;
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

/* ─── Typewriter Hook (English) ─── */
function useTypewriter(text: string, speed = 60) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        setDisplayed('');
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) {
                setDone(true);
                clearInterval(interval);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return { displayed, done };
}

/* ─── Brush Reveal Hook (Chinese) ─── */
function useBrushReveal(delay = 300) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return visible;
}

/* ─── Feature Data (icon + gradient only, text from i18n) ─── */
const FEATURE_ICONS = [
    { icon: 'auto_fix_high', gradient: 'from-violet-500 to-purple-600', glow: 'rgba(139, 92, 246, 0.15)' },
    { icon: 'engineering', gradient: 'from-cyan-500 to-teal-600', glow: 'rgba(6, 182, 212, 0.15)' },
    { icon: 'forum', gradient: 'from-amber-500 to-orange-600', glow: 'rgba(245, 158, 11, 0.15)' },
    { icon: 'shield_with_heart', gradient: 'from-emerald-500 to-green-600', glow: 'rgba(16, 185, 129, 0.15)' },
    { icon: 'monitoring', gradient: 'from-rose-500 to-pink-600', glow: 'rgba(244, 63, 94, 0.15)' },
    { icon: 'payments', gradient: 'from-indigo-500 to-blue-600', glow: 'rgba(99, 102, 241, 0.15)' },
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
    { path: '/community', key: 'community' },
    { path: '/calendar', key: 'calendar' },
];

/* ─── Individual Stat Card ─── */
const StatCard = ({ value, suffix, label, decimals }: { value: number; suffix: string; label: string; decimals?: number }) => {
    const counter = useCountUp(decimals ? value * 10 : value);
    return (
        <div ref={counter.ref} className="text-center p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-4xl sm:text-5xl font-extrabold gradient-text mb-2 font-display">
                {decimals ? (counter.count / 10).toFixed(1) : counter.count}{suffix}
            </div>
            <div className="text-sm text-white/40 font-medium">{label}</div>
        </div>
    );
};

/* ─── Hero Title Component (language-specific animation) ─── */
const HeroTitle = ({ text, locale }: { text: string; locale: string }) => {
    const typewriter = useTypewriter(text, 50);
    const brushVisible = useBrushReveal(200);

    if (locale === 'zh') {
        // Chinese: Brush-stroke fade-in with scale
        return (
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.15] tracking-tight mb-6 font-display">
                <span
                    className="text-shimmer inline-block transition-all duration-1000 ease-out"
                    style={{
                        opacity: brushVisible ? 1 : 0,
                        transform: brushVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                        filter: brushVisible ? 'blur(0)' : 'blur(8px)',
                    }}
                >
                    {text}
                </span>
            </h1>
        );
    }

    // English: Typewriter character-by-character reveal
    return (
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 font-display" style={{ minHeight: '1.2em' }}>
            <span className="text-shimmer">{typewriter.displayed}</span>
            {!typewriter.done && <span className="typewriter-cursor" />}
        </h1>
    );
};

/* ═══════════════════════════════════════════
    SHOWCASE PAGE
   ═══════════════════════════════════════════ */
const ShowcasePage = () => {
    const { t, locale } = useLanguage();
    const [iframeRoute, setIframeRoute] = useState('/');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Scroll reveal refs for each section
    const featuresReveal = useReveal();
    const demoReveal = useReveal();
    const techReveal = useReveal();
    const statsReveal = useReveal();
    const ctaReveal = useReveal();

    const handleDemoRoute = useCallback((route: string) => {
        setIframeRoute(route);
    }, []);

    return (
        <div className="min-h-screen bg-[#060611] text-white overflow-x-hidden font-sans">
            {/* Language toggle — fixed top-right */}
            <div className="fixed top-5 right-5 z-50">
                <LanguageToggle />
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 1: HERO
               ═══════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
                {/* Background blobs */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#6366f1]/15 morph-blob" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#06b6d4]/12 morph-blob-fast" />
                <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-[#a78bfa]/8 morph-blob" style={{ animationDelay: '-4s' }} />

                {/* Faint grid overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />

                {/* Content */}
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 page-enter backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-medium text-white/70 tracking-wider uppercase">{t('showcase.badge')}</span>
                    </div>

                    {/* Title — language-specific animation */}
                    <HeroTitle text={t('showcase.heroTitle')} locale={locale} />

                    {/* Subtitle */}
                    <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 page-enter" style={{ animationDelay: '600ms' }}>
                        {t('showcase.heroSubtitle')}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 page-enter" style={{ animationDelay: '900ms' }}>
                        <Link
                            to="/welcome"
                            className="relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl btn-gradient font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all active:scale-[0.97] pulse-ring"
                        >
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                            {t('showcase.ctaTryDemo')}
                        </Link>
                        <a
                            href="https://github.com/Mark393295827/house-maint-ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white font-semibold transition-all active:scale-[0.97]"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                            {t('showcase.ctaGithub')}
                        </a>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
                    <span className="text-xs tracking-widest uppercase">{t('showcase.scrollHint')}</span>
                    <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center pt-1">
                        <div className="w-1 h-2 rounded-full bg-white/60 animate-bounce" />
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 2: FEATURES
               ═══════════════════════════════════════════ */}
            <section ref={featuresReveal} className="reveal relative py-24 sm:py-32 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary/80 mb-4 block">{t('showcase.featuresLabel')}</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display">
                            {t('showcase.featuresTitle')}{' '}
                            <span className="gradient-text">{t('showcase.featuresTitleHighlight')}</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURE_ICONS.map((feature, i) => (
                            <div
                                key={i}
                                className="gradient-border card-3d p-6 backdrop-blur-sm hover:bg-white/[0.03] transition-colors stagger-item"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg mb-4`}
                                    style={{ boxShadow: `0 8px 24px ${feature.glow}` }}
                                >
                                    <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {feature.icon}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-white/90">{t(`showcase.feature${i + 1}Title`)}</h3>
                                <p className="text-sm text-white/45 leading-relaxed">{t(`showcase.feature${i + 1}Desc`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 3: LIVE DEMO
               ═══════════════════════════════════════════ */}
            <section ref={demoReveal} className="reveal relative py-24 sm:py-32 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-accent/80 mb-4 block">{t('showcase.demoLabel')}</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display">
                            {t('showcase.demoTitle')} <span className="gradient-text">{t('showcase.demoTitleHighlight')}</span>
                        </h2>
                    </div>

                    {/* Route chips */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                        {DEMO_ROUTES.map(route => (
                            <button
                                key={route.path}
                                onClick={() => handleDemoRoute(route.path)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${iframeRoute === route.path
                                        ? 'bg-primary/20 text-primary-light border border-primary/30'
                                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
                                    }`}
                            >
                                {t(`showcase.demoRoutes.${route.key}`)}
                            </button>
                        ))}
                    </div>

                    {/* Phone frame */}
                    <div className="flex justify-center">
                        <div className="relative" style={{ transform: 'perspective(1200px) rotateY(-2deg) rotateX(1deg)' }}>
                            {/* Glow behind */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-[50px] blur-3xl scale-105 opacity-60" />

                            {/* Device frame */}
                            <div className="relative bg-[#1c1c1e] rounded-[46px] p-[14px] shadow-2xl"
                                style={{ boxShadow: '0 0 0 2px #2c2c2e, 0 0 0 4px #1c1c1e, 0 40px 80px rgba(0,0,0,0.5), 0 0 120px rgba(99,102,241,0.08)' }}
                            >
                                {/* Dynamic Island */}
                                <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-[20px] z-10">
                                    <div className="absolute right-[14px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-gradient-to-br from-[#1a3a2a] to-[#0a1a12]" style={{ boxShadow: 'inset 0 0 2px rgba(52,199,89,0.3)' }} />
                                </div>

                                {/* Screen */}
                                <div className="w-[393px] h-[750px] rounded-[34px] overflow-hidden bg-black">
                                    <iframe
                                        ref={iframeRef}
                                        src={`${window.location.origin}${iframeRoute}`}
                                        title="Live Demo"
                                        className="w-full h-full border-none bg-white"
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                    />
                                </div>

                                {/* Home bar */}
                                <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/30 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 4: TECH STACK
               ═══════════════════════════════════════════ */}
            <section ref={techReveal} className="reveal relative py-24 sm:py-32 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-amber-400/80 mb-4 block">{t('showcase.techLabel')}</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display">
                            {t('showcase.techTitle')} <span className="gradient-text">{t('showcase.techTitleHighlight')}</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {TECH_STACK.map((tech, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group cursor-default"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">{tech.icon}</span>
                                <span className="text-xs font-semibold text-white/60 group-hover:text-white/80 transition-colors text-center">{tech.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 5: STATS
               ═══════════════════════════════════════════ */}
            <section ref={statsReveal} className="reveal relative py-24 sm:py-32 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {STATS_CONFIG.map((stat, i) => (
                            <StatCard
                                key={i}
                                value={stat.value}
                                suffix={stat.suffix}
                                label={t(`showcase.${stat.key}`)}
                                decimals={stat.decimals}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 6: CTA FOOTER
               ═══════════════════════════════════════════ */}
            <section ref={ctaReveal} className="reveal relative py-24 sm:py-32 px-6 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />

                <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6 font-display">
                        {t('showcase.ctaTitle')} <span className="text-shimmer">{t('showcase.ctaTitleHighlight')}</span>
                    </h2>
                    <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
                        {t('showcase.ctaSubtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/welcome"
                            className="relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl btn-gradient font-bold text-lg shadow-xl shadow-primary/30 transition-all active:scale-[0.97]"
                        >
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            {t('showcase.ctaLaunch')}
                        </Link>
                        <Link
                            to="/preview"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white font-semibold transition-all"
                        >
                            <span className="material-symbols-outlined text-xl">devices</span>
                            {t('showcase.ctaPreview')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-8 px-6 border-t border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-white/30 text-sm">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                        </div>
                        <span className="font-semibold">House Maint AI</span>
                        <span className="text-white/20">•</span>
                        <span>{t('showcase.footer')}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-white/25">
                        <Link to="/" className="hover:text-white/50 transition-colors">{t('showcase.demoRoutes.dashboard')}</Link>
                        <Link to="/welcome" className="hover:text-white/50 transition-colors">{t('showcase.demoRoutes.welcome')}</Link>
                        <Link to="/preview" className="hover:text-white/50 transition-colors">{t('showcase.ctaPreview')}</Link>
                        <a href="https://github.com/Mark393295827/house-maint-ai" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">GitHub</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ShowcasePage;
