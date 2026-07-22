import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type ComponentProps,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { getOperatingStageCopies, type OperatingStageCopy } from '../constants/operatingModel';
import MeteorShower from '../components/MeteorShower';
import '../showcase-antigravity.css';

function useCountUp(target: number, duration = 2000, startOnVisible = true) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        if (!startOnVisible || !ref.current) return;
        if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setCount(target);
            return;
        }
        if (typeof IntersectionObserver === 'undefined') {
            setCount(target);
            return;
        }

        let frameId = 0;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting || started.current) return;

                started.current = true;
                const startTime = performance.now();
                const tick = (now: number) => {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.round(eased * target));
                    if (progress < 1) frameId = requestAnimationFrame(tick);
                };
                frameId = requestAnimationFrame(tick);
            },
            { threshold: 0.3 }
        );

        observer.observe(ref.current);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frameId);
        };
    }, [target, duration, startOnVisible]);

    return { count, ref };
}

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
                if (entry.isIntersecting) entry.target.classList.add('visible');
            },
            { threshold: 0.08 }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return ref;
}

const STAGE_ICONS: Record<OperatingStageCopy['id'], string> = {
    intake: 'chat_bubble',
    diagnosis: 'saved_search',
    deflection: 'library_books',
    dispatch: 'explore',
    verification: 'verified',
    reporting: 'monitoring',
};

const ReactLogo = () => (
    <svg viewBox="-11.5 -10.23174 23 20.46348" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
        <g stroke="#61dafb" strokeWidth="1" fill="none">
            <ellipse rx="11" ry="4.2"/>
            <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
            <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
        </g>
    </svg>
);

const TypeScriptLogo = () => (
    <svg viewBox="0 0 100 100" width="24" height="24">
        <rect width="100" height="100" fill="#3178c6" rx="10"/>
        <text x="52" y="80" fill="#ffffff" fontFamily="'Inter', sans-serif" fontSize="42" fontWeight="bold">TS</text>
    </svg>
);

const NodeLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#339933">
        <path d="M12 1L2 6.8v11.4L12 23l10-5.8V6.8L12 1zm8.3 16.3l-8.3 4.8-8.3-4.8V7.8l8.3-4.8 8.3 4.8v9.5z"/>
        <path d="M12 6.5l-5.2 3v6l5.2 3 5.2-3v-6l-5.2-3z"/>
    </svg>
);

const GeminiLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 2a1 1 0 0 1 1 1v2a7 7 0 0 0 7 7h2a1 1 0 0 1 0 2h-2a7 7 0 0 0-7 7v2a1 1 0 0 1-2 0v-2a7 7 0 0 0-7-7H2a1 1 0 0 1 0-2h2a7 7 0 0 0 7-7V3a1 1 0 0 1 1-1z" fill="url(#gemini-grad)"/>
        <defs>
            <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a73e8" />
                <stop offset="50%" stopColor="#ea4335" />
                <stop offset="100%" stopColor="#FBBC05" />
            </linearGradient>
        </defs>
    </svg>
);

const PostgreSqlLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#336791" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" fill="#336791" fillOpacity="0.2"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
    </svg>
);

const RedisLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#d82c20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#d82c20" fillOpacity="0.2"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
);

const StripeLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#635bff">
        <path d="M20.21 10.3c0-4.78-2.47-7.3-6.85-7.3-4.53 0-7.38 2.69-7.38 7.37 0 4.96 2.76 7.19 7.42 7.19.88 0 1.63-.07 2.47-.23 1.89-.36 3.01-1.29 3.01-1.29l-.81-2.92s-1 .39-2.07.61c-.71.14-1.63.15-2.28-.1-.65-.25-.89-.78-.89-1.58h6.98c.18-1.28.4-2.25.4-2.25zm-6.66-1.62c0-.79.46-1.22 1.25-1.22.81 0 1.23.43 1.23 1.22v.94h-2.48v-.94z"/>
    </svg>
);

const DockerLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#2496ed">
        <path d="M13.983 8.871h-2.274V6.597h2.274v2.274zM11.39 8.871H9.128V6.597H11.39v2.274zm-2.274 0H6.843V6.597h2.272v2.274zm-2.272 0H4.57V6.597h2.274v2.274zm8.683-2.528h-2.274V4.07h2.274v2.273zm-2.274 0H11.39V4.07h2.274v2.273zm-2.274 0H9.128V4.07H11.39v2.273zm4.548 5.056h-2.274v-2.274h2.274v2.274zm-2.274 0H11.39V8.871h2.274v2.274zm8.618 1.139c-.068-.078-.585-.634-1.89-.634-1.312 0-2.316.897-2.61 1.229V9.377h-2.274v6.822h2.274v-1.745c.345-.19.922-.44 1.48-.44.757 0 1.218.423 1.342.923.123.5.123 1.262.123 1.262h2.274s-.044-1.127-.29-2.029a2.532 2.532 0 0 0-1.729-1.9zm-9.068 3.654H1.5v2.274h12.484v-2.274z"/>
    </svg>
);

const SentryLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#362d59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#362d59" fillOpacity="0.2"/>
    </svg>
);

const MixpanelLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#4e5ba6">
        <circle cx="6" cy="12" r="3" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="18.5" cy="12" r="2.5" />
    </svg>
);

const ViteLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24">
        <polygon points="12,2 22,8 20,20 4,20 2,8" fill="url(#vite-bg)"/>
        <polygon points="12,4 17,11 13,11 15,18 9,11 12,11" fill="#ffb900"/>
        <defs>
            <linearGradient id="vite-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bd34fe" />
                <stop offset="100%" stopColor="#41d1ff" />
            </linearGradient>
        </defs>
    </svg>
);

const TailwindLogo = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 9h-9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5h9c.83 0 1.5 6.7 1.5 1.5s-.67 1.5-1.5 1.5z" fill="#38bdf8" fillOpacity="0.2"/>
    </svg>
);

const renderTechIcon = (key: string) => {
    switch (key) {
        case 'R19': return <ReactLogo />;
        case 'TS': return <TypeScriptLogo />;
        case 'JS': return <NodeLogo />;
        case 'GA': return <GeminiLogo />;
        case 'PG': return <PostgreSqlLogo />;
        case 'RD': return <RedisLogo />;
        case 'ST': return <StripeLogo />;
        case 'DK': return <DockerLogo />;
        case 'SE': return <SentryLogo />;
        case 'MX': return <MixpanelLogo />;
        case 'VT': return <ViteLogo />;
        case 'TW': return <TailwindLogo />;
        default: return key;
    }
};

const TECH_STACK = [
    { name: 'React 19', icon: 'R19' },
    { name: 'TypeScript', icon: 'TS' },
    { name: 'Node.js', icon: 'JS' },
    { name: 'Gemini AI', icon: 'GA' },
    { name: 'PostgreSQL', icon: 'PG' },
    { name: 'Redis', icon: 'RD' },
    { name: 'Stripe', icon: 'ST' },
    { name: 'Docker', icon: 'DK' },
    { name: 'Sentry', icon: 'SE' },
    { name: 'Mixpanel', icon: 'MX' },
    { name: 'Vite', icon: 'VT' },
    { name: 'TailwindCSS', icon: 'TW' },
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

const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
    '/': () => import('../components/OnboardingGate'),
    '/welcome': () => import('./WelcomePage'),
    '/login': () => import('./LoginPage'),
    '/diagnosis': () => import('./DiagnosisPage'),
    '/worker/dashboard': () => import('./WorkerDashboardPage'),
    '/worker/register': () => import('./WorkerRegistrationPage'),
    '/community': () => import('./CommunityPage'),
    '/calendar': () => import('./CalendarPage'),
    '/enterprise': () => import('./EnterpriseDashboard'),
    '/preview': () => import('./DevicePreview'),
};

const SIGNAL_POSITIONS = [
    { left: '8%', top: '69%' },
    { left: '24%', top: '43%' },
    { left: '41%', top: '27%' },
    { left: '59%', top: '27%' },
    { left: '76%', top: '43%' },
    { left: '92%', top: '69%' },
];

const PARTICLES = Array.from({ length: 104 }, (_, index) => ({
    left: `${(index * 47 + (index % 9) * 3) % 100}%`,
    top: `${(index * 31 + (index % 7) * 9) % 100}%`,
    size: index % 11 === 0 ? 3 : index % 4 === 0 ? 2 : 1,
    delay: `${-((index % 19) * 0.42)}s`,
    duration: `${8 + (index % 8)}s`,
}));

const preloadRoute = (route: string) => {
    void ROUTE_PRELOADERS[route]?.();
};

type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

type SeamlessLinkProps = Omit<ComponentProps<typeof Link>, 'to' | 'viewTransition'> & {
    to: string;
};

