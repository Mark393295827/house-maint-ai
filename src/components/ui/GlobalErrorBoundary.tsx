import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // Here you would typically send to Sentry
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-6">
                        <span className="material-symbols-outlined text-6xl text-red-500">
                            error_outline
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">
                        Use the reload button below to try again. If the problem persists, please contact support.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-transform active:scale-95"
                    >
                        Reload Application
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left overflow-auto max-w-lg w-full max-h-60 text-xs font-mono">
                            <p className="text-red-500 font-bold mb-2">{this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
