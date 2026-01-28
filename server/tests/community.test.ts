import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock redis to prevent connection errors
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        on: vi.fn()
    }
}));
import app from '../index.js';

const runTests = process.env.CI || process.env.DB_HOST ? describe : describe.skip;

runTests('Community API', () => {
    it('should fetch posts', async () => {
        const res = await request(app).get('/api/community/posts');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.posts)).toBe(true);
    });
});
