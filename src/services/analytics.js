
import mixpanel from 'mixpanel-browser';

/**
 * Analytics Service (Mixpanel)
 */
const Analytics = {
    /**
     * Initialize Mixpanel
     */
    init: () => {
        const token = import.meta.env.VITE_MIXPANEL_TOKEN;
        if (token) {
            mixpanel.init(token, {
                debug: import.meta.env.DEV,
                track_pageview: true,
                persistence: 'localStorage',
            });
        } else {
            console.warn('Mixpanel Token not found. Analytics disabled.');
        }
    },

    /**
     * Track an event
     * @param {string} name - Event name
     * @param {object} props - Event properties
     */
    track: (name, props = {}) => {
        if (import.meta.env.VITE_MIXPANEL_TOKEN) {
            mixpanel.track(name, props);
        } else {
            if (import.meta.env.DEV) {
                console.log(`[Analytics] Track: ${name}`, props);
            }
        }
    },

    /**
     * Identify a user
     * @param {string} id - User ID
     * @param {object} data - User properties
     */
    identify: (id, data = {}) => {
        if (import.meta.env.VITE_MIXPANEL_TOKEN) {
            mixpanel.identify(id);
            if (Object.keys(data).length > 0) {
                mixpanel.people.set(data);
            }
        } else {
            if (import.meta.env.DEV) {
                console.log(`[Analytics] Identify: ${id}`, data);
            }
        }
    }
};

export default Analytics;
