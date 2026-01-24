import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, error, clearError, isLoading } = useAuth();

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
    const validatePhone = (phone) => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        clearError();

        // Validate phone
        if (!validatePhone(phone)) {
            setFormError('请输入有效的手机号码');
            return;
        }

        // Validate password
        if (password.length < 6) {
            setFormError('密码至少需要6位');
            return;
        }

        // Validate name for registration
        if (!isLoginMode && !name.trim()) {
            setFormError('请输入您的姓名');
            return;
        }

        let result;
        if (isLoginMode) {
            result = await login(phone, password);
        } else {
            result = await register(phone, password, name);
        }

        if (result.success) {
            navigate(from, { replace: true });
        }
    };

    // Toggle between login and register
    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setFormError('');
        clearError();
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
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
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mb-2">
                            {isLoginMode ? '欢迎回来' : '创建账号'}
                        </h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            {isLoginMode ? 'Welcome back' : 'Create your account'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        {/* Error message */}
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
                        <button className="flex-1 h-12 bg-[#07C160] hover:bg-[#06AD56] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18z" />
                                <path d="M23.997 14.127c0-3.26-3.128-5.91-6.993-5.91-3.865 0-6.994 2.65-6.994 5.91 0 3.262 3.129 5.91 6.994 5.91.779 0 1.518-.129 2.27-.308a.67.67 0 0 1 .54.078l1.44.845a.253.253 0 0 0 .126.041.221.221 0 0 0 .22-.223c0-.055-.022-.109-.037-.162l-.294-1.121a.45.45 0 0 1 .161-.503c1.469-1.08 2.567-2.751 2.567-4.557zm-9.9-1.174a.933.933 0 0 1-.93-.944c0-.518.416-.94.93-.94s.932.422.932.94-.418.944-.932.944zm5.815 0a.933.933 0 0 1-.931-.944c0-.518.415-.94.93-.94.517 0 .932.422.932.94s-.415.944-.931.944z" />
                            </svg>
                            <span>微信</span>
                        </button>
                        <button className="flex-1 h-12 bg-[#1677FF] hover:bg-[#0958D9] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10.565 2c-.232 0-.463.009-.693.03-4.058.356-7.307 3.617-7.84 7.46-.186 1.347-.09 2.682.285 3.943.254.854.635 1.66 1.133 2.39l-1.37 4.076c-.092.273.164.53.434.435l4.04-1.384c1.545.773 3.29 1.121 5.076.97 4.233-.36 7.665-3.607 8.18-7.634.605-4.73-2.846-9.136-7.722-10.032a10.185 10.185 0 0 0-1.523-.254zM6.29 9.294h3.688c.29 0 .29.437 0 .437H6.29c-.29 0-.29-.437 0-.437zm0 1.563h5.812c.29 0 .29.438 0 .438H6.29c-.29 0-.29-.438 0-.438zm0 1.563h4.75c.29 0 .29.437 0 .437H6.29c-.29 0-.29-.437 0-.437z" />
                            </svg>
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
