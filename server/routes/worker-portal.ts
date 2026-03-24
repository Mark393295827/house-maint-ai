import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

const registerSchema = z.object({
    skills: z.array(z.string()).min(1),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});

/**
 * POST /api/worker-portal/register
 * Register as a worker (linked to existing user account)
 */
router.post('/register', authenticate, async (req, res, next) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(ApiResponse.fail('Invalid data'));
        }

        const { skills, latitude, longitude } = parsed.data;
        const userId = req.user.id;

        // Check if already a worker
        const { rows: existing } = await db.query('SELECT id FROM workers WHERE user_id = $1', [userId]);
        if (existing.length > 0) {
            return res.status(409).json(ApiResponse.fail('Already registered as worker'));
        }

        // Create worker record
        const { rows } = await db.query(`
            INSERT INTO workers (user_id, skills, latitude, longitude, available)
            VALUES ($1, $2, $3, $4, 1)
            RETURNING *
        `, [userId, JSON.stringify(skills), latitude || null, longitude || null]);

        // Update user role
        await db.query('UPDATE users SET role = $1 WHERE id = $2', ['worker', userId]);

        res.status(201).json(ApiResponse.success({ worker: rows[0] || { user_id: userId, skills } }, 'Worker registered'));
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/worker-portal/dashboard
 * Worker dashboard: earnings, job counts, rating
 */
router.get('/dashboard', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get worker record
        let { rows: workers } = await db.query('SELECT * FROM workers WHERE user_id = $1', [userId]);
        
        if (workers.length === 0) {
            if (req.user.role === 'worker') {
                // Auto-initialize worker profile
                const { rows: newWorker } = await db.query(`
                    INSERT INTO workers (user_id, skills, available)
                    VALUES ($1, $2, 1)
                    RETURNING *
                `, [userId, JSON.stringify(['general'])]);
                workers = newWorker;
            } else {
                return res.status(404).json(ApiResponse.fail('Worker profile not found'));
            }
        }
        const worker = workers[0];

        // Count completed jobs
        const { rows: jobStats } = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status IN ('matching', 'matched', 'in_progress')) as active
            FROM reports WHERE matched_worker_id = $1
        `, [worker.id]);

        // Calculate earnings from completed orders
        const { rows: earningsResult } = await db.query(`
            SELECT COALESCE(SUM(o.amount), 0) as total
            FROM orders o
            JOIN reports r ON o.report_id = r.id
            WHERE r.matched_worker_id = $1 AND o.status = 'paid'
        `, [worker.id]);

        res.json(ApiResponse.success({
            worker,
            stats: {
                earnings: parseFloat(earningsResult[0]?.total || '0'),
                jobsCompleted: parseInt(jobStats[0]?.completed || '0'),
                activeJobs: parseInt(jobStats[0]?.active || '0'),
                rating: parseFloat(worker.rating || '0'),
            },
        }));
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/worker-portal/jobs
 * List worker's assigned/matched jobs
 */
router.get('/jobs', authenticate, async (req, res, next) => {
    try {
        const { rows: workers } = await db.query('SELECT id FROM workers WHERE user_id = $1', [req.user.id]);
        if (workers.length === 0) {
            return res.status(404).json(ApiResponse.fail('Worker profile not found'));
        }

        const { rows: jobs } = await db.query(`
            SELECT r.*, u.name as client_name, u.avatar as client_avatar
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.matched_worker_id = $1
            ORDER BY r.created_at DESC
        `, [workers[0].id]);

        res.json(ApiResponse.success({ jobs }));
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/worker-portal/profile
 * Update worker profile
 */
router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const { skills, latitude, longitude, available } = req.body;
        const userId = req.user.id;

        const { rows: workers } = await db.query('SELECT id FROM workers WHERE user_id = $1', [userId]);
        if (workers.length === 0) {
            return res.status(404).json(ApiResponse.fail('Worker profile not found'));
        }

        await db.query(`
            UPDATE workers SET
                skills = COALESCE($1, skills),
                latitude = COALESCE($2, latitude),
                longitude = COALESCE($3, longitude),
                available = COALESCE($4, available)
            WHERE user_id = $5
        `, [
            skills ? JSON.stringify(skills) : null,
            latitude ?? null,
            longitude ?? null,
            available != null ? (available ? 1 : 0) : null,
            userId,
        ]);

        res.json(ApiResponse.success(null, 'Profile updated'));
    } catch (error) {
        next(error);
    }
});

export default router;
