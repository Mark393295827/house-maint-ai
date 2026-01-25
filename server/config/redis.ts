import Redis from 'ioredis';
import * as Sentry from '@sentry/node';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    // Fail fast if Redis is down, don't retry indefinitely blocking requests
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    commandTimeout: 1000, // Fail commands after 1s if not connected
};

// Create Redis client
const redis = new Redis(redisConfig);

redis.on('error', (err) => {
    // Log connection errors but don't crash
    console.error('Redis connection error:', err);
    Sentry.captureException(err);
});

redis.on('connect', () => {
    console.log('Redis connected');
});

export default redis;
