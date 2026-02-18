import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, clearTestDb } from './setup';
import pool from '../../config/database';
import authRoutes from '../../routes/auth';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../../middleware/errorHandler';

// Setup Express App
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth Flow Integration', () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
    });

    it('should register a new user and verify in DB', async () => {
        const newUser = {
            phone: '13812345678',
            password: 'Password123!',
            name: 'Test User'
        };

        // 1. Register API Call
        const res = await request(app)
            .post('/api/auth/register')
            .send(newUser)
            .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.phone).toBe(newUser.phone);
        // Should set cookie
        expect(res.headers['set-cookie']).toBeDefined();

        // 2. Verify in Database directly
        const dbResult = await pool.query('SELECT * FROM users WHERE phone = $1', [newUser.phone]);
        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].name).toBe(newUser.name);
        expect(dbResult.rows[0].role).toBe('user'); // Default role
        expect(dbResult.rows[0].password_hash).not.toBe(newUser.password); // Should be hashed
    });

    it('should login with registered user and access protected route', async () => {
        // 0. Setup: Create user
        const userData = {
            phone: '13987654321',
            password: 'Password123!',
            name: 'Login User'
        };

        await request(app).post('/api/auth/register').send(userData);

        // 1. Login
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                phone: userData.phone,
                password: userData.password
            })
            .expect(200);

        expect(loginRes.body.success).toBe(true);
        const cookie = loginRes.headers['set-cookie'];
        expect(cookie).toBeDefined();

        // 2. Access Protected Route (Me) using cookie
        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Cookie', cookie)
            .expect(200);

        expect(meRes.body.success).toBe(true);
        expect(meRes.body.user.phone).toBe(userData.phone);
    });

    it('should prevent duplicate registration', async () => {
        const userData = {
            phone: '13811112222',
            password: 'Password123!',
            name: 'Duplicate User'
        };

        // First registration
        await request(app).post('/api/auth/register').send(userData).expect(201);

        // Second registration
        const res = await request(app).post('/api/auth/register').send(userData).expect(400);

        expect(res.body.success).toBe(false);
        // Expect database constraint violation handling
    });
});
