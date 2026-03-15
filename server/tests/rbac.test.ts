import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

describe('RBAC - Role Based Access Control', () => {
    const generateToken = (role: string) => {
        return jwt.sign(
            { id: Math.floor(Math.random() * 1000), phone: '13812345678', role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
    };

    const adminToken = generateToken('admin');
    const managerToken = generateToken('manager');
    const userToken = generateToken('user');

    it('should allow admin to access metrics', async () => {
        const res = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${adminToken}`]);
        
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('system');
    });

    it('should deny manager access to metrics (admin only)', async () => {
        const res = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${managerToken}`]);
        
        expect(res.status).toBe(403);
    });

    it('should deny user access to metrics', async () => {
        const res = await request(app)
            .get('/api/v1/metrics')
            .set('Cookie', [`accessToken=${userToken}`]);
        
        expect(res.status).toBe(403);
    });

    it('should deny unauthenticated access', async () => {
        const res = await request(app).get('/api/v1/metrics');
        expect(res.status).toBe(401);
    });
});
