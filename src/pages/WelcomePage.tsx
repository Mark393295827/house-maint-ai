import { Link } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

const WelcomePage = () => {
    const { t, locale } = useLanguage();
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-sans text-text-main-light dark:text-text-main-dark overflow-hidden">
            {/* Ambient gradient orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl float" />
            <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-accent/10 dark:bg-accent/5 blur-3xl float-delayed" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between pt-8 pb-4 px-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                    </div>
                    <span className="font-display text-sm font-bold tracking-wider uppercase opacity-70">{t('app.name')}</span>
                </div>
                <LanguageToggle />
            </div>

            <div className="flex-1 flex flex-col items-center w-full max-w-md mx-auto px-6 overflow-y-auto page-enter">
                {/* Hero Image — floating, with glow behind */}
                <div className="w-full mt-4 mb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl scale-95" />
                    <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-white/20">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url("${IMAGES.WELCOME_HERO}")` }}
                            aria-label="Person holding a smartphone scanning a bathroom faucet"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                        {/* Floating badge */}
                        <div className="absolute bottom-5 right-5 glass dark:glass-dark px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-xl">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <div className="flex flex-col leading-none gap-0.5">
                                <span className="text-xs font-bold text-text-main-light dark:text-white">{t('welcome.issueDetected')}</span>
                                <span className="text-[10px] text-text-sub-light dark:text-white/60">AI Analysis Complete</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="w-full text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.1] text-text-main-light dark:text-text-main-dark">
                        {t('welcome.title')}
                    </h1>
                    <p className="text-lg font-semibold gradient-text mt-2">{t('welcome.subtitle')}</p>
                </div>

                {/* Feature cards — 4 differentiators */}
                <div className="w-full flex flex-col gap-3 mb-8">
                    {[
                        {
                            icon: 'add_a_photo',
                            gradient: 'from-indigo-500 to-violet-500',
                            metric: locale === 'zh' ? '30秒' : '30s',
                            metricLabel: locale === 'zh' ? '极速诊断' : 'Diagnosis',
                            title: locale === 'zh' ? '拍照即诊断' : 'Photo-Based Diagnosis',
                            desc: locale === 'zh'
                                ? '上传照片，30秒内获得MECE分类分析，比人工排查快10倍'
                                : 'Upload a photo, get MECE analysis in 30s — 10× faster than manual investigation',
                        },
                        {
                            icon: 'timeline',
                            gradient: 'from-cyan-500 to-teal-500',
                            metric: locale === 'zh' ? '全程' : '100%',
                            metricLabel: locale === 'zh' ? '可追溯' : 'Traceable',
                            title: locale === 'zh' ? '端到端可追溯' : 'Full Traceability',
                            desc: locale === 'zh'
                                ? '从发现问题到闭环归档，告别"修了但不知修了什么"'
                                : 'End-to-end archiving from discovery to resolution — no more mystery repairs',
                        },
                        {
                            icon: 'verified_user',
                            gradient: 'from-emerald-500 to-green-500',
                            metric: locale === 'zh' ? '防' : 'Zero',
                            metricLabel: locale === 'zh' ? '复发机制' : 'Relapse',
                            title: locale === 'zh' ? '复发预防机制' : 'Relapse Prevention',
                            desc: locale === 'zh'
                                ? '每个案例强制输出标准化Checklist，纳入同类工程验收标准'
                                : 'Standardized checklist output built into acceptance criteria for future similar projects',
                        },
                        {
                            icon: 'videocam',
                            gradient: 'from-rose-500 to-pink-500',
                            metric: locale === 'zh' ? '远程' : 'Live',
                            metricLabel: locale === 'zh' ? '实时巡检' : 'Inspection',
                            title: locale === 'zh' ? '远程实时巡检' : 'Live Remote Inspection',
                            desc: locale === 'zh'
                                ? '工程师远程视频接入，Gemini实时标注问题区域，减少上门次数'
                                : 'Engineers connect via video, Gemini marks problem areas in real-time — fewer site visits',
                        },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl glass dark:glass-dark hover:scale-[1.01] transition-transform stagger-item">
                            {/* Icon + metric badge */}
                            <div className="relative shrink-0">
                                <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} size-12 shadow-lg`}>
                                    <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                </div>
                                <div className="absolute -top-2 -right-2 flex flex-col items-center leading-none bg-white dark:bg-gray-800 rounded-lg px-1 py-0.5 shadow-md border border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-extrabold text-primary">{item.metric}</span>
                                    <span className="text-[7px] text-gray-400 font-medium">{item.metricLabel}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <h3 className="text-sm font-bold leading-tight text-text-main-light dark:text-text-main-dark">{item.title}</h3>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-snug">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="relative z-10 w-full max-w-md mx-auto p-6 pt-0 mt-auto">
                <div className="flex justify-center gap-2 mb-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                </div>
                <Link
                    to="/diagnosis"
                    className="relative w-full h-14 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.97] flex items-center justify-center gap-2 btn-gradient font-bold text-lg overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {t('welcome.getStarted')}
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </span>
                </Link>
                <div className="h-4" />
            </div>
        </div>
    );
};

export default WelcomePage;
