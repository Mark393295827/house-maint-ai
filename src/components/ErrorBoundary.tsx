import React, { Component } from 'react';
import PropTypes from 'prop-types';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary - 全局错误边界组件
 * 
 * 捕获子组件的 JavaScript 错误，防止整个应用崩溃。
 * 提供友好的错误提示和重试选项。
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // 更新 state 使下一次渲染能够显示降级后的 UI
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 将错误信息记录到错误报告服务
        this.setState({ errorInfo });

        // TODO: 接入错误监控服务 (Sentry, LogRocket 等)
        if (import.meta.env.MODE === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = '/house-maint-ai/';
    };

    render() {
        if (this.state.hasError) {
            // 自定义降级 UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
                    <div className="max-w-md w-full bg-white dark:bg-surface-dark rounded-2xl shadow-lg p-6 text-center">
                        {/* 错误图标 */}
                        <div className="w-16 h-16 mx-auto mb-4 bg-danger/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-danger">
                                error_outline
                            </span>
                        </div>

                        {/* 错误标题 */}
                        <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-2">
                            出现了一些问题
                        </h1>

                        {/* 错误描述 */}
                        <p className="text-text-sub-light dark:text-text-sub-dark mb-6">
                            抱歉，页面加载时发生错误。请尝试重试或返回首页。
                        </p>

                        {/* 开发环境显示错误详情 */}
                        {import.meta.env.MODE === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm text-danger font-medium mb-2">
                                    查看错误详情
                                </summary>
                                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-auto max-h-40 text-text-sub-light dark:text-text-sub-dark">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-text-main-light dark:text-text-main-dark font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                返回首页
                            </button>
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 py-3 px-4 rounded-xl bg-action-primary text-white font-medium hover:bg-action-primary-dark transition-colors"
                            >
                                重试
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    /** Child components to render */
    children: PropTypes.node.isRequired,
    /** Custom fallback UI to show on error */
    fallback: PropTypes.node,
};

export default ErrorBoundary;

