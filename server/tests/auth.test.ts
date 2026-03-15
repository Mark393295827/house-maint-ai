import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Auth API Integration', () => {
    const testUser = {
        name: 'Auth Test',
        phone: '13888888888',
        password: 'Password123!',
        role: 'user'
    };

    it('should register a new user via v1', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .set('X-CSRF-Token', 'test') // Bystanding CSRF for test env
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.user.phone).toBe(testUser.phone);
    });

    it('should login the user via v1', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                phone: testUser.phone,
                password: testUser.password
            });

        expect(res.status).toBe(200);
        expect(res.body.data.user.phone).toBe(testUser.phone);
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                phone: testUser.phone,
                password: 'wrong'
            });

        expect(res.status).toBe(401);
    });
});
