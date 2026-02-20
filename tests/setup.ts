
import { vi } from 'vitest';


// Enable In-Memory Redis Mock
process.env.REDIS_MOCK = 'true';
console.log('SETUP: REDIS_MOCK set to', process.env.REDIS_MOCK);
process.env.NODE_ENV = 'test';
process.env.DB_USE_SQLITE = 'true';
process.env.SQLITE_DB_PATH = ':memory:';
delete process.env.DB_HOST; // Ensure fallback

// Global mock for ioredis
vi.mock('ioredis', () => {
    const EventEmitter = require('events');
    class CheckRedis extends EventEmitter {
        constructor() {
            super();
            // Avoid immediate emit to prevent race conditions if listeners aren't attached yet
            setImmediate(() => this.emit('connect'));
        }
        async get() { return null; }
        async setex() { return 'OK'; }
        async del() { return 1; }
        async quit() { return 'OK'; }
        // Return this for chaining
        on(event: string, cb: any) {
            if (event === 'connect') cb();
            return this;
        }
    }
    return { default: CheckRedis };
});
