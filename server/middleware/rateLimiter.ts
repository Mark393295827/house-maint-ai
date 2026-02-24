
import rateLimit from 'express-rate-limit';

/**
 * Standard Rate Limiter
 * 100 requests per 15 minutes per IP
 */
// Helper to determine limit based on environment
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Standard Rate Limiter
 * 100 requests per 15 minutes per IP (1000 in dev)
 */
export const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 2000 : 100,
    message: {
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict Rate Limiter (for Auth and AI)
 * 20 requests per 15 minutes per IP (200 in dev)
 */
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 500 : 20,
    message: {
        error: 'Too many requests for this strict endpoint, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
