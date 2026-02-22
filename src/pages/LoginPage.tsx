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

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    const from = location.state?.from?.pathname || '/';

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
            setFormError(t('login.error.invalidPhone'));
            showToast(t('login.error.invalidPhone'), 'warning');
            return;
        }
        if (password.length < 6) {
            setFormError(t('login.error.passwordShort'));
            showToast(t('login.error.passwordShort'), 'warning');
            return;
        }
        if (!isLoginMode && !name.trim()) {
            setFormError(t('login.error.nameRequired'));
            showToast(t('login.error.nameRequired'), 'warning');
            return;
        }

        try {
            const result = isLoginMode
                ? await login(phone, password)
                : await register(phone, password, name);

            if (result.success) {
                showToast(isLoginMode ? t('login.error.loginSuccess') : t('login.error.registerSuccess'), 'success');
                navigate(from, { replace: true });
            } else {
                showToast(result.error || t('login.error.genericFail'), 'error');
            }
        } catch (err: any) {
            showToast(err.message || t('login.error.networkError'), 'error');
        }
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setFormError('');
        clearError();
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col page-enter relative overflow-hidden">
            {/* Ambient gradient orbs */}
            <div className="absolute top-[-15%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-primary/8 dark:bg-primary/5 blur-3xl" />
            <div className="absolute bottom-[-15%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-accent/8 dark:bg-accent/5 blur-3xl" />

            {/* Language toggle — top right */}
            <div className="absolute top-4 right-4 z-20">
                <LanguageToggle />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-center pt-16 pb-8">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>home_repair_service</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-text-main-light dark:text-text-main-dark font-display">
                        House Maint AI
                    </h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center px-6 pt-4">
                <div className="w-full max-w-sm">
                    {/* Title */}
                    <div className="text-center mb-8 stagger-item">
                        <h2 className="text-3xl font-extrabold text-text-main-light dark:text-text-main-dark font-display mb-1">
                            {isLoginMode ? t('login.title') : t('login.titleRegister')}
                        </h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {isLoginMode ? t('login.subtitle') : t('login.subtitleRegister')}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 stagger-item" style={{ animationDelay: '100ms' }}>
                        {!isLoginMode && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('login.namePlaceholder')}
                                    className="w-full h-14 pl-12 pr-4 glass dark:glass-dark rounded-2xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('login.phonePrefix')}</span>
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength))}
                                placeholder={t('login.phonePlaceholder')}
                                className="w-full h-14 pl-14 pr-4 glass dark:glass-dark rounded-2xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('login.passwordPlaceholder')}
                                className="w-full h-14 pl-12 pr-12 glass dark:glass-dark rounded-2xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                <span className="material-symbols-outlined text-gray-400 text-xl hover:text-gray-600 transition-colors">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>

                        {(formError || error) && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                                <p className="text-sm text-red-600 dark:text-red-400">{formError || error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 btn-gradient disabled:opacity-50 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>{t('login.processing')}</span>
                                </>
                            ) : (
                                <>
                                    <span>{isLoginMode ? t('login.submit') : t('login.submitRegister')}</span>
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <button
                            onClick={toggleMode}
                            className="text-sm text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
                        >
                            {isLoginMode ? (
                                <>{t('login.switchToRegister')}<span className="font-bold gradient-text">{t('login.switchToRegisterCta')}</span></>
                            ) : (
                                <>{t('login.switchToLogin')}<span className="font-bold gradient-text">{t('login.switchToLoginCta')}</span></>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                        <span className="text-xs text-gray-400">{t('login.or')}</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    {/* Language-specific social login buttons */}
                    {locale === 'zh' ? (
                        <div className="flex gap-3">
                            <button className="flex-1 h-12 bg-[#07C160] hover:bg-[#06AD56] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors press-scale shadow-lg shadow-[#07C160]/20">
                                <span>{t('login.socialWechat')}</span>
                            </button>
                            <button className="flex-1 h-12 bg-[#1677FF] hover:bg-[#0958D9] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors press-scale shadow-lg shadow-[#1677FF]/20">
                                <span>{t('login.socialAlipay')}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button className="flex-1 h-12 bg-white hover:bg-gray-50 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors press-scale shadow-md border border-gray-200 dark:border-white/10">
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                <span>{t('login.socialGoogle')}</span>
                            </button>
                            <button className="flex-1 h-12 bg-black hover:bg-gray-900 text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors press-scale shadow-lg">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.66 4.26-3.74 4.25z" /></svg>
                                <span>{t('login.socialApple')}</span>
                            </button>
                        </div>
                    )}

                    <div className="text-center mt-8 pb-8">
                        <Link
                            to="/"
                            className="text-sm text-gray-400 hover:text-primary transition-colors"
                        >
                            {t('login.skip')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
