import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

// Mock dependencies
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        on: vi.fn()
    },
    on: vi.fn()
}));

// Mock database
const mockUsers: any[] = [];
vi.mock('../config/database.js', () => {
    const queryFn = vi.fn(async (text: string, params?: any[]) => {
        const sql = text.trim().toUpperCase();

        if (sql.startsWith('DELETE')) {
            const phone = params?.[0];
            const idx = mockUsers.findIndex((u: any) => u.phone === phone);
            if (idx >= 0) mockUsers.splice(idx, 1);
            return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
        }

        if (sql.startsWith('SELECT ID FROM') || sql.startsWith('SELECT ID')) {
            const phone = params?.[0];
            const user = mockUsers.find((u: any) => u.phone === phone);
            return { rows: user ? [{ id: user.id }] : [], rowCount: user ? 1 : 0 };
        }

        if (sql.startsWith('INSERT INTO REFRESH_TOKENS')) {
            return { rows: [], rowCount: 1 };
        }

        if (sql.startsWith('INSERT')) {
            const [phone, password_hash, name, role] = params || [];
            const user = {
                id: mockUsers.length + 1,
                phone,
                password_hash,
                name,
                role: role || 'user',
                avatar: null,
                created_at: new Date().toISOString()
            };
            mockUsers.push(user);
            return { rows: [user], rowCount: 1 };
        }

        if (sql.startsWith('SELECT')) {
            const phone = params?.[0];
            const user = mockUsers.find((u: any) => u.phone === phone);
            return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
        }

        return { rows: [], rowCount: 0 };
    });

    return {
        default: { query: queryFn, on: vi.fn() },
        query: queryFn
    };
});

// Import routes after mocking
import authRoutes from '../routes/auth.js';
import { csrfGuard } from '../middleware/auth.js';

// Setup isolated app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(csrfGuard); // Apply CSRF globally to test its impact
app.use('/api/auth', authRoutes);

describe('Auth API (Cookie Only & CSRF)', () => {
    const testUser = {
        phone: '13800138000',
        password: 'password123',
        name: 'Test User'
    };

    beforeAll(() => {
        mockUsers.length = 0;
    });

    afterAll(() => {
        mockUsers.length = 0;
    });

    it('should fail registration without CSRF header', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('CSRF token missing');
    });

    it('should register a new user and set httpOnly cookies with CSRF header', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('X-CSRF-Token', '1')
            .send(testUser);

        expect(res.status).toBe(201);

        // Verify Cookies
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();

        const hasAccessToken = cookies.some((c: string) => c.startsWith('accessToken='));
        const hasRefreshToken = cookies.some((c: string) => c.startsWith('refreshToken='));

        expect(hasAccessToken).toBe(true);
        expect(hasRefreshToken).toBe(true);
        expect(cookies[0]).toMatch(/HttpOnly/);

        // Verify Body - NO access token in body
        expect(res.body).not.toHaveProperty('accessToken');
        expect(res.body.user).toHaveProperty('phone', testUser.phone);
    });

    it('should login the user and set httpOnly cookies', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('X-CSRF-Token', '1')
            .send({
                phone: testUser.phone,
                password: testUser.password
            });

        expect(res.status).toBe(200);

        // Verify Cookies
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();
        expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true);

        // Verify Body
        expect(res.body).not.toHaveProperty('accessToken');
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('X-CSRF-Token', '1')
            .send({
                phone: testUser.phone,
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
        expect(res.headers['set-cookie']).toBeUndefined();
    });
});
