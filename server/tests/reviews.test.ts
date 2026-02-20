import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// 1. Mock Authentication
vi.mock('../middleware/auth.js', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { id: 1, role: 'user' };
        next();
    }
}));

// 2. Mock Redis
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        on: vi.fn()
    }
}));

import reviewRoutes from '../routes/reviews.js';
import db from '../config/database.js';

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewRoutes);

describe('Reviews API Integration', () => {
    beforeAll(async () => {
        try {
            console.log('Seeding review test data...');
            // Rely on global tests/setup.ts which sets DB_USE_SQLITE=true
            await db.query(`INSERT INTO users (id, phone, password_hash, name, role) VALUES (1, '13800138001', 'hash', 'Alice', 'user')`);
            await db.query(`INSERT INTO users (id, phone, password_hash, name, role) VALUES (2, '13800138002', 'hash', 'Bob Worker', 'worker')`);
            await db.query(`INSERT INTO workers (id, user_id, skills, rating) VALUES (1, 2, '["plumbing"]', 5.0)`);
            await db.query(`INSERT INTO reports (id, user_id, title, description, status, matched_worker_id) VALUES (1, 1, 'Leaky Pipe', 'Fix it', 'completed', 1)`);
            console.log('Seeding complete.');
        } catch (error) {
            console.error('Test Seeding Failed:', error);
            throw error;
        }
    });

    it('should submit a review and update worker rating', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .send({
                booking_id: 1,
                rating: 5,
                comment: 'Perfect job!'
            });

        if (res.status !== 201) console.log('DEBUG: Error Response:', res.body);
        expect(res.status).toBe(201);
        expect(res.body.review.rating).toBe(5);

        // Verify worker's total_jobs or similar if updated
        const { rows } = await db.query('SELECT total_reviews FROM worker_ratings WHERE worker_id = 1');
        expect(rows[0].total_reviews).toBe(1);
    });

    it('should fetch worker reviews with reviewer name', async () => {
        const res = await request(app).get('/api/reviews/worker/1');
        expect(res.status).toBe(200);
        expect(res.body.reviews).toHaveLength(1);
        expect(res.body.reviews[0].reviewer_name).toBe('Alice');
    });

    it('should return 400 for non-existent reports', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .send({ booking_id: 999, rating: 5 });
        expect(res.status).toBe(404);
    });
});
