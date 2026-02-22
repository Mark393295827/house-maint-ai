import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../pages/Dashboard';
import LoadingSpinner from './LoadingSpinner';

/**
 * OnboardingGate — Routes unauthenticated users to /welcome
 * instead of showing an empty dashboard.
 */
const OnboardingGate = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/welcome" replace />;
    }

    return <Dashboard />;
};

export default OnboardingGate;
