
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
import workerRoutes from '../routes/workers.js';
import { authenticate } from '../middleware/auth.js';

// Mock database
vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock authentication middleware
vi.mock('../middleware/auth.js', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, role: 'user' };
        next();
    },
    optionalAuth: (req, res, next) => {
        req.user = { id: 1, role: 'user' };
        next();
    }
}));

import db from '../config/database.js';

const app = express();
app.use(express.json());
app.use('/api/workers', workerRoutes);

describe('Worker Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/workers', () => {
        it('should return list of available workers', async () => {
            const mockWorkers = [
                { id: 1, name: 'Worker 1', rating: 4.5, skills: '["Plumbing"]' }
            ];
            (db.query as any).mockResolvedValue({ rows: mockWorkers });

            const res = await request(app).get('/api/workers');

            expect(res.status).toBe(200);
            expect(res.body.workers).toHaveLength(1);
            expect(res.body.workers[0].name).toBe('Worker 1');
            expect(db.query).toHaveBeenCalled();
        });

        it('should filter by skill', async () => {
            (db.query as any).mockResolvedValue({ rows: [] });

            await request(app).get('/api/workers?skill=Plumbing');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('skills LIKE $2'),
                expect.arrayContaining(['%Plumbing%'])
            );
        });
    });

    describe('GET /api/workers/:id', () => {
        it('should return worker details', async () => {
            const mockWorker = { id: 1, name: 'Worker 1', rating: 5, skills: '[]' };
            const mockReviews = [{ id: 1, rating: 5, comment: 'Great!' }];

            (db.query as any)
                .mockResolvedValueOnce({ rows: [mockWorker] }) // First query for worker
                .mockResolvedValueOnce({ rows: mockReviews }); // Second query for reviews

            const res = await request(app).get('/api/workers/1');

            expect(res.status).toBe(200);
            expect(res.body.worker).toBeDefined();
            expect(res.body.reviews).toHaveLength(1);
        });

        it('should return 404 if worker not found', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/workers/999');

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/workers/match', () => {
        it('should match workers based on report', async () => {
            // Mock report
            (db.query as any)
                .mockResolvedValueOnce({ rows: [{ id: 1, latitude: 40, longitude: -74, category: 'Plumbing' }] });

            // Mock workers
            const mockWorkers = [
                { id: 1, name: 'Worker 1', latitude: 40.01, longitude: -74.01, skills: '["Plumbing"]', rating: 5, available: 1 },
                { id: 2, name: 'Worker 2', latitude: 41, longitude: -75, skills: '["Electrician"]', rating: 3, available: 1 }
            ];
            (db.query as any)
                .mockResolvedValueOnce({ rows: mockWorkers });

            const res = await request(app).get('/api/workers/match?report_id=1');

            expect(res.status).toBe(200);
            expect(res.body.matches).toBeDefined();
            expect(res.body.matches.length).toBeGreaterThan(0);
            // Worker 1 should be first because of better location and skill match
            expect(res.body.matches[0].id).toBe(1);
        });
    });
});
