import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, error, clearError, isLoading } = useAuth();
    const { showToast } = useToast();

    // Form state
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    // Get redirect path
    const from = location.state?.from?.pathname || '/';

    // Validate phone number (Chinese format)
    const validatePhone = (phone: string) => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        // Validate phone
        if (!validatePhone(phone)) {
            setFormError('请输入有效的手机号码');
            showToast('请输入有效的手机号码', 'warning');
            return;
        }

        // Validate password
        if (password.length < 6) {
            setFormError('密码至少需要6位');
            showToast('密码至少需要6位', 'warning');
            return;
        }

        // Validate name for registration
        if (!isLoginMode && !name.trim()) {
            setFormError('请输入您的姓名');
            showToast('请输入您的姓名', 'warning');
            return;
        }

        let result;
        try {
            if (isLoginMode) {
                result = await login(phone, password);
            } else {
                result = await register(phone, password, name);
            }

            if (result.success) {
                showToast(isLoginMode ? '登录成功' : '注册成功', 'success');
                navigate(from, { replace: true });
            } else {
                showToast(result.error || '操作失败', 'error');
            }
        } catch (err: any) {
            showToast(err.message || '网络错误，请稍后重试', 'error');
        }
    };

    // Toggle between login and register
    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setFormError('');
        clearError();
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col page-enter">
            {/* Header */}
            <div className="flex items-center justify-center pt-12 pb-6">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">home_repair_service</span>
                    </div>
                    <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                        House Maint AI
                    </h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center px-6 pt-8">
                <div className="w-full max-w-sm">
                    {/* Title */}
                    <div className="text-center mb-8 stagger-item">
                        <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mb-2">
                            {isLoginMode ? '欢迎回来' : '创建账号'}
                        </h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {isLoginMode ? 'Welcome back' : 'Create your account'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 stagger-item" style={{ animationDelay: '100ms' }}>
                        {/* Name field (register only) */}
                        {!isLoginMode && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="您的姓名"
                                    className="w-full h-14 pl-12 pr-4 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        {/* Phone field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">+86</span>
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                placeholder="手机号码"
                                className="w-full h-14 pl-14 pr-4 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Password field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="密码"
                                className="w-full h-14 pl-12 pr-12 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl text-text-main-light dark:text-text-main-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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

                        {/* Error message - Form Level */}
                        {(formError || error) && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                                <p className="text-sm text-red-600 dark:text-red-400">{formError || error}</p>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-primary hover:bg-primary-dark disabled:bg-gray-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>处理中...</span>
                                </>
                            ) : (
                                <>
                                    <span>{isLoginMode ? '登 录' : '注 册'}</span>
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle mode */}
                    <div className="text-center mt-6">
                        <button
                            onClick={toggleMode}
                            className="text-sm text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
                        >
                            {isLoginMode ? (
                                <>没有账号？<span className="font-bold text-primary">立即注册</span></>
                            ) : (
                                <>已有账号？<span className="font-bold text-primary">立即登录</span></>
                            )}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                        <span className="text-xs text-gray-400">或</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                    </div>

                    {/* Social login */}
                    <div className="flex gap-4">
                        <button className="flex-1 h-12 bg-[#07C160] hover:bg-[#06AD56] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors press-scale">
                            {/** SVG omitted for brevity, same as existing */}
                            <span>微信</span>
                        </button>
                        <button className="flex-1 h-12 bg-[#1677FF] hover:bg-[#0958D9] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors press-scale">
                            {/** SVG omitted for brevity, same as existing */}
                            <span>支付宝</span>
                        </button>
                    </div>

                    {/* Skip login */}
                    <div className="text-center mt-8 pb-8">
                        <Link
                            to="/"
                            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            跳过登录，先体验一下 →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
