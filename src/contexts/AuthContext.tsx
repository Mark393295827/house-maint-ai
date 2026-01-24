import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';

// Create the Auth Context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Manages global authentication state
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is authenticated on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (api.isAuthenticated()) {
                try {
                    const data = await api.getCurrentUser();
                    setUser(data.user);
                } catch (err) {
                    // Token expired or invalid
                    api.logout();
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    // Login function
    const login = useCallback(async (phone, password) => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await api.login(phone, password);
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Register function
    const register = useCallback(async (phone, password, name) => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await api.register(phone, password, name);
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout function
    const logout = useCallback(() => {
        api.logout();
        setUser(null);
        setError(null);
    }, []);

    // Update user info
    const updateUser = useCallback(async (data) => {
        try {
            const result = await api.updateProfile(data.name, data.avatar);
            setUser(result.user);
            return { success: true, user: result.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
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

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

/**
 * Custom hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
