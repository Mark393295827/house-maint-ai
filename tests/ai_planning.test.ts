
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server/index';
import db from '../server/config/database';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/config/secrets';

// Mock Redis
vi.mock('ioredis', () => {
    return {
        default: vi.fn(() => ({
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
            quit: vi.fn(),
            on: vi.fn(),
        })),
    };
});

describe('AI Repair Planning API', () => {
    let userToken: string;
    let workerToken: string;
    let userId: number;
    let workerId: number;
    let reportId: number;

    beforeEach(async () => {
        // Clear DB
        await db.query('DELETE FROM reports');
        await db.query('DELETE FROM users');
        await db.query('DELETE FROM workers');

        // 1. Create User
        const userRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('plan_user_' || hex(randomblob(4)), 'hash', 'Test User', 'user') 
            RETURNING id
        `);
        userId = userRes.rows[0].id;
        userToken = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET);

        // 2. Create Worker
        const workerUserRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('plan_worker_' || hex(randomblob(4)), 'hash', 'Test Worker', 'worker') 
            RETURNING id
        `);
        const workerUserId = workerUserRes.rows[0].id;

        const workerRes = await db.query(`
            INSERT INTO workers (user_id, skills, rating, available)
            VALUES ($1, '[]', 5.0, 1)
            RETURNING id
        `, [workerUserId]);
        workerId = workerRes.rows[0].id;
        workerToken = jwt.sign({ id: workerUserId, role: 'worker' }, JWT_SECRET);

        // 3. Create Report (Attached to User)
        const reportRes = await db.query(`
            INSERT INTO reports (user_id, title, description, category, status)
            VALUES ($1, 'Leaky Pipe', 'Water leaking under sink', 'plumbing', 'pending')
            RETURNING id
        `, [userId]);
        reportId = reportRes.rows[0].id;
    });

    it('should allow report owner to generate a plan', async () => {
        const res = await request(app)
            .post(`/api/reports/${reportId}/plan`)
            .set('Cookie', [`accessToken=${userToken}`]);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('plan');
        expect(res.body.provider).toBe('DeepSeek R1');
        // Since we mock/no-op the AI service in test environment (missing API key), 
        // it likely returns the mock response string.
        expect(res.body.plan).toContain('DeepSeek R1 AI assistant');
    });

    it('should allow assigned worker to generate a plan', async () => {
        // Assign worker to report
        await db.query('UPDATE reports SET matched_worker_id = $1 WHERE id = $2', [workerId, reportId]);

        const res = await request(app)
            .post(`/api/reports/${reportId}/plan`)
            .set('Cookie', [`accessToken=${workerToken}`]);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('plan');
    });

    it('should deny unassigned worker', async () => {
        const res = await request(app)
            .post(`/api/reports/${reportId}/plan`)
            .set('Cookie', [`accessToken=${workerToken}`]);

        // Should be 403 Forbidden
        expect(res.status).toBe(403);
    });
});
