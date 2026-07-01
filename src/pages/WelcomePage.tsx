import { Link } from 'react-router-dom';
import { IMAGES } from '../constants/images';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { getOperatingStageCopies, getProofMetrics } from '../constants/operatingModel';

const WelcomePage = () => {
    const { t, locale } = useLanguage();
    const isZh = locale === 'zh';
    const operatingStages = getOperatingStageCopies(isZh ? 'zh' : 'en');
    const proofMetrics = getProofMetrics(isZh ? 'zh' : 'en');

    return (
        <div className="relative min-h-[100dvh] w-full bg-[#fbfbfd] font-sans text-[#1d1d1f] overflow-x-hidden selection:bg-[#0071e3]/10">
            {/* Apple Background Gradient System */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-gradient-to-br from-[#0071e3]/10 to-transparent blur-[120px] opacity-60" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tl from-[#5856d6]/10 to-transparent blur-[100px] opacity-40" />
            </div>

            {/* Navigation Bar */}
            <header className="fixed top-0 inset-x-0 z-50 h-16 apple-glass border-b border-[#d2d2d7]/30 flex items-center justify-between px-6 lg:px-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1d1d1f] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                    </div>
                    <span className="text-[13px] font-black tracking-[0.2em] uppercase opacity-90">{t('app.name')}</span>
                </div>
                <div className="flex items-center gap-4">
                    <LanguageToggle />
                    <Link to="/login" className="text-[12px] font-bold text-[#0066cc] hover:underline px-3 py-1.5">{isZh ? '登录' : 'Sign In'}</Link>
                </div>
            </header>

            <main className="relative z-10 pt-24 pb-32 px-6 lg:px-12 flex flex-col items-center">
                <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
                    
                    {/* Hero Section */}
                    <div className="w-full max-w-4xl text-center mb-16 lg:mb-24 page-enter">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f5f5f7] border border-[#d2d2d7]/50 text-[10px] font-black tracking-widest uppercase mb-8 shadow-sm">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-[#28cd41]" />
                            {isZh ? '微信维修运营闭环已上线' : 'WeChat Maintenance Operating Loop Live'}
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] tracking-[-0.03em] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            {isZh ? '从报修到验收，一条微信闭环。' : 'From report to verified repair in one WeChat-native loop.'}
                        </h1>
                        <p className="text-xl lg:text-2xl font-bold text-[#86868b] max-w-2xl mx-auto leading-relaxed opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 fill-mode-forwards">
                            {isZh
                                ? '拍照、语音或视频提交问题，AI 完成分级、DIY 分流、师傅派单、验收回访和业主报表。'
                                : 'Submit photos, voice, or video. AI handles triage, DIY deflection, worker dispatch, repair verification, and owner reporting.'}
                        </p>
                    </div>

                    {/* Main Showcase Grid */}
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-24">
                        {/* Left Feature: Primary Action */}
                        <div className="lg:col-span-12 xl:col-span-7 aegis-card overflow-hidden bg-white/40 ring-1 ring-black/5 stagger-item">
                            <div className="relative h-full min-h-[400px] lg:min-h-[500px] flex flex-col">
                                <div className="p-10 lg:p-14 relative z-20 max-w-md">
                                    <div className="w-12 h-12 rounded-2xl bg-[#007aff] flex items-center justify-center shadow-lg shadow-[#007aff]/30 mb-8">
                                        <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
                                    </div>
                                    <h2 className="text-3xl lg:text-4xl font-black tracking-tighter mb-4">{isZh ? '报修即进入运营闭环' : 'Every report enters the operating loop'}</h2>
                                    <p className="text-[15px] font-medium text-[#86868b] leading-relaxed mb-10">
                                        {isZh 
                                            ? '租客不需要下载新 App。通过微信提交上下文后，系统自动判断是否自助解决、是否派单、由谁承担责任。'
                                            : 'Tenants do not need another app. Once context arrives through WeChat, the system decides whether to deflect, dispatch, and attribute responsibility.'}
                                    </p>
                                    <Link to="/diagnosis" className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#1d1d1f] text-white rounded-2xl text-[14px] font-black tracking-tight hover:bg-black transition-all press-scale shadow-xl shadow-black/10">
                                        {t('welcome.getStarted')}
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </Link>
                                </div>
                                <div 
                                    className="absolute inset-0 z-0 bg-cover bg-right-bottom mix-blend-multiply opacity-20 lg:opacity-40"
                                    style={{ backgroundImage: `url("${IMAGES.WELCOME_HERO}")` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10" />
                            </div>
                        </div>

                        {/* Right Detail Cards */}
                        <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-6">
                            {operatingStages.slice(0, 3).map((item, i) => (
                                <div key={i} className="aegis-card p-10 bg-white/60 flex items-start gap-8 stagger-item">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f5f5f7] ${i === 0 ? 'to-[#5856d6]' : i === 1 ? 'to-[#28cd41]' : 'to-[#ff9500]'} shrink-0 flex items-center justify-center shadow-sm border border-white`}>
                                        <span className="material-symbols-outlined text-[20px] font-black text-[#1d1d1f]">{item.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-[17px] font-black tracking-tight mb-2">{item.title}</h3>
                                        <p className="text-[13px] font-medium text-[#86868b] leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mission Section */}
                    <div
                        className="w-full text-center py-20 px-6 rounded-[32px] text-white stagger-item overflow-hidden relative shadow-2xl shadow-black/20"
                        style={{ background: 'linear-gradient(135deg, #111316 0%, #163d35 58%, #0b2f36 100%)' }}
                    >
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0071e3]/20 to-transparent" />
                         <div className="relative z-10 py-10">
                            <h2 className="text-2xl lg:text-3xl font-black mb-10 tracking-tight">{isZh ? '不是单点诊断工具。' : 'Not a single diagnosis tool.'}<br/>{isZh ? '是一套物业运营系统。' : 'A property operating system.'}</h2>
                            <div className="flex flex-wrap justify-center gap-12 lg:gap-24">
                                {proofMetrics.slice(0, 3).map((metric) => (
                                    <div key={metric.label} className="flex flex-col items-center max-w-[150px]">
                                        <span className="text-4xl lg:text-5xl font-black tracking-tighter mb-2">{metric.value}</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{metric.label}</span>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 lg:px-12 border-t border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-8">
                    <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">© 2026 House Maint AI. WeChat-native maintenance operations.</p>
                    <div className="flex gap-8">
                        <Link to="/showcase" className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest hover:text-[#1d1d1f] transition-colors">{isZh ? '隐私政策' : 'Privacy'}</Link>
                        <Link to="/showcase" className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest hover:text-[#1d1d1f] transition-colors">{isZh ? '服务条款' : 'Terms'}</Link>
                        <Link to="/showcase" className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest hover:text-[#1d1d1f] transition-colors">{isZh ? '支持' : 'Support'}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;
