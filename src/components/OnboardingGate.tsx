import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../pages/Dashboard';
import LoadingSpinner from './LoadingSpinner';

/**
 * OnboardingGate — Routes unauthenticated users to /welcome
 * instead of showing an empty dashboard. Also routes workers to their dashboard.
 */
const OnboardingGate = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/welcome" replace />;
    }

    if (user?.role === 'worker' || user?.role === 'admin') {
        return <Navigate to="/worker/dashboard" replace />;
    }

    return <Dashboard />;
};

export default OnboardingGate;
