import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import { matchingService } from '../services/matching.js';
import type { WorkerWithUser, ReviewRow } from '../types/models.js';
import { parseJsonColumn } from '../utils/parseJson.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();
const workerListQuerySchema = z.object({
    skill: z.string().trim().min(1).max(100).optional(),
    available: z.coerce.number().int().min(0).max(1).optional(),
    all: z.enum(['true', 'false']).optional(),
});

const workerMatchQuerySchema = z.object({
    report_id: z.coerce.number().int().positive().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(5),
});

/**
 * GET /api/workers
 * Get all available workers
 * Cached for 5 minutes
 */
router.get('/', optionalAuth, cacheMiddleware(300), async (req, res, next) => {
    try {
        const { skill, available, all } = workerListQuerySchema.parse(req.query);
        const fetchAll = all === 'true' && (req.user && (req.user.role === 'admin' || req.user.role === 'manager'));

        let query = `
            SELECT w.*, u.name, u.phone, u.avatar
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE 1=1
        `;
        const params: unknown[] = [];

        if (!fetchAll) {
            const isAvailable = available ?? 1;
            query += ` AND w.available = $${params.length + 1}`;
            params.push(isAvailable);
        }

        if (skill) {
            query += ` AND w.skills LIKE $${params.length + 1}`;
            params.push(`%${skill}%`);
        }

        query += ' ORDER BY w.rating DESC';

        const { rows: workers } = await db.query<WorkerWithUser>(query, params);

        // Parse skills JSON
        const parsed = workers.map(w => ({
            ...w,
            skills: parseJsonColumn<string[]>(w.skills, []),
        }));

        res.json(ApiResponse.success({ workers: parsed }));
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workers/match
 * Get matched workers for a report
 */
router.get('/match', authenticate, async (req, res, next) => {
    try {
        const { report_id, latitude, longitude, category, limit } = workerMatchQuerySchema.parse(req.query);

        // Get report if report_id provided
        let report: { latitude: number | null; longitude: number | null; category: string | null; description: string; user_id: number } | null = null;
        if (report_id) {
            const { rows } = await db.query<{ latitude: number | null; longitude: number | null; category: string | null; description: string; user_id: number }>('SELECT * FROM reports WHERE id = $1', [report_id]);
            report = rows[0] ?? null;
        } else {
            report = {
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                category: category || null,
                description: '',
                user_id: req.user.id
            };
        }

        if (!report) {
            return res.status(404).json(ApiResponse.fail('Report context missing'));
        }

        const topMatches = await matchingService.findTopMatches(report, limit);

        res.json(ApiResponse.success({
            matches: topMatches,
            total: topMatches.length
        }));
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workers/:id
 * Get worker details
 * Cached for 1 hour
 */
router.get('/:id', optionalAuth, cacheMiddleware(3600), async (req, res, next) => {
    try {
        const { rows: workers } = await db.query<WorkerWithUser>(`
            SELECT w.*, u.name, u.phone, u.avatar
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE w.id = $1
        `, [req.params.id]);

        const rawWorker = workers[0];

        if (!rawWorker) {
            return res.status(404).json(ApiResponse.fail('Worker not found'));
        }

        const worker = {
            ...rawWorker,
            skills: parseJsonColumn<string[]>(rawWorker.skills, []),
        };

        const { rows: reviews } = await db.query<ReviewRow & { reviewer_name: string; reviewer_avatar: string | null }>(`
            SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.worker_id = $1
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [req.params.id]);

        // Parse JSON fields
        const parsedReviews = reviews.map(r => ({
            ...r,
            photos: parseJsonColumn<string[]>(r.photos, []),
        }));

        res.json(ApiResponse.success({ worker, reviews: parsedReviews }));
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/workers/:id/availability
 * Update worker availability
 */
router.put('/:id/availability', authenticate, async (req, res, next) => {
    try {
        const { available } = req.body;

        const { rows: workers } = await db.query('SELECT * FROM workers WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        const worker = workers[0];

        if (!worker && req.user.role !== 'admin') {
            return res.status(403).json(ApiResponse.fail('Not authorized'));
        }

        await db.query('UPDATE workers SET available = $1 WHERE id = $2', [available ? 1 : 0, req.params.id]);

        // Clear cache for this worker and general list
        await clearCache(`workers`);

        res.json(ApiResponse.success(null, 'Availability updated'));
    } catch (error) {
        next(error);
    }
});

export default router;
