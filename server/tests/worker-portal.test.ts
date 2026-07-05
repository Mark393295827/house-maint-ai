
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock redis to prevent connection errors
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        on: vi.fn()
    }
}));

import workerPortalRoutes from '../routes/worker-portal.js';

// Mock database
vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock authentication middleware
vi.mock('../middleware/auth.js', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { id: 1, phone: '13800000000', name: 'Worker', role: 'worker', type: 'access' };
        next();
    },
    optionalAuth: (req: any, res: any, next: any) => {
        req.user = { id: 1, phone: '13800000000', name: 'Worker', role: 'worker', type: 'access' };
        next();
    },
    generateAccessToken: vi.fn(() => 'new-access-token'),
    getAuthCookieOptions: vi.fn(() => ({ httpOnly: true, path: '/' }))
}));

import db from '../config/database.js';

const app = express();
app.use(express.json());
app.use('/api/worker-portal', workerPortalRoutes);

describe('Worker Portal Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/worker-portal/register', () => {
        it('should register a new worker', async () => {
            // No existing worker
            (db.query as any).mockResolvedValueOnce({ rows: [] });
            // INSERT worker
            (db.query as any).mockResolvedValueOnce({
                rows: [{ id: 1, user_id: 1, skills: '["plumbing"]', available: 1 }]
            });
            // UPDATE user role
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/worker-portal/register')
                .send({ skills: ['plumbing'], hourlyRate: 80, bio: 'Expert plumber' });

            expect(res.status).toBe(201);
            expect(res.body.data.worker).toBeDefined();
        });

        it('should reject registration with no skills', async () => {
            const res = await request(app)
                .post('/api/worker-portal/register')
                .send({ skills: [] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBeDefined();
        });

        it('should return 409 if already registered', async () => {
            (db.query as any).mockResolvedValueOnce({
                rows: [{ id: 5 }]
            });

            const res = await request(app)
                .post('/api/worker-portal/register')
                .send({ skills: ['electrical'] });

            expect(res.status).toBe(409);
        });
    });

    describe('GET /api/worker-portal/dashboard', () => {
        it('should return dashboard stats for existing worker', async () => {
            // Worker exists
            (db.query as any).mockResolvedValueOnce({
                rows: [{ id: 10, user_id: 1, rating: '4.5', available: 1 }]
            });
            // Job stats
            (db.query as any).mockResolvedValueOnce({
                rows: [{ completed: '3', active: '1' }]
            });
            // Earnings
            (db.query as any).mockResolvedValueOnce({
                rows: [{ total: '450.00' }]
            });

            const res = await request(app).get('/api/worker-portal/dashboard');

            expect(res.status).toBe(200);
            expect(res.body.data.stats).toBeDefined();
            expect(res.body.data.stats.earnings).toBe(450);
            expect(res.body.data.stats.jobsCompleted).toBe(3);
            expect(res.body.data.stats.activeJobs).toBe(1);
            expect(res.body.data.stats.rating).toBe(4.5);
        });

        it('should auto-initialize worker profile for worker role', async () => {
            // No existing worker
            (db.query as any).mockResolvedValueOnce({ rows: [] });
            // Auto-initialize INSERT
            (db.query as any).mockResolvedValueOnce({
                rows: [{ id: 11, user_id: 1, rating: '0', available: 1 }]
            });
            // Job stats
            (db.query as any).mockResolvedValueOnce({
                rows: [{ completed: '0', active: '0' }]
            });
            // Earnings
            (db.query as any).mockResolvedValueOnce({
                rows: [{ total: '0' }]
            });

            const res = await request(app).get('/api/worker-portal/dashboard');

            expect(res.status).toBe(200);
            expect(res.body.data.stats.earnings).toBe(0);
        });
    });

    describe('GET /api/worker-portal/jobs', () => {
        it('should return jobs for the worker', async () => {
            // Worker exists
            (db.query as any).mockResolvedValueOnce({
                rows: [{ id: 10 }]
            });
            // Jobs
            (db.query as any).mockResolvedValueOnce({
                rows: [
                    { id: 1, title: 'Fix pipe', status: 'in_progress', client_name: 'Alice' },
                    { id: 2, title: 'Replace AC', status: 'completed', client_name: 'Bob' },
                ]
            });

            const res = await request(app).get('/api/worker-portal/jobs');

            expect(res.status).toBe(200);
            expect(res.body.data.jobs).toHaveLength(2);
            expect(res.body.data.jobs[0].title).toBe('Fix pipe');
        });

        it('should return 404 if no worker profile', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/worker-portal/jobs');

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/worker-portal/profile', () => {
        it('should update worker profile', async () => {
            // Worker exists
            (db.query as any).mockResolvedValueOnce({
                rows: [{ id: 10 }]
            });
            // UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/worker-portal/profile')
                .send({ skills: ['plumbing', 'electrical'], hourlyRate: 100 });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Profile updated');
        });

        it('should return 404 if no worker profile', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/worker-portal/profile')
                .send({ bio: 'Updated bio' });

            expect(res.status).toBe(404);
        });
    });
});
