import { Router } from 'express';
import { z } from 'zod';
import db from '../config/database.js';
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
router.post('/', authenticate, (req, res, next) => {
    try {
        const data = reportSchema.parse(req.body);

        const result = db.prepare(`
            INSERT INTO reports (user_id, title, description, category, voice_url, video_url, image_urls, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.id,
            data.title,
            data.description,
            data.category || 'other',
            data.voice_url || null,
            data.video_url || null,
            data.image_urls ? JSON.stringify(data.image_urls) : null,
            data.latitude || null,
            data.longitude || null
        );

        const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);

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
router.get('/', authenticate, (req, res) => {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = 'SELECT * FROM reports WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const reports = db.prepare(query).all(...params);

    res.json({ reports });
});

/**
 * GET /api/reports/:id
 * Get a specific report
 */
router.get('/:id', authenticate, (req, res) => {
    const report = db.prepare(`
        SELECT r.*, u.name as user_name, u.phone as user_phone,
               w.id as worker_id, wu.name as worker_name, wu.phone as worker_phone
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN workers w ON r.matched_worker_id = w.id
        LEFT JOIN users wu ON w.user_id = wu.id
        WHERE r.id = ? AND (r.user_id = ? OR ? = 'admin')
    `).get(req.params.id, req.user.id, req.user.role);

    if (!report) {
        return res.status(404).json({ error: 'Report not found' });
    }

    // Parse JSON fields
    if (report.image_urls) {
        report.image_urls = JSON.parse(report.image_urls);
    }

    res.json({ report });
});

/**
 * PUT /api/reports/:id
 * Update a report
 */
router.put('/:id', authenticate, (req, res, next) => {
    try {
        const { status, matched_worker_id } = req.body;

        // Verify ownership or admin
        const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare(`
            UPDATE reports 
            SET status = COALESCE(?, status),
                matched_worker_id = COALESCE(?, matched_worker_id),
                updated_at = datetime('now')
            WHERE id = ?
        `).run(status, matched_worker_id, req.params.id);

        const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);

        res.json({ message: 'Report updated', report });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
router.delete('/:id', authenticate, (req, res) => {
    const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);

    if (!existing) {
        return res.status(404).json({ error: 'Report not found' });
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);

    res.json({ message: 'Report deleted' });
});

export default router;
