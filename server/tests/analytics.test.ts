import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock redis to prevent connection errors
vi.mock('../config/redis.js', () => ({
    default: {
        get: async () => null,
        setex: async () => 'OK',
        del: async () => 1,
        on: () => { }
    }
}));

// Mock database — use plain async functions (no vi.fn needed for mock factory)
vi.mock('../config/database.js', () => {
    const queryImpl = async (text: string, _params?: any[]) => {
        const sql = text.trim().toUpperCase();

        if (sql.includes('AVG')) {
            return { rows: [{ avg_rating: 4.5 }], rowCount: 1 };
        }

        if (sql.includes('COUNT')) {
            return { rows: [{ count: 5 }], rowCount: 1 };
        }

        if (sql.includes('GROUP BY') || sql.includes('DATE')) {
            return {
                rows: [
                    { date: '2026-02-10', count: 3 },
                    { date: '2026-02-11', count: 5 }
                ],
                rowCount: 2
            };
        }

        return { rows: [], rowCount: 0 };
    };

    return {
        default: { query: queryImpl, on: () => { } },
        query: queryImpl,
        isSQLite: false
    };
});

import app from '../index.js';
import { JWT_SECRET } from '../middleware/auth.js';

describe('Analytics API', () => {

    const generateToken = (role: string) => {
        return jwt.sign(
            { id: 999, phone: '13899999999', role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
    };

    const adminToken = generateToken('admin');
    const userToken = generateToken('user');

    it('should be inaccessible to regular users', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    it('should return dashboard stats for admin', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('activeTickets');
        expect(typeof res.body.activeTickets).toBe('number');
    });

    it('should return ticket trends', async () => {
        const res = await request(app)
            .get('/api/analytics/tickets')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
