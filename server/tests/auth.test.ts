import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Mock redis to prevent connection errors
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        on: vi.fn()
    }
}));

// In-memory user store for auth tests
const mockUsers: any[] = [];

// Mock database — intercept SQL queries with in-memory storage
vi.mock('../config/database.js', () => {
    const queryFn = vi.fn(async (text: string, params?: any[]) => {
        const sql = text.trim().toUpperCase();

        // DELETE FROM users WHERE phone = $1
        if (sql.startsWith('DELETE')) {
            const phone = params?.[0];
            const idx = mockUsers.findIndex((u: any) => u.phone === phone);
            if (idx >= 0) mockUsers.splice(idx, 1);
            return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
        }

        // SELECT id FROM users WHERE phone = $1 (register check)
        if (sql.startsWith('SELECT ID FROM') || sql.startsWith('SELECT ID')) {
            const phone = params?.[0];
            const user = mockUsers.find((u: any) => u.phone === phone);
            return { rows: user ? [{ id: user.id }] : [], rowCount: user ? 1 : 0 };
        }

        // INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING ...
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

        // SELECT * FROM users WHERE phone = $1 (login lookup)
        if (sql.startsWith('SELECT')) {
            const phone = params?.[0];
            const user = mockUsers.find((u: any) => u.phone === phone);
            return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
        }

        return { rows: [], rowCount: 0 };
    });

    return {
        default: { query: queryFn, on: vi.fn() },
        query: queryFn,
        isSQLite: false
    };
});

import app from '../index.js';

describe('Auth API', () => {
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
