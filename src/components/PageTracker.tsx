
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Analytics from '../services/analytics';

const PageTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Track page view
        Analytics.track('Page View', {
            path: location.pathname,
            search: location.search
        });

        // Focus management: Move focus to the top of the content on route change
        // This helps screen reader users know the page has changed
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            window.scrollTo(0, 0);
        }
    }, [location]);

    return null;
};

export default PageTracker;
