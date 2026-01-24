
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Analytics from '../services/analytics';

const PageTracker = () => {
    const location = useLocation();

    useEffect(() => {
        Analytics.track('Page View', {
            path: location.pathname,
            search: location.search
        });
    }, [location]);

    return null;
};

export default PageTracker;