const SeamlessLink = ({ to, onClick, ...props }: SeamlessLinkProps) => {
    const navigate = useNavigate();

    const handleClick = useCallback(async (event: ReactMouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (
            event.defaultPrevented
            || event.button !== 0
            || event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey
            || props.target === '_blank'
        ) return;

        event.preventDefault();
        await ROUTE_PRELOADERS[to]?.().catch(() => undefined);

        const transitionDocument = document as ViewTransitionDocument;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const commitNavigation = () => flushSync(() => navigate(to));

        if (transitionDocument.startViewTransition && !reduceMotion) {
            transitionDocument.startViewTransition(commitNavigation);
            return;
        }

        commitNavigation();
    }, [navigate, onClick, props.target, to]);

    return <Link {...props} to={to} onClick={handleClick} />;
};

const ParticleField = ({ tone = 'light', density = 'full' }: { tone?: 'light' | 'dark'; density?: 'full' | 'sparse' }) => (
    <div className={`gravity-particles is-${tone} is-${density}`} aria-hidden="true">
        {PARTICLES.map((particle, index) => (
            <span
                key={index}
                className={`gravity-particle-tone-${(index % 4) + 1}`}
                style={{
                    left: particle.left,
                    top: particle.top,
                    width: particle.size,
                    height: particle.size,
                    animationDelay: particle.delay,
                    animationDuration: particle.duration,
                }}
            />
        ))}
    </div>
);

const StageVisual = ({
    stage,
    index,
    stages,
}: {
    stage: OperatingStageCopy;
    index: number;
    stages: OperatingStageCopy[];
}) => {
    const iconName = STAGE_ICONS[stage.id];

    return (
        <div className={`gravity-stage-visual stage-${stage.id}`} aria-hidden="true">
            <div className="gravity-stage-visual-top">
                <span className="gravity-stage-visual-icon">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                </span>
                <span>{stage.metric}</span>
            </div>
            <div className="gravity-stage-visual-center">
                <span className="gravity-stage-signal-ring">
                    <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                </span>
                <div className="gravity-stage-route">
                    {stages.map((item, routeIndex) => (
                        <span
                            key={item.id}
                            className={routeIndex <= index ? 'is-complete' : ''}
                        />
                    ))}
                </div>
            </div>
            <div className="gravity-stage-visual-bottom">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stage.title}</strong>
            </div>
        </div>
    );
};

