import { vi, describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock Redis
vi.mock('../server/config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn(),
        on: vi.fn()
    }
}));

// Mock DB
vi.mock('../server/config/database.js', () => ({
    default: {
        query: vi.fn(async (text: string) => {
            if (text.trim().toUpperCase().startsWith('SELECT')) {
                return {
                    rows: [
                        { id: 1, name: 'Worker A', rating: 5, latitude: 39.9, longitude: 116.4 },
                        { id: 2, name: 'Worker B', rating: 4, latitude: 39.8, longitude: 116.3 }
                    ],
                    rowCount: 2
                };
            }
            return { rows: [], rowCount: 0 };
        })
    }
}));

import app from '../server/index.js';
const TEST_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('Matching Logic API', () => {
    let userToken: string;

    beforeAll(() => {
        userToken = jwt.sign({ id: 1, role: 'user' }, TEST_SECRET);
    });

    it('should return matched workers for a report', async () => {
        const res = await request(app)
            .get('/api/v1/workers/match?latitude=40&longitude=116&category=plumbing')
            .set('Cookie', [`accessToken=${userToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data.matches)).toBe(true);
        expect(res.body.data.matches.length).toBeGreaterThan(0);
    });
});
