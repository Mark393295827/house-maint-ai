import Redis from 'ioredis';
import * as Sentry from '@sentry/node';
import { EventEmitter } from 'events';

class InMemoryRedis extends EventEmitter {
    private store: Map<string, string>;

    constructor() {
        super();
        this.store = new Map();
        console.warn('⚠️  Using In-Memory Redis Mock (Data will be lost on restart)');
        // Simulate immediate connection
        setTimeout(() => this.emit('connect'), 10);
    }

    async get(key: string): Promise<string | null> {
        return this.store.get(key) || null;
    }

    async setex(key: string, seconds: number, value: string): Promise<string> {
        this.store.set(key, value);
        // Basic TTL implementation
        setTimeout(() => {
            this.store.delete(key);
        }, seconds * 1000);
        return 'OK';
    }

    async del(key: string): Promise<number> {
        const deleted = this.store.delete(key);
        return deleted ? 1 : 0;
    }

    // Add other necessary methods as no-ops or basic implementations
    async quit(): Promise<string> {
        return 'OK';
    }

    async expire(key: string, seconds: number): Promise<number> {
        // Mock implementation: just return 1 (success)
        // In a real mock we might set a timeout to delete, but setex already does that.
        // This is mostly to satisfy the interface.
        return 1;
    }
}

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    commandTimeout: 1000,
};

let redis: Redis | InMemoryRedis;

// Determine whether to use real Redis or Mock
const useMock = process.env.REDIS_MOCK === 'true' ||
    (process.env.NODE_ENV !== 'production' && !process.env.REDIS_HOST && !process.env.DOCKER_ENV);

console.log('REDIS CONFIG: useMock=', useMock, 'REDIS_MOCK=', process.env.REDIS_MOCK);

if (useMock) {
    redis = new InMemoryRedis() as any;
} else {
    redis = new Redis(redisConfig);

    redis.on('error', (err) => {
        console.error('Redis connection error:', err);
        Sentry.captureException(err);
    });

    redis.on('connect', () => {
        console.log('Redis connected');
    });
}

export default redis;
