import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';

// Mock everything first
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        on: vi.fn()
    }
}));

vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn(async (text: string) => {
            if (text.toUpperCase().includes('FROM POSTS')) {
                return {
                    rows: [{ id: 1, title: 'T', content: 'C', author_name: 'A', tags: '[]' }],
                    rowCount: 1
                };
            }
            return { rows: [], rowCount: 0 };
        })
    }
}));

import app from '../index.js';

describe('Community API Integration', () => {
    it('should fetch posts via v1 path', async () => {
        const res = await request(app).get('/api/v1/community/posts');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data.posts)).toBe(true);
    });
});
