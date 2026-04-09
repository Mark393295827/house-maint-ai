import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Helper to render components with Router context
export function renderWithRouter(Component: React.ReactNode, options: Record<string, unknown> = {}) {
    return render(
        <BrowserRouter>
            {Component}
        </BrowserRouter>,
        options
    );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';

export function renderWithProviders(Component: React.ReactNode, options: Record<string, unknown> = {}) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <BrowserRouter>
                        {Component}
                    </BrowserRouter>
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>,
        options
    );
}

// Mock localStorage
export const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
