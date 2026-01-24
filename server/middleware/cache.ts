import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis.js';

/**
 * Cache middleware
 * @param duration Duration in seconds
 */
export const cacheMiddleware = (duration = 60) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redis.get(key);

            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Monkey patch res.json to capture body
            const originalJson = res.json;
            res.json = (body: any): Response => {
                // Restore original json function to avoid double-send issues if called multiple times
                res.json = originalJson;

                // Cache the response asynchronously
                // content-type check optionally? usually we assume json for API
                if (res.statusCode === 200) {
                    redis.setex(key, duration, JSON.stringify(body))
                        .catch(err => console.error('Redis save error:', err));
                }

                return originalJson.call(res, body);
            };

            next();
        } catch (error) {
            console.error('Cache error:', error);
            // Fallback to normal request processing if redis fails
            next();
        }
    };
};

/**
 * Helper to clear cache by pattern
 */
export const clearCache = async (pattern: string) => {
    try {
        const keys = await redis.keys(`cache:${pattern}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Clear cache error:', error);
    }
};
