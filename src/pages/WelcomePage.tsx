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
        <div className="relative min-h-[100dvh] w-full bg-[#ffffff] font-sans text-[#202124] overflow-x-hidden selection:bg-[#1a73e8]/10">
            {/* Apple Background Gradient System */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-gradient-to-br from-[#1a73e8]/10 to-transparent blur-[120px] opacity-60" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tl from-[#a142f4]/10 to-transparent blur-[100px] opacity-40" />
            </div>

            {/* Navigation Bar */}
            <header className="fixed top-0 inset-x-0 z-50 h-16 apple-glass border-b border-[#d2d2d7]/30 flex items-center justify-between px-6 lg:px-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#202124] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                    </div>
                    <span className="text-[13px] font-black tracking-[0.2em] uppercase opacity-90">{t('app.name')}</span>
                </div>
                <div className="flex items-center gap-4">
                    <LanguageToggle />
                    <Link to="/showcase" className="text-[12px] font-bold text-[#5f6368] hover:text-[#202124] px-3 py-1.5 transition-colors hidden sm:inline-block">
                        {isZh ? '全景展厅' : 'Showcase'}
                    </Link>
                    <Link to="/enterprise" className="text-[12px] font-bold text-[#5f6368] hover:text-[#202124] px-3 py-1.5 transition-colors hidden sm:inline-block">
                        {isZh ? '企业控制台' : 'Enterprise'}
                    </Link>
                    <Link to="/login" className="text-[12px] font-bold text-[#1557b0] hover:underline px-3 py-1.5">
                        {isZh ? '登录' : 'Sign In'}
                    </Link>
                </div>
            </header>

            <main className="relative z-10 pt-24 pb-32 px-6 lg:px-12 flex flex-col items-center">
                <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
                    
                    {/* Hero Section */}
                    <div className="w-full max-w-4xl text-center mb-16 lg:mb-24 page-enter">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f8f9fa] border border-[#d2d2d7]/50 text-[10px] font-black tracking-widest uppercase mb-8 shadow-sm">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-[#34a853]" />
                            {isZh ? 'Agent 运行内核 + 领域主控引擎双内核架构' : 'Agent Kernel + Domain Control Plane Architecture'}
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] tracking-[-0.03em] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            {isZh ? '从报修到验收，一条微信闭环。' : 'From report to verified repair in one WeChat-native loop.'}
                        </h1>
                        <p className="text-xl lg:text-2xl font-bold text-[#86868b] max-w-3xl mx-auto leading-relaxed opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 fill-mode-forwards">
                            {isZh
                                ? '基于模块化 Workspace 与微信生态原生集成。拍照、语音或视频提交问题，AI 完成分级、DIY 分流、师傅派单、验收回访和业主报表。'
                                : 'Built on modular workspace packages and native WeChat integration. Submit photos, voice, or video. AI handles triage, DIY deflection, worker dispatch, repair verification, and owner reporting.'}
                        </p>

                        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                            <Link to="/diagnosis" className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#1a73e8] text-white rounded-2xl text-[15px] font-black tracking-tight hover:bg-[#1557b0] transition-all press-scale shadow-xl shadow-[#1a73e8]/25">
                                <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                {isZh ? '立即体验 AI 诊断' : 'Start AI Diagnosis'}
                            </Link>
                            <Link to="/showcase" className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#f8f9fa] text-[#202124] border border-[#d2d2d7]/60 rounded-2xl text-[15px] font-black tracking-tight hover:bg-[#e8eaed] transition-all press-scale">
                                <span className="material-symbols-outlined text-xl">architecture</span>
                                {isZh ? '查看系统架构展厅' : 'Explore System Architecture'}
                            </Link>
                        </div>
                    </div>

                    {/* Main Showcase Grid */}
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-24">
                        {/* Left Feature: Primary Action */}
                        <div className="lg:col-span-12 xl:col-span-7 aegis-card overflow-hidden bg-white/40 ring-1 ring-black/5 stagger-item">
                            <div className="relative h-full min-h-[400px] lg:min-h-[500px] flex flex-col">
                                <div className="p-10 lg:p-14 relative z-20 max-w-md">
                                    <div className="w-12 h-12 rounded-2xl bg-[#1a73e8] flex items-center justify-center shadow-lg shadow-[#1a73e8]/30 mb-8">
                                        <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
                                    </div>
                                    <h2 className="text-3xl lg:text-4xl font-black tracking-tighter mb-4">{isZh ? '微信原生，报修即入闭环' : 'WeChat Native: Direct Operating Loop'}</h2>
                                    <p className="text-[15px] font-medium text-[#86868b] leading-relaxed mb-10">
                                        {isZh 
                                            ? '租客无需下载 App，微信上传现场图像后，领域控制面自动解析权属关系与算力预算，通过确定性 Event Ledger 完成记录。'
                                            : 'No app install needed. Uploading site photos via WeChat triggers canonical domain state reduction, task-budget checks, and deterministic audit trails.'}
                                    </p>
                                    <Link to="/diagnosis" className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#202124] text-white rounded-2xl text-[14px] font-black tracking-tight hover:bg-black transition-all press-scale shadow-xl shadow-black/10">
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
                        <div className="lg:col-span-12 xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                            {operatingStages.map((item, i) => (
                                <div key={item.id} className="aegis-card p-6 bg-white/60 flex items-start gap-5 stagger-item">
                                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f8f9fa] ${i % 3 === 0 ? 'to-[#a142f4]' : i % 3 === 1 ? 'to-[#34a853]' : 'to-[#ff9500]'} shrink-0 flex items-center justify-center shadow-sm border border-white`}>
                                        <span className="material-symbols-outlined text-[20px] font-black text-[#202124]">{item.icon}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{i + 1}/6</span>
                                            <span className="h-px flex-1 bg-black/5" />
                                        </div>
                                        <h3 className="text-[16px] font-black tracking-tight mb-2">{item.title}</h3>
                                        <p className="text-[13px] font-medium text-[#86868b] leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Architectural Pillars */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                        <div className="aegis-card p-8 bg-white/70 border border-[#d2d2d7]/40 flex flex-col items-start">
                            <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-6 font-bold">
                                <span className="material-symbols-outlined text-2xl">account_tree</span>
                            </div>
                            <h3 className="text-xl font-black mb-3">{isZh ? '领域控制主面' : 'Domain Control Plane'}</h3>
                            <p className="text-[14px] font-medium text-[#5f6368] leading-relaxed">
                                {isZh 
                                    ? '维护 maintenance_cases 与不可变 case_events 账本，严格校验组织与资源层级归属权。' 
                                    : 'Maintains canonical maintenance_cases and append-only case_events ledgers with scope ancestry checks.'}
                            </p>
                        </div>

                        <div className="aegis-card p-8 bg-white/70 border border-[#d2d2d7]/40 flex flex-col items-start">
                            <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] text-[#ea4335] flex items-center justify-center mb-6 font-bold">
                                <span className="material-symbols-outlined text-2xl">memory</span>
                            </div>
                            <h3 className="text-xl font-black mb-3">{isZh ? 'Agent 运行内核' : 'Agent Runtime Kernel'}</h3>
                            <p className="text-[14px] font-medium text-[#5f6368] leading-relaxed">
                                {isZh 
                                    ? '厂商无关的 AI 调度内核，管理任务租约、时间/Token 预算上限与不可变内容寻址产物。' 
                                    : 'Vendor-neutral runtime managing task leases, wall-clock/token budget caps, and content-addressed artifacts.'}
                            </p>
                        </div>

                        <div className="aegis-card p-8 bg-white/70 border border-[#d2d2d7]/40 flex flex-col items-start">
                            <div className="w-12 h-12 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center mb-6 font-bold">
                                <span className="material-symbols-outlined text-2xl">view_module</span>
                            </div>
                            <h3 className="text-xl font-black mb-3">{isZh ? '模块化 Workspace 架构' : 'Modular Workspace Design'}</h3>
                            <p className="text-[14px] font-medium text-[#5f6368] leading-relaxed">
                                {isZh 
                                    ? 'npm Workspaces 解耦 @house-maint/contracts, domain, agent-core, policy, persistence, observability。' 
                                    : 'npm Workspaces cleanly decouple contracts, domain control, runtime kernel, policy, and persistence.'}
                            </p>
                        </div>
                    </div>

                    {/* Mission Section */}
                    <div
                        className="w-full text-center py-20 px-6 rounded-[32px] text-white stagger-item overflow-hidden relative shadow-2xl shadow-black/20"
                        style={{ background: 'linear-gradient(135deg, #111316 0%, #163d35 58%, #0b2f36 100%)' }}
                    >
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1a73e8]/20 to-transparent" />
                         <div className="relative z-10 py-10">
                            <h2 className="text-2xl lg:text-3xl font-black mb-10 tracking-tight">{isZh ? '不是单点 AI 工具。' : 'Not a single AI tool.'}<br/>{isZh ? '是一套 Agent 原生物业运营数字孪生系统。' : 'An Agent-native property operating system.'}</h2>
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
            <footer className="relative z-10 py-12 px-6 lg:px-12 border-t border-[#d2d2d7]/30 bg-[#f8f9fa]/50">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-8">
                    <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">© 2026 House Maint AI. Agent-Native WeChat Maintenance Operations.</p>
                    <div className="flex gap-8">
                        <Link to="/showcase" className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest hover:text-[#202124] transition-colors">{isZh ? '全景展厅' : 'Showcase'}</Link>
                        <Link to="/enterprise" className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest hover:text-[#202124] transition-colors">{isZh ? '企业控制台' : 'Enterprise'}</Link>
                        <Link to="/worker/dashboard" className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest hover:text-[#202124] transition-colors">{isZh ? '师傅端' : 'Worker Portal'}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;
