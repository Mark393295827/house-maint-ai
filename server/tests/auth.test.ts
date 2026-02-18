import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

// Mock dependencies
vi.mock('../config/redis', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        on: vi.fn()
    }
}));

// Mock database
const mockUsers: any[] = [];
vi.mock('../config/database', () => {
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

        // Profile update
        if (sql.startsWith('UPDATE')) {
            return { rows: [{ ...mockUsers[0], name: params?.[0] }], rowCount: 1 };
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

// Setup isolated app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth API (Isolated)', () => {
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

    it('should register a new user and set httpOnly cookie', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);

        // Verify Cookie
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toMatch(/token=.+; Path=\//);
        expect(cookies[0]).toMatch(/HttpOnly/);

        // Verify Body
        expect(res.body).not.toHaveProperty('token');
        expect(res.body.user).toHaveProperty('phone', testUser.phone);
    });

    it('should login the user and set httpOnly cookie', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                phone: testUser.phone,
                password: testUser.password
            });

        expect(res.status).toBe(200);

        // Verify Cookie
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toMatch(/token=.+; Path=\//);
        expect(cookies[0]).toMatch(/HttpOnly/);

        // Verify Body
        expect(res.body).not.toHaveProperty('token');
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                phone: testUser.phone,
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
        expect(res.headers['set-cookie']).toBeUndefined();
    });
});
