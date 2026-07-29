import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('Authentication Flow Integration', () => {
    const user = {
        name: 'Flow User',
        phone: '13999999999',
        password: 'Password123!'
    };

    it('represents an anonymous browser session without an expected 401', async () => {
        const sessionRes = await request(app).get('/api/v1/auth/session');

        expect(sessionRes.status).toBe(200);
        expect(sessionRes.body.data.user).toBeNull();
    });

    it('should complete a full register -> login -> profile flow', async () => {
        // 1. Register
        const regRes = await request(app)
            .post('/api/v1/auth/register')
            .set('X-CSRF-Token', 'test')
            .send(user);
        expect(regRes.status).toBe(201);

        // 2. Login
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ phone: user.phone, password: user.password });
        expect(loginRes.status).toBe(200);
        
        const cookies = loginRes.get('Set-Cookie') as string[];
        expect(cookies).toBeDefined();

        // 3. Get profile
        const profileRes = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', cookies);
        
        expect(profileRes.status).toBe(200);
        expect(profileRes.body.data.user.phone).toBe(user.phone);

        // 4. Logout
        const logoutRes = await request(app)
            .post('/api/v1/auth/logout')
            .set('Cookie', cookies);
        expect(logoutRes.status).toBe(200);
    });
});
