import { describe, it, expect, beforeEach, vi } from 'vitest';
import { patternCache } from '../services/patternCache.js';
import redis from '../config/redis.js';
import * as db from '../config/database.js';

// Mock DB and Redis
vi.mock('../config/redis.js', () => ({
    default: {
        setex: vi.fn(),
        get: vi.fn(),
        expire: vi.fn(),
    }
}));

vi.mock('../config/database.js', () => ({
    query: vi.fn(),
    default: { query: vi.fn() } // Default export if needed
}));

describe('PatternCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should save pattern to Redis and DB', async () => {
        const pattern = {
            problem_type: 'test_problem',
            context_signature: 'test_context',
            solution: { steps: ['step1'] },
        };

        (db.query as any).mockResolvedValue({ rowCount: 1 });
        (redis.setex as any).mockResolvedValue('OK');

        await patternCache.savePattern(pattern);

        expect(redis.setex).toHaveBeenCalled();
        expect(db.query).toHaveBeenCalled();
    });

    it('should retrieve pattern from Redis if available', async () => {
        const pattern = {
            problem_type: 'test_problem',
            context_signature: 'test_context',
            solution: { steps: ['step1'] },
        };

        (redis.get as any).mockResolvedValue(JSON.stringify(pattern));

        const result = await patternCache.getPattern('test_problem', 'test_context');

        expect(result).toEqual(pattern);
        expect(result).toEqual(pattern);

        // Use calls argument checking to ensure no SELECT occurred
        const calls = (db.query as any).mock.calls;
        const selectCalls = calls.filter((call: any[]) => call[0].trim().toUpperCase().startsWith('SELECT'));
        expect(selectCalls).toHaveLength(0);
    });

    it('should retrieve pattern from DB if not in Redis', async () => {
        const pattern = {
            problem_type: 'test_problem',
            context_signature: 'test_context',
            solution: { steps: ['step1'] },
            success_rate: 1.0,
            usage_count: 1,
            last_used: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        (redis.get as any).mockResolvedValue(null); // Cache miss
        (db.query as any).mockResolvedValue({ rows: [pattern], rowCount: 1 });

        const result = await patternCache.getPattern('test_problem', 'test_context');

        // result.solution might be parsed from string if DB driver returns string
        // but here we mock it as object, so it should be object.
        expect(result).toMatchObject({
            problem_type: 'test_problem',
            context_signature: 'test_context'
        });
        expect(redis.setex).toHaveBeenCalled(); // Should populate cache
    });
});
