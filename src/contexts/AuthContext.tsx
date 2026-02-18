import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import type { User, AuthContextValue, AuthResult } from '../types';

// Create the Auth Context
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth Provider Component
 * Manages global authentication state
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if user is authenticated on mount by calling /auth/me
    // The httpOnly cookie is sent automatically
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await api.getCurrentUser();
                setUser(data.user);
            } catch (_err) {
                // No valid cookie — user is not authenticated
                setUser(null);
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    // Login function
    const login = useCallback(async (phone: string, password: string): Promise<AuthResult> => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await api.login(phone, password);
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Register function
    const register = useCallback(async (phone: string, password: string, name: string): Promise<AuthResult> => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await api.register(phone, password, name);
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout function — calls server to clear httpOnly cookie
    const logout = useCallback(async () => {
        await api.logout();
        setUser(null);
        setError(null);
    }, []);

    // Update user info
    const updateUser = useCallback(async (data: { name?: string; avatar?: string }): Promise<AuthResult> => {
        try {
            const result = await api.updateProfile(data.name ?? '', data.avatar);
            setUser(result.user);
            return { success: true, user: result.user };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Update failed';
            return { success: false, error: message };
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: AuthContextValue = {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        updateUser,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to use auth context
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
