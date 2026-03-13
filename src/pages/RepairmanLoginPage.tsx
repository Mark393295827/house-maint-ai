import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

const RepairmanLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, error, clearError, isLoading } = useAuth();
    const { showToast } = useToast();
    const { t, locale } = useLanguage();

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    const from = location.state?.from?.pathname || '/worker/dashboard';

    // Language-specific phone validation
    const validatePhone = (phone: string) => {
        if (locale === 'zh') {
            return /^1[3-9]\d{9}$/.test(phone);
        }
        // EN: accept 10+ digit international format
        return /^\d{10,15}$/.test(phone);
    };

    const phoneMaxLength = locale === 'zh' ? 11 : 15;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        if (!validatePhone(phone)) {
            setFormError(t('login.error.invalidPhone') || 'Invalid phone number');
            showToast(t('login.error.invalidPhone') || 'Invalid phone number', 'warning');
            return;
        }
        if (password.length < 6) {
            setFormError(t('login.error.passwordShort') || 'Password too short');
            showToast(t('login.error.passwordShort') || 'Password too short', 'warning');
            return;
        }
        if (!isLoginMode && !name.trim()) {
            setFormError(t('login.error.nameRequired') || 'Name is required');
            showToast(t('login.error.nameRequired') || 'Name is required', 'warning');
            return;
        }

        try {
            const result = isLoginMode
                ? await login(phone, password)
                : await (register as any)(phone, password, name, 'worker'); 

            if (result.success) {
                showToast(isLoginMode ? (t('login.error.loginSuccess') || 'Login successful') : (t('login.error.registerSuccess') || 'Registration successful'), 'success');
                navigate(from, { replace: true });
            } else {
                showToast(result.error || (t('login.error.genericFail') || 'Action failed'), 'error');
            }
        } catch (err: any) {
            showToast(err.message || (t('login.error.networkError') || 'Network error'), 'error');
        }
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setFormError('');
        clearError();
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col page-enter relative overflow-hidden text-white">
            {/* Dark theme ambient orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/10 blur-[100px]" />

            {/* Language toggle */}
            <div className="absolute top-4 right-4 z-20">
                <LanguageToggle />
            </div>

            {/* Header / Portal Identity */}
            <div className="relative z-10 flex flex-col items-center pt-16 pb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4 animate-float">
                    <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>engineering</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    {locale === 'zh' ? '师傅端门户' : 'Repairman Portal'}
                </h1>
                <p className="text-blue-400 font-medium text-sm tracking-widest mt-1 uppercase">
                    House Maint AI 专业版
                </p>
            </div>

            {/* Form Card */}
            <div className="relative z-10 flex-1 flex flex-col items-center px-6 pt-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10 stagger-item">
                        <h2 className="text-2xl font-bold mb-2">
                            {isLoginMode 
                                ? (locale === 'zh' ? '欢迎回来，师傅' : 'Welcome back, Worker') 
                                : (locale === 'zh' ? '入驻平台' : 'Join the Platform')}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {isLoginMode 
                                ? (locale === 'zh' ? '登录以接单并管理您的工作' : 'Sign in to accept jobs and manage your work')
                                : (locale === 'zh' ? '开启您的专业维修事业' : 'Start your professional repair career')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 stagger-item">
                        {!isLoginMode && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <span className="material-symbols-outlined text-xl">person</span>
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('login.namePlaceholder') || 'Full Name'}
                                    className="w-full h-14 pl-12 pr-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all hover:bg-slate-800/80"
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <span className="text-sm font-bold">{t('login.phonePrefix') || '+86'}</span>
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength))}
                                placeholder={t('login.phonePlaceholder') || 'Phone Number'}
                                className="w-full h-14 pl-14 pr-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all hover:bg-slate-800/80"
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <span className="material-symbols-outlined text-xl">lock</span>
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('login.passwordPlaceholder') || 'Password'}
                                className="w-full h-14 pl-12 pr-12 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all hover:bg-slate-800/80"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>

                        {(formError || error) && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-shake">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                <p className="text-sm text-red-400 font-medium">{formError || error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isLoginMode ? (locale === 'zh' ? '登录师傅端' : 'Worker Login') : (locale === 'zh' ? '立即入驻' : 'Join Now')}</span>
                                    <span className="material-symbols-outlined">bolt</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-8">
                        <button
                            onClick={toggleMode}
                            className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                        >
                            {isLoginMode ? (
                                <>{locale === 'zh' ? '还没有账号？' : "Don't have an account? "}<span className="text-blue-500 font-bold ml-1">{locale === 'zh' ? '立即入驻' : 'Join Platform'}</span></>
                            ) : (
                                <>{locale === 'zh' ? '已有师傅账号？' : 'Already have a worker account? '}<span className="text-blue-500 font-bold ml-1">{locale === 'zh' ? '立即登录' : 'Sign In'}</span></>
                            )}
                        </button>
                    </div>

                    <div className="mt-12 text-center pb-8 border-t border-slate-800 pt-8">
                        <Link
                            to="/login"
                            className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 group"
                        >
                            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            {locale === 'zh' ? '返回普通用户登录' : 'Back to User Login'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RepairmanLoginPage;
