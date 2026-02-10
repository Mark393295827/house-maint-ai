import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

describe('Analytics API', () => {

    // Helper to generate token
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
        // Values might be 0 if DB is empty, but structure should exist
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
