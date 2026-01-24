import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';

// Skip tests if DB is not available
const runTests = process.env.CI || process.env.DB_HOST ? describe : describe.skip;

runTests('Auth API', () => {
    const testUser = {
        phone: '13800138000',
        password: 'password123',
        name: 'Test User'
    };

    // Clean up before tests
    beforeAll(async () => {
        try {
            await db.query('DELETE FROM users WHERE phone = $1', [testUser.phone]);
        } catch (e) {
            console.log('Cleanup error (ignored):', e);
        }
    });

    afterAll(async () => {
        try {
            await db.query('DELETE FROM users WHERE phone = $1', [testUser.phone]);
        } catch (e) {
            console.log('Cleanup error (ignored):', e);
        }
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('phone', testUser.phone);
    });

    it('should login the user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                phone: testUser.phone,
                password: testUser.password
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                phone: testUser.phone,
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
    });
});
