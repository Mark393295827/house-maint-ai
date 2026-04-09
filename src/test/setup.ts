import { afterEach, vi } from 'vitest';
import React from 'react';

// Mock Router Context
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    Link: ({ children }: any) => React.createElement('a', {}, children),
    BrowserRouter: ({ children }: any) => React.createElement('div', { 'data-testid': 'router' }, children)
}));

// Mock Toast Context
vi.mock('../contexts/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn(), toasts: [] }),
    ToastProvider: ({ children }: any) => React.createElement('div', { 'data-testid': 'toast-provider' }, children)
}));

// Mock Auth Context
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ 
        user: { id: 1, name: 'Test User', role: 'user', phone: '13800138001' }, 
        login: vi.fn(), 
        logout: vi.fn(), 
        loading: false 
    }),
    AuthProvider: ({ children }: any) => React.createElement('div', { 'data-testid': 'auth-provider' }, children)
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: [], isLoading: false, error: null, isError: false }),
    useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    useQueryClient: () => ({ invalidateQueries: vi.fn(), getQueryData: vi.fn(), setQueryData: vi.fn() }),
    QueryClientProvider: ({ children }: any) => React.createElement('div', { 'data-testid': 'query-provider' }, children)
}));

// Only load DOM-related setup in browser-like environments
if (typeof window !== 'undefined') {
    // Dynamic import to prevent loading in Node environment
    import('@testing-library/jest-dom/vitest');
    import('@testing-library/react').then(({ cleanup }) => {
        // Cleanup after each test
        afterEach(() => {
            cleanup();
        });
    });
}
