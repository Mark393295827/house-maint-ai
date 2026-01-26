import { Router } from 'express';
import { z } from 'zod';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Validation schema
const reportSchema = z.object({
    title: z.string().min(2, 'Title is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.enum(['plumbing', 'electrical', 'appliance', 'carpentry', 'painting', 'other']).optional(),
    voice_url: z.string().optional(),
    video_url: z.string().optional(),
    image_urls: z.array(z.string()).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
});

/**
 * POST /api/reports
 * Create a new report
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const data = reportSchema.parse(req.body);

        const insertSql = db.isUsingPostgres()
            ? `INSERT INTO reports (user_id, title, description, category, voice_url, video_url, image_urls, latitude, longitude)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`
            : `INSERT INTO reports (user_id, title, description, category, voice_url, video_url, image_urls, latitude, longitude)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

        const imageUrls = data.image_urls ? JSON.stringify(data.image_urls) : null;
        const result = await db.run(insertSql, [
            req.user.id,
            data.title,
            data.description,
            data.category || 'other',
            data.voice_url || null,
            data.video_url || null,
            imageUrls,
            data.latitude || null,
            data.longitude || null
        ]);

        const report = await db.get('SELECT * FROM reports WHERE id = $1', [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Report created successfully',
            report
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports
 * Get all reports for current user
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;
        let paramIndex = 1;
        let query = `SELECT * FROM reports WHERE user_id = $${paramIndex++}`;
        const params = [req.user.id];

        if (status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const reports = await db.all(query, params);

        res.json({ reports });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/:id
 * Get a specific report
 */
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const report = await db.get(`
            SELECT r.*, u.name as user_name, u.phone as user_phone,
                   w.id as worker_id, wu.name as worker_name, wu.phone as worker_phone
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN workers w ON r.matched_worker_id = w.id
            LEFT JOIN users wu ON w.user_id = wu.id
            WHERE r.id = $1 AND (r.user_id = $2 OR $3 = 'admin')
        `, [req.params.id, req.user.id, req.user.role]);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Parse JSON fields
        if (report.image_urls && typeof report.image_urls === 'string') {
            report.image_urls = JSON.parse(report.image_urls);
        }

        res.json({ report });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/reports/:id
 * Update a report
 */
router.put('/:id', authenticate, async (req, res, next) => {
    try {
        const { status, matched_worker_id } = req.body;

        // Verify ownership or admin
        const existing = await db.get('SELECT * FROM reports WHERE id = $1', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updateSql = db.isUsingPostgres()
            ? `UPDATE reports SET status = COALESCE($1, status), matched_worker_id = COALESCE($2, matched_worker_id), updated_at = NOW() WHERE id = $3`
            : `UPDATE reports SET status = COALESCE($1, status), matched_worker_id = COALESCE($2, matched_worker_id), updated_at = datetime('now') WHERE id = $3`;

        await db.run(updateSql, [status, matched_worker_id, req.params.id]);

        const report = await db.get('SELECT * FROM reports WHERE id = $1', [req.params.id]);

        res.json({ message: 'Report updated', report });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const existing = await db.get('SELECT * FROM reports WHERE id = $1', [req.params.id]);

        if (!existing) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.run('DELETE FROM reports WHERE id = $1', [req.params.id]);

        res.json({ message: 'Report deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
