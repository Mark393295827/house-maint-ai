
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Analytics from '../services/analytics';

const PageTracker = () => {
    const { pathname, search } = useLocation();

    useEffect(() => {
        // Track page view
        Analytics.track('Page View', {
            path: pathname,
            search,
        });

        // Focus management: Move focus to the top of the content on route change
        // This helps screen reader users know the page has changed
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            window.scrollTo(0, 0);
        }
    }, [pathname, search]);

    return null;
};

export default PageTracker;
