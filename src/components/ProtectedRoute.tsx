import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
    children: ReactNode;
    /** If set, only these roles may access the route */
    allowedRoles?: UserRole[];
}

/**
 * Protected Route Component
 * Redirects unauthenticated users to login page.
 * Optionally enforces role-based access.
 */
function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading while checking auth status
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role guard: redirect to the correct home if role is not allowed
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const target = user.role === 'worker' ? '/worker/dashboard' : '/';
        return <Navigate to={target} replace />;
    }

    return children;
}

export default ProtectedRoute;
