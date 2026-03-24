import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis.js';

const activeProcessing = new Set<string>();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

        const authUser = (req as any).user;
        const authScope = authUser ? `user:${authUser.id}:role:${authUser.role || 'unknown'}` : 'public';
        const key = `cache:${authScope}:${req.originalUrl || req.url}`;

        try {
            // Anti-stampede protection
            let attempts = 0;
            while (activeProcessing.has(key) && attempts < 20) {
                await sleep(50); // wait 50ms (max 1s)
                attempts++;
            }

            const cachedResponse = await (redis as any).get(key);

            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Lock this key so other concurrent requests wait
            activeProcessing.add(key);

            // Monkey patch res.json to capture body
            const originalJson = res.json;
            (res.json as any) = (body: any): Response => {
                // Restore original json function to avoid double-send issues if called multiple times
                res.json = originalJson;

                // Cache the response asynchronously
                if (res.statusCode === 200) {
                    const setexPromise = (redis as any).setex(key, duration, JSON.stringify(body));
                    if (setexPromise && typeof setexPromise.catch === 'function') {
                        setexPromise
                            .catch((err: any) => console.error('Redis save error:', err))
                            .finally(() => {
                                activeProcessing.delete(key);
                            });
                    } else {
                        // Support for synchronous or incomplete mocks in testing
                        activeProcessing.delete(key);
                    }
                } else {
                    activeProcessing.delete(key);
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
        const redisAny = redis as any;
        if (typeof redisAny.keys === 'function') {
            const searchPatterns = [
                `cache:${pattern}*`,     // legacy key format
                `cache:*:${pattern}*`,   // scoped key format
            ];

            const keysToDelete = new Set<string>();
            for (const p of searchPatterns) {
                const keys = await redisAny.keys(p);
                if (keys && keys.length > 0) {
                    keys.forEach((k: string) => keysToDelete.add(k));
                }
            }

            if (keysToDelete.size > 0) {
                await redisAny.del(...Array.from(keysToDelete));
            }
        }
    } catch (error) {
        console.error('Clear cache error:', error);
    }
};
