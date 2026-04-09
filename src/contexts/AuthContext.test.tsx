import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const { apiMock, connectSocketMock, disconnectSocketMock } = vi.hoisted(() => {
    return {
        apiMock: {
            getCurrentUser: vi.fn(),
            login: vi.fn(),
            register: vi.fn(),
            registerWorker: vi.fn(),
            logout: vi.fn(),
            updateProfile: vi.fn(),
            refreshCsrfToken: vi.fn(),
        },
        connectSocketMock: vi.fn(),
        disconnectSocketMock: vi.fn(),
    };
});

vi.mock('../services/api', () => ({
    default: apiMock,
}));

vi.mock('../services/socket', () => ({
    connectSocket: connectSocketMock,
    disconnectSocket: disconnectSocketMock,
}));

function AuthProbe() {
    const auth = useAuth();

    return (
        <div>
            <div data-testid="user">{auth.user?.name ?? 'guest'}</div>
            <div data-testid="loading">{String(auth.isLoading)}</div>
            <div data-testid="error">{auth.error ?? ''}</div>
            <button onClick={() => auth.login('13812345678', 'Password123')} type="button">
                login
            </button>
            <button onClick={() => auth.register('13812345678', 'Password123', 'Worker Zhang', 'worker')} type="button">
                register-worker
            </button>
            <button onClick={() => auth.logout()} type="button">
                logout
            </button>
        </div>
    );
}

function renderAuthProvider() {
    return render(
        <AuthProvider>
            <AuthProbe />
        </AuthProvider>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        apiMock.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
        apiMock.login.mockResolvedValue({ user: { id: 1, name: 'Li Lei', phone: '13812345678', role: 'user' } });
        apiMock.register.mockResolvedValue({ user: { id: 2, name: 'Worker Zhang', phone: '13812345678', role: 'worker' } });
        apiMock.registerWorker.mockResolvedValue({ worker: { id: 1, user_id: 2, skills: ['general'] } });
        apiMock.logout.mockResolvedValue(undefined);
        apiMock.updateProfile.mockResolvedValue({ user: { id: 1, name: 'Updated', phone: '13812345678', role: 'user' } });
        apiMock.refreshCsrfToken.mockResolvedValue(undefined);
    });

    it('hydrates an existing session on mount and connects the socket', async () => {
        apiMock.getCurrentUser.mockResolvedValueOnce({
            user: { id: 1, name: 'Li Lei', phone: '13812345678', role: 'user' },
        });

        renderAuthProvider();

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('Li Lei');
        });

        expect(connectSocketMock).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('wasLoggedIn')).toBe('true');
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('shows a session-expired error when a remembered session can no longer be restored', async () => {
        sessionStorage.setItem('wasLoggedIn', 'true');

        renderAuthProvider();

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });

        expect(screen.getByTestId('error')).toHaveTextContent('Session expired. Please log in again.');
        expect(connectSocketMock).not.toHaveBeenCalled();
    });

    it('stores the login marker, connects the socket, and pre-warms CSRF after login', async () => {
        renderAuthProvider();

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });

        fireEvent.click(screen.getByText('login'));

        await waitFor(() => {
            expect(apiMock.login).toHaveBeenCalledWith('13812345678', 'Password123');
        });

        expect(connectSocketMock).toHaveBeenCalledTimes(1);
        expect(apiMock.refreshCsrfToken).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('wasLoggedIn')).toBe('true');
        expect(screen.getByTestId('user')).toHaveTextContent('Li Lei');
    });

    it('initializes a worker profile during worker registration and clears the session marker on logout', async () => {
        renderAuthProvider();

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });

        fireEvent.click(screen.getByText('register-worker'));

        await waitFor(() => {
            expect(apiMock.registerWorker).toHaveBeenCalledWith({ skills: ['general'] });
        });

        expect(screen.getByTestId('user')).toHaveTextContent('Worker Zhang');
        expect(sessionStorage.getItem('wasLoggedIn')).toBe('true');

        fireEvent.click(screen.getByText('logout'));

        await waitFor(() => {
            expect(apiMock.logout).toHaveBeenCalledTimes(1);
        });

        expect(disconnectSocketMock).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('wasLoggedIn')).toBeNull();
        expect(screen.getByTestId('user')).toHaveTextContent('guest');
    });
});
