import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import redis from '../config/redis.js';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Custom strictly-authenticated rate limiter targeting req.user.id
 * Uses the custom Redis connection. Fails open on Redis errors.
 */
export const userRateLimiter = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) return next(); // Fallback to IP limiters for unauthenticated requests

        const key = `ratelimit:user:${userId}`;
        const limit = isDev ? 1000 : 50; // 50 requests per minute
        const windowSecs = 60;

        // Pseudo-atomic INCR
        const currentCount = await redis.incr(key);

        if (currentCount === 1) {
            await redis.expire(key, windowSecs);
        }

        if (currentCount > limit) {
            res.status(429).json({ error: 'Too many requests from this user, please try again later.' });
            return;
        }

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentCount));

        next();
    } catch (err) {
        // Fail-open strategy to prevent single point of failure
        console.error('Redis Rate Limiting Error:', err);
        next();
    }
};
