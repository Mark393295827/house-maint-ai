import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import * as db from '../config/database.js';
import jwt from 'jsonwebtoken';
// We need to import JWT_SECRET but it's not exported from auth middleware directly usually, 
// checking auth.ts... it exports JWT_SECRET.
import { JWT_SECRET } from '../middleware/auth.js';

// Mock DB to avoid real queries during auth middleware check if it did DB calls (it doesn't, just JWT verify)
// But endpoints might do DB calls. 
// For metrics endpoint, it uses in-memory object, so no DB calls needed!

describe('RBAC - Role Based Access Control', () => {

    // Helper to generate token
    const generateToken = (role: string) => {
        return jwt.sign(
            { id: 123, phone: '1234567890', role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
    };

    it('should allow admin to access metrics', async () => {
        const token = generateToken('admin');

        const res = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('system');
    });

    it('should deny manager access to metrics (admin only)', async () => {
        const token = generateToken('manager');

        const res = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('should deny user access to metrics', async () => {
        const token = generateToken('user');

        const res = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('should deny unauthenticated access', async () => {
        const res = await request(app)
            .get('/api/metrics');

        expect(res.status).toBe(401);
    });
});
