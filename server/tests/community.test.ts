import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock redis to prevent connection errors
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        on: vi.fn()
    }
}));

// Mock database
vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn(async (text: string, params?: any[]) => {
            const sql = text.trim().toUpperCase();

            // Community posts query
            if (sql.includes('FROM POSTS') || sql.includes('COMMUNITY') || sql.includes('FROM USERS')) {
                return {
                    rows: [
                        { id: 1, title: 'Test Post', content: 'Hello', author_id: 1, author_name: 'User', created_at: new Date(), likes: 0, comments_count: 0 }
                    ],
                    rowCount: 1
                };
            }

            return { rows: [], rowCount: 0 };
        }),
        on: vi.fn()
    },
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    isSQLite: false
}));

import app from '../index.js';

describe('Community API', () => {
    it('should fetch posts', async () => {
        const res = await request(app).get('/api/community/posts');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.posts)).toBe(true);
    });
});
