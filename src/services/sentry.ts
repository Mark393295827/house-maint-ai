
import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for Frontend
 */
export const initSentry = () => {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        // Tracing - 10% in production, 100% in development
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        // Session Replay
        replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        replaysOnErrorSampleRate: 1.0,
    });
};
