import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('Refresh Token Flow Integration', () => {
    const user = {
        name: 'Refresh User',
        phone: '13777777777',
        password: 'Password123!'
    };

    it('should refresh access token using refresh token cookie', async () => {
        // 1. Register & Login
        await request(app).post('/api/v1/auth/register').set('X-CSRF-Token', 'test').send(user);
        const loginRes = await request(app).post('/api/v1/auth/login').send({ phone: user.phone, password: user.password });
        
        const cookies = loginRes.get('Set-Cookie') as string[];
        
        // 2. Clear accessToken but keep refreshToken (simulated by just not sending it if we were doing it manually, 
        // but here we just wait for the cookies to handle it)
        
        // 3. Call refresh
        const refreshRes = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', cookies); // Sends both

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.data.user).toBeDefined();
        expect(refreshRes.get('Set-Cookie')).toBeDefined();
    });
});
