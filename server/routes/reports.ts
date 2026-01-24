import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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

        const { rows } = await db.query(`
            INSERT INTO reports (user_id, title, description, category, voice_url, video_url, image_urls, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            req.user.id,
            data.title,
            data.description,
            data.category || 'other',
            data.voice_url || null,
            data.video_url || null,
            data.image_urls ? JSON.stringify(data.image_urls) : null,
            data.latitude || null,
            data.longitude || null
        ]);

        const report = rows[0];

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
        const { status } = req.query;
        const limit = parseInt(String(req.query.limit || '20'));
        const offset = parseInt(String(req.query.offset || '0'));

        let query = 'SELECT * FROM reports WHERE user_id = $1';
        const params = [req.user.id];

        if (status) {
            query += ' AND status = $' + (params.length + 1);
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const { rows: reports } = await db.query(query, params);

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
        const { rows } = await db.query(`
            SELECT r.*, u.name as user_name, u.phone as user_phone,
                   w.id as worker_id, wu.name as worker_name, wu.phone as worker_phone
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN workers w ON r.matched_worker_id = w.id
            LEFT JOIN users wu ON w.user_id = wu.id
            WHERE r.id = $1 AND (r.user_id = $2 OR $3 = 'admin')
        `, [req.params.id, req.user.id, req.user.role]);

        const report = rows[0];

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Parse JSON fields
        if (report.image_urls) {
            try {
                report.image_urls = JSON.parse(report.image_urls);
            } catch (e) {
                // ignore parse error
            }
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
        const { rows: existing } = await db.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const reportData = existing[0];
        if (reportData.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { rows: updated } = await db.query(`
            UPDATE reports 
            SET status = COALESCE($1, status),
                matched_worker_id = COALESCE($2, matched_worker_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [status, matched_worker_id, req.params.id]);

        res.json({ message: 'Report updated', report: updated[0] });
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
        const { rows: existing } = await db.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = existing[0];
        if (report.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM reports WHERE id = $1', [req.params.id]);

        res.json({ message: 'Report deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
