import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, clearTestDb } from './setup';
import pool from '../../config/database';
import authRoutes from '../../routes/auth';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

// Helper to extract cookie value from Set-Cookie header
const getCookieValue = (setCookie: string) => setCookie.split(';')[0].split('=')[1];

describe('Refresh Token Flow', () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        // Clear debug log if exists
    });

    it('should issue both access and refresh tokens on login', async () => {
        // 1. Register
        await request(app)
            .post('/api/auth/register')
            .send({
                phone: '13800138002',
                password: 'Password123!',
                name: 'Test Refresh'
            });

        // 2. Login
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                phone: '13800138002',
                password: 'Password123!'
            });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();

        // Verify Cookies
        const setCookie = res.headers['set-cookie'] as unknown as string[];
        expect(setCookie).toBeDefined();

        const accessTokenCookie = setCookie.find(c => c.startsWith('accessToken='));
        const refreshTokenCookie = setCookie.find(c => c.startsWith('refreshToken='));

        expect(accessTokenCookie).toBeDefined();
        expect(accessTokenCookie).toContain('HttpOnly');
        expect(refreshTokenCookie).toBeDefined();
        expect(refreshTokenCookie).toContain('HttpOnly');
        expect(refreshTokenCookie).toContain('Path=/api/auth');

        // Verify DB storage
        const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE user_id = $1', [res.body.user.id]);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows.some(r => r.revoked === 0)).toBe(true);
    });

    it('should refresh access token with valid refresh token', async () => {
        // 1. Register
        await request(app)
            .post('/api/auth/register')
            .send({ phone: '13800138003', password: 'Password123!', name: 'Test Refresher' });

        // 2. Login
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ phone: '13800138003', password: 'Password123!' });

        expect(loginRes.status).toBe(200);

        const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
        const refreshTokenLine = setCookie.find(c => c.startsWith('refreshToken='));
        const refreshValue = getCookieValue(refreshTokenLine!);

        // 3. Refresh
        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', [`refreshToken=${refreshValue}`]);

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.accessToken).toBeDefined();
        expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);

        // 4. Verify old token revoked and new one exists
        const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE user_id = $1 ORDER BY id DESC', [loginRes.body.user.id]);
        expect(rows.length).toBeGreaterThanOrEqual(2);
        // The one we used should be revoked
        expect(rows.find(r => r.token === refreshValue).revoked).toBe(1);
        // There should be a new one not revoked
        expect(rows.some(r => r.revoked === 0)).toBe(true);
    });

    it('should revoke refresh token on logout', async () => {
        // 1. Register & Login
        await request(app)
            .post('/api/auth/register')
            .send({ phone: '13800138004', password: 'Password123!', name: 'Test Logout' });

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ phone: '13800138004', password: 'Password123!' });

        expect(loginRes.status).toBe(200);

        const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
        const refreshTokenLine = setCookie.find(c => c.startsWith('refreshToken='));
        const refreshValue = getCookieValue(refreshTokenLine!);

        // 2. Logout
        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', [`refreshToken=${refreshValue}`]);

        expect(logoutRes.status).toBe(200);

        // 3. Verify Revocation
        const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshValue]);
        expect(rows[0].revoked).toBe(1);

        // 4. Try Refresh (Should fail)
        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', [`refreshToken=${refreshValue}`]);

        expect(refreshRes.status).toBe(401);
    });
});
