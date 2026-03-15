import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, error, clearError, isLoading } = useAuth();
    const { showToast } = useToast();
    const { t, locale } = useLanguage();
    const isZh = locale === 'zh';

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    const from = location.state?.from?.pathname || '/';

    const validatePhone = (phone: string) => {
        if (isZh) return /^1[3-9]\d{9}$/.test(phone);
        return /^\d{10,15}$/.test(phone);
    };

    const phoneMaxLength = isZh ? 11 : 15;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        if (!validatePhone(phone)) {
            setFormError(t('login.error.invalidPhone'));
            return;
        }
        if (password.length < 8) {
            setFormError(t('login.error.passwordShort'));
            return;
        }
        if (!isLoginMode && !name.trim()) {
            setFormError(t('login.error.nameRequired'));
            return;
        }

        try {
            const result = isLoginMode
                ? await login(phone, password)
                : await register(phone, password, name);

            if (result.success) {
                showToast(isLoginMode ? t('login.error.loginSuccess') : t('login.error.registerSuccess'), 'success');
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            setFormError(err.message || t('login.error.networkError'));
        }
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setFormError('');
        clearError();
    };

    return (
        <div className="min-h-[100dvh] bg-[#f5f5f7] flex flex-col font-sans text-[#1d1d1f] page-enter relative overflow-hidden">
            {/* Apple Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] rounded-full bg-[#0071e3]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#5856d6]/5 blur-[120px]" />
            </div>

            {/* Language toggle — top right */}
            <header className="relative z-50 flex items-center justify-between p-6 lg:px-12">
                <Link to="/" className="w-10 h-10 flex items-center justify-center bg-white border border-black/5 rounded-2xl shadow-sm hover:shadow-md transition-all press-scale">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </Link>
                <LanguageToggle />
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
                <div className="w-full max-w-sm">
                    {/* Branding */}
                    <div className="flex flex-col items-center mb-12 stagger-item">
                        <div className="w-16 h-16 bg-[#1d1d1f] rounded-[22px] flex items-center justify-center shadow-2xl shadow-black/10 mb-6">
                            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter mb-2">
                             {isLoginMode ? t('login.title') : t('login.titleRegister')}
                        </h1>
                        <p className="text-[15px] font-bold text-[#86868b] text-center leading-snug max-w-[280px]">
                            {isLoginMode ? t('login.subtitle') : t('login.subtitleRegister')}
                        </p>
                    </div>

                    {/* Form Module */}
                    <div className="aegis-card p-1 bg-white/40 ring-1 ring-black/5 backdrop-blur-3xl mb-8 stagger-item">
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            {!isLoginMode && (
                                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label className="text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">{t('login.namePlaceholder')}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-12 px-4 bg-white/50 border border-black/5 rounded-xl text-[14px] font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 transition-all placeholder:font-medium"
                                        placeholder="Full Name"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">{isZh ? '手机号码' : 'Phone Number'}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#86868b]">{isZh ? '+86' : ''}</span>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength))}
                                        className={`w-full h-12 ${isZh ? 'pl-14' : 'px-4'} bg-white/50 border border-black/5 rounded-xl text-[14px] font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 transition-all`}
                                        placeholder={isZh ? '1xx xxxx xxxx' : 'Phone'}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">{isZh ? '访问密码' : 'Password'}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-4 pr-12 bg-white/50 border border-black/5 rounded-xl text-[14px] font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 transition-all"
                                        placeholder="Min 8 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {(formError || error) && (
                                <div className="p-4 bg-[#ff3b30]/5 border border-[#ff3b30]/10 rounded-xl flex gap-3 stagger-item">
                                    <span className="material-symbols-outlined text-[#ff3b30] text-[18px]">error</span>
                                    <p className="text-[11px] font-bold text-[#ff3b30] leading-snug">{formError || error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-[#1d1d1f] disabled:opacity-40 text-white rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-black transition-all press-scale shadow-xl shadow-black/10 flex items-center justify-center gap-2 mt-4"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isLoginMode ? t('login.submit') : t('login.submitRegister')}
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer Controls */}
                    <div className="flex flex-col items-center gap-6 stagger-item">
                        <button
                            onClick={toggleMode}
                            className="text-[13px] font-bold text-[#0066cc] hover:underline"
                        >
                            {isLoginMode ? t('login.switchToRegister') : t('login.switchToLogin')}
                        </button>

                        <div className="w-full flex items-center gap-4">
                            <div className="flex-1 h-px bg-[#d2d2d7]/40" />
                            <span className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{t('login.or')}</span>
                            <div className="flex-1 h-px bg-[#d2d2d7]/40" />
                        </div>

                        <div className="w-full grid grid-cols-2 gap-3">
                             {isZh ? (
                                <>
                                    <button className="h-12 bg-white border border-black/5 rounded-xl flex items-center justify-center gap-3 hover:shadow-md transition-all press-scale">
                                         <div className="w-6 h-6 bg-[#07C160] rounded-md flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[14px]">chat</span>
                                         </div>
                                         <span className="text-[12px] font-bold">WeChat</span>
                                    </button>
                                    <button className="h-12 bg-white border border-black/5 rounded-xl flex items-center justify-center gap-3 hover:shadow-md transition-all press-scale">
                                         <div className="w-6 h-6 bg-[#1677FF] rounded-md flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[14px]">account_balance_wallet</span>
                                         </div>
                                         <span className="text-[12px] font-bold">Alipay</span>
                                    </button>
                                </>
                             ) : (
                                <>
                                    <button className="h-12 bg-white border border-black/5 rounded-xl flex items-center justify-center gap-3 hover:shadow-md transition-all press-scale">
                                         <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                         <span className="text-[12px] font-bold">Google</span>
                                    </button>
                                    <button className="h-12 bg-black rounded-xl flex items-center justify-center gap-3 hover:shadow-xl transition-all press-scale">
                                         <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.66 4.26-3.74 4.25z" /></svg>
                                         <span className="text-[12px] font-bold text-white">Apple</span>
                                    </button>
                                </>
                             )}
                        </div>

                        <div className="pt-8 w-full border-t border-[#d2d2d7]/40 flex flex-col items-center gap-4">
                             <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">{isZh ? '专业人员入口' : 'PRO PORTAL'}</p>
                             <Link to="/repairman/login" className="flex items-center gap-2 group">
                                <span className="material-symbols-outlined text-[18px] text-[#86868b] group-hover:text-[#1d1d1f]">engineering</span>
                                <span className="text-[13px] font-black tracking-tight group-hover:underline">{isZh ? '师傅端登录' : 'Repairman Sign In'}</span>
                                <span className="material-symbols-outlined text-sm text-[#86868b] group-hover:translate-x-1 transition-transform">chevron_right</span>
                             </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
