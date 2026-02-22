import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const registerSchema = z.object({
    skills: z.array(z.string()).min(1),
    hourlyRate: z.number().optional(),
    serviceArea: z.string().optional(),
    bio: z.string().optional(),
    experience: z.string().optional(),
});

/**
 * POST /api/worker-portal/register
 * Register as a worker (linked to existing user account)
 */
router.post('/register', authenticate, async (req, res, next) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
        }

        const { skills, hourlyRate, serviceArea, bio } = parsed.data;
        const userId = req.user.id;

        // Check if already a worker
        const { rows: existing } = await db.query('SELECT id FROM workers WHERE user_id = $1', [userId]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Already registered as worker', workerId: existing[0].id });
        }

        // Create worker record
        const { rows } = await db.query(`
            INSERT INTO workers (user_id, skills, hourly_rate, service_area, bio, available)
            VALUES ($1, $2, $3, $4, $5, 1)
            RETURNING *
        `, [userId, JSON.stringify(skills), hourlyRate || null, serviceArea || null, bio || null]);

        // Update user role
        await db.query('UPDATE users SET role = $1 WHERE id = $2', ['worker', userId]);

        res.status(201).json({ worker: rows[0] || { user_id: userId, skills } });
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
        const { rows: workers } = await db.query('SELECT * FROM workers WHERE user_id = $1', [userId]);
        if (workers.length === 0) {
            return res.status(404).json({ error: 'Worker profile not found', registered: false });
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

        res.json({
            worker,
            stats: {
                earnings: parseFloat(earningsResult[0]?.total || '0'),
                jobsCompleted: parseInt(jobStats[0]?.completed || '0'),
                activeJobs: parseInt(jobStats[0]?.active || '0'),
                rating: parseFloat(worker.rating || '0'),
            },
        });
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
            return res.status(404).json({ error: 'Worker profile not found' });
        }

        const { rows: jobs } = await db.query(`
            SELECT r.*, u.name as client_name, u.avatar as client_avatar
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.matched_worker_id = $1
            ORDER BY r.created_at DESC
        `, [workers[0].id]);

        res.json({ jobs });
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
        const { skills, hourlyRate, serviceArea, bio } = req.body;
        const userId = req.user.id;

        const { rows: workers } = await db.query('SELECT id FROM workers WHERE user_id = $1', [userId]);
        if (workers.length === 0) {
            return res.status(404).json({ error: 'Worker profile not found' });
        }

        await db.query(`
            UPDATE workers SET
                skills = COALESCE($1, skills),
                hourly_rate = COALESCE($2, hourly_rate),
                service_area = COALESCE($3, service_area),
                bio = COALESCE($4, bio)
            WHERE user_id = $5
        `, [
            skills ? JSON.stringify(skills) : null,
            hourlyRate || null,
            serviceArea || null,
            bio || null,
            userId,
        ]);

        res.json({ message: 'Profile updated' });
    } catch (error) {
        next(error);
    }
});

export default router;