const ShowcasePage = () => {
    const { t, locale } = useLanguage();
    const [iframeRoute, setIframeRoute] = useState('/');
    const [isDemoSwitching, setIsDemoSwitching] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const operatingStages = getOperatingStageCopies(locale === 'zh' ? 'zh' : 'en');

    const featuresReveal = useReveal();
    const demoReveal = useReveal();
    const techReveal = useReveal();
    const statsReveal = useReveal();
    const ctaReveal = useReveal();

    const selectedDemo = DEMO_ROUTES.find((route) => route.path === iframeRoute) || DEMO_ROUTES[0];

    const handleDemoRoute = useCallback((route: string) => {
        if (route === iframeRoute) return;
        preloadRoute(route);
        setIsDemoSwitching(true);
        setIframeRoute(route);
    }, [iframeRoute]);

    const handleDemoLoad = useCallback(() => {
        setIsDemoSwitching(false);
    }, []);

    const handleDemoKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number | null = null;

        if (event.key === 'ArrowRight') nextIndex = (index + 1) % DEMO_ROUTES.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + DEMO_ROUTES.length) % DEMO_ROUTES.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = DEMO_ROUTES.length - 1;
        if (nextIndex === null) return;

        event.preventDefault();
        const nextRoute = DEMO_ROUTES[nextIndex];
        handleDemoRoute(nextRoute.path);
        requestAnimationFrame(() => document.getElementById(`showcase-demo-tab-${nextRoute.key}`)?.focus());
    }, [handleDemoRoute]);

    const scrollToOperatingModel = useCallback(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById('showcase-operating-model')?.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start',
        });
    }, []);

    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    useEffect(() => {
        if (!isMenuOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setIsMenuOpen(false);
            document.querySelector<HTMLButtonElement>('.gravity-menu-button')?.focus();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen]);

    return (
        <div className="showcase-gravity">
            <MeteorShower />
            <header className="gravity-header showcase-glass-bar" aria-label="House Maint AI">
                <a className="gravity-brand" href="#showcase-top" aria-label="House Maint AI home">
                    <span className="gravity-brand-mark">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                            <path d="M10 3.5L4 8.5H6.5V14.5H13.5V8.5H16L10 3.5Z" fill="currentColor" />
                            <rect x="12.5" y="5.5" width="2" height="4.2" fill="currentColor" />
                            <rect x="8.5" y="11" width="3" height="3.5" fill="var(--color-showcase-canvas)" />
                        </svg>
                    </span>
                    <span>House Maint AI</span>
                </a>

                <nav className="gravity-nav" aria-label={locale === 'zh' ? '展示页面导航' : 'Showcase sections'}>
                    <a href="#showcase-operating-model">{t('showcase.featuresLabel')}</a>
                    <a href="#showcase-live-demo">{t('showcase.demoLabel')}</a>
                    <a href="#showcase-tech">{t('showcase.techLabel')}</a>
                </nav>

                <div className="gravity-header-actions">
                    <LanguageToggle />
                    <SeamlessLink
                        to="/welcome"
                        onPointerEnter={() => preloadRoute('/welcome')}
                        onFocus={() => preloadRoute('/welcome')}
                        className="gravity-header-cta"
                    >
                        {t('showcase.ctaLaunch')}
                        <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                    </SeamlessLink>
                    <button
                        type="button"
                        className="gravity-menu-button"
                        aria-label={locale === 'zh'
                            ? (isMenuOpen ? '关闭导航' : '打开导航')
                            : (isMenuOpen ? 'Close navigation' : 'Open navigation')}
                        aria-expanded={isMenuOpen}
                        aria-controls="gravity-mobile-nav"
                        onClick={() => setIsMenuOpen((open) => !open)}
                    >
                        {isMenuOpen ? <span className="material-symbols-outlined text-[20px]">close</span> : <span className="material-symbols-outlined text-[20px]">menu</span>}
                    </button>
                </div>

                <nav
                    id="gravity-mobile-nav"
                    className={`gravity-mobile-nav ${isMenuOpen ? 'is-open' : ''}`}
                    aria-label={locale === 'zh' ? '移动端展示页面导航' : 'Mobile showcase sections'}
                    aria-hidden={!isMenuOpen}
                >
                    <a href="#showcase-operating-model" tabIndex={isMenuOpen ? 0 : -1} onClick={closeMenu}>{t('showcase.featuresLabel')}</a>
                    <a href="#showcase-live-demo" tabIndex={isMenuOpen ? 0 : -1} onClick={closeMenu}>{t('showcase.demoLabel')}</a>
                    <a href="#showcase-tech" tabIndex={isMenuOpen ? 0 : -1} onClick={closeMenu}>{t('showcase.techLabel')}</a>
                </nav>
            </header>

            <main>
                <section id="showcase-top" className="gravity-hero">
                    <ParticleField />
                    <div className="gravity-hero-content">
                        <div className="gravity-hero-product page-enter">
                            <span className="material-symbols-outlined text-[22px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                            <span>House Maint AI</span>
                        </div>
                        <p className="gravity-hero-status page-enter">
                            <span aria-hidden="true" />
                            {t('showcase.badge')}
                        </p>
                        <h1 className="page-enter">{t('showcase.heroTitle')}</h1>
                        <p className="gravity-hero-subtitle page-enter">{t('showcase.heroSubtitle')}</p>
                        <div className="gravity-actions page-enter">
                            <SeamlessLink
                                to="/welcome"
                                onPointerEnter={() => preloadRoute('/welcome')}
                                onFocus={() => preloadRoute('/welcome')}
                                className="gravity-button is-dark"
                            >
                                {t('showcase.ctaTryDemo')}
                                <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                            </SeamlessLink>
                            <a
                                href="https://github.com/Mark393295827/house-maint-ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gravity-button is-light"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                                </svg>
                                {t('showcase.ctaGithub')}
                            </a>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="gravity-scroll-cue"
                        onClick={scrollToOperatingModel}
                        aria-controls="showcase-operating-model"
                    >
                        <span>{t('showcase.scrollHint')}</span>
                        <span className="material-symbols-outlined text-[17px] ml-1">arrow_downward</span>
                    </button>
                </section>

                <section id="showcase-operating-model" ref={featuresReveal} className="gravity-section gravity-operating reveal">
                    <div className="gravity-media-stage showcase-dark-stage">
                        <ParticleField tone="dark" />
                        <div className="gravity-media-stage-label">
                            <span>{locale === 'zh' ? '运营闭环' : 'Operating loop'}</span>
                            <strong>01-06</strong>
                        </div>
                        <div className="gravity-signal-map" aria-label={locale === 'zh' ? '六阶段运营闭环' : 'Six-stage operating loop'}>
                            <span className="gravity-signal-core">
                                <span className="material-symbols-outlined text-[60px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                            </span>
                            {operatingStages.map((stage, index) => {
                                const iconName = STAGE_ICONS[stage.id];
                                return (
                                    <span
                                        key={stage.id}
                                        className={`gravity-signal-node stage-${stage.id}`}
                                        style={SIGNAL_POSITIONS[index] as CSSProperties}
                                    >
                                        <span className="material-symbols-outlined text-[34px]" style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                                        <small>{String(index + 1).padStart(2, '0')}</small>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="gravity-stage-rail" aria-label={locale === 'zh' ? '六阶段运营闭环' : 'Six-stage operating loop'}>
                        <div className="gravity-stage-track">
                            {[...operatingStages, ...operatingStages].map((stage, index) => {
                                const iconName = STAGE_ICONS[stage.id];
                                const duplicate = index >= operatingStages.length;
                                return (
                                    <div key={`${stage.id}-${index}`} className="gravity-stage-rail-item" aria-hidden={duplicate || undefined}>
                                        <span>
                                            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                                        </span>
                                        <small>{stage.title}</small>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="gravity-editorial-heading">
                        <p>{t('showcase.featuresLabel')}</p>
                        <h2>
                            {t('showcase.featuresTitle')}{' '}
                            <span>{t('showcase.featuresTitleHighlight')}</span>
                        </h2>
                    </div>

                    <div className="gravity-stage-list">
                        {operatingStages.map((stage, index) => (
                            <article key={stage.id} className={`gravity-stage-row ${index % 2 ? 'is-reversed' : ''}`}>
                                <div className="gravity-stage-copy">
                                    <div className="gravity-stage-meta">
                                        <span>{String(index + 1).padStart(2, '0')} / 06</span>
                                        <span>{stage.metric}</span>
                                    </div>
                                    <h3>{stage.title}</h3>
                                    <p>{stage.description}</p>
                                </div>
                                <StageVisual stage={stage} index={index} stages={operatingStages} />
                            </article>
                        ))}
                    </div>
                </section>

                <section id="showcase-live-demo" ref={demoReveal} className="gravity-section gravity-demo reveal">
                    <div className="gravity-section-heading">
                        <p>{t('showcase.demoLabel')}</p>
                        <h2>{t('showcase.demoTitle')} <span>{t('showcase.demoTitleHighlight')}</span></h2>
                    </div>

                    <div className="gravity-route-selector" role="tablist" aria-label={t('showcase.demoLabel')}>
                        {DEMO_ROUTES.map((route, index) => (
                            <button
                                key={route.path}
                                id={`showcase-demo-tab-${route.key}`}
                                type="button"
                                role="tab"
                                aria-selected={iframeRoute === route.path}
                                aria-controls="showcase-demo-panel"
                                tabIndex={iframeRoute === route.path ? 0 : -1}
                                onClick={() => handleDemoRoute(route.path)}
                                onKeyDown={(event) => handleDemoKeyDown(event, index)}
                                onPointerEnter={() => preloadRoute(route.path)}
                                onFocus={() => preloadRoute(route.path)}
                                className={iframeRoute === route.path ? 'is-active' : ''}
                            >
                                {t(`showcase.demoRoutes.${route.key}`)}
                            </button>
                        ))}
                    </div>

                    <div
                        id="showcase-demo-panel"
                        className="gravity-demo-stage showcase-dark-stage"
                        role="tabpanel"
                        aria-labelledby={`showcase-demo-tab-${selectedDemo.key}`}
                        aria-busy={isDemoSwitching}
                    >
                        <ParticleField tone="dark" density="sparse" />
                        <div className="gravity-demo-copy">
                            <span>{t('showcase.demoLabel')}</span>
                            <strong aria-live="polite">{t(`showcase.demoRoutes.${selectedDemo.key}`)}</strong>
                            <p>House Maint AI / {String(DEMO_ROUTES.indexOf(selectedDemo) + 1).padStart(2, '0')}</p>
                        </div>

                        <div className="gravity-device">
                            <div className="gravity-device-sensor" aria-hidden="true" />
                            <div className={`gravity-device-screen ${isDemoSwitching ? 'is-switching' : ''}`}>
                                <div className="gravity-device-screen-mask" aria-hidden="true" />
                                <div className="gravity-demo-progress" aria-hidden="true"><span /></div>
                                <iframe
                                    ref={iframeRef}
                                    src={`${window.location.host === 'localhost:5173' ? 'http://localhost:5173' : window.location.origin}${iframeRoute}`}
                                    title="Live Demo"
                                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                    onLoad={handleDemoLoad}
                                />
                            </div>
                            <div className="gravity-device-home-indicator" aria-hidden="true" />
                        </div>
                    </div>
                </section>

                <section id="showcase-tech" ref={techReveal} className="gravity-section gravity-tech reveal">
                    <div className="gravity-section-heading is-compact">
                        <p>{t('showcase.techLabel')}</p>
                        <h2>{t('showcase.techTitle')} <span>{t('showcase.techTitleHighlight')}</span></h2>
                    </div>

                    <div className="gravity-tech-rail">
                        <div className="gravity-tech-track">
                            {[...TECH_STACK, ...TECH_STACK].map((tech, index) => (
                                <article key={`${tech.name}-${index}`} className="gravity-tech-item" aria-hidden={index >= TECH_STACK.length || undefined}>
                                    <span>{renderTechIcon(tech.icon)}</span>
                                    <strong>{tech.name}</strong>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section ref={statsReveal} className="gravity-section gravity-stats reveal">
                    <ParticleField density="sparse" />
                    <div className="gravity-stats-grid">
                        {STATS_CONFIG.map((stat) => (
                            <article key={stat.key} className="gravity-stat">
                                <div>
                                    <StatValue value={stat.value} decimals={stat.decimals} />
                                    <span>{stat.suffix}</span>
                                </div>
                                <p>{t(`showcase.${stat.key}`)}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section ref={ctaReveal} className="gravity-section gravity-cta reveal">
                    <div className="gravity-cta-panel showcase-dark-stage">
                        <ParticleField tone="dark" />
                        <div className="gravity-cta-content">
                            <h2>{t('showcase.ctaTitle')} <span>{t('showcase.ctaTitleHighlight')}</span></h2>
                            <p>{t('showcase.ctaSubtitle')}</p>
                            <div className="gravity-actions">
                                <SeamlessLink
                                    to="/welcome"
                                    onPointerEnter={() => preloadRoute('/welcome')}
                                    onFocus={() => preloadRoute('/welcome')}
                                    className="gravity-button is-white"
                                >
                                    <span className="material-symbols-outlined text-[18px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                    {t('showcase.ctaLaunch')}
                                </SeamlessLink>
                                <SeamlessLink
                                    to="/preview"
                                    onPointerEnter={() => preloadRoute('/preview')}
                                    onFocus={() => preloadRoute('/preview')}
                                    className="gravity-button is-charcoal"
                                >
                                    <span className="material-symbols-outlined text-[18px] mr-1">devices</span>
                                    {t('showcase.ctaPreview')}
                                </SeamlessLink>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="gravity-footer">
                <div className="gravity-footer-top">
                    <div>
                        <p>{t('showcase.footer')}</p>
                        <strong>House Maint AI</strong>
                    </div>
                    <nav aria-label="Product links">
                        {['dashboard', 'welcome', 'community'].map((key) => {
                            const path = DEMO_ROUTES.find((route) => route.key === key)?.path || '/';
                            return (
                                <SeamlessLink
                                    key={key}
                                    to={path}
                                    onPointerEnter={() => preloadRoute(path)}
                                    onFocus={() => preloadRoute(path)}
                                >
                                    {t(`showcase.demoRoutes.${key}`)}
                                </SeamlessLink>
                            );
                        })}
                    </nav>
                </div>
                <p className="gravity-footer-wordmark">House Maint AI</p>
            </footer>
        </div>
    );
};

const StatValue = ({ value, decimals }: { value: number; decimals?: number }) => {
    const counter = useCountUp(decimals ? value * 10 : value);
    return (
        <strong ref={counter.ref} className="gravity-stat-value">
            {decimals ? (counter.count / 10).toFixed(1) : counter.count}
        </strong>
    );
};

export default ShowcasePage;
