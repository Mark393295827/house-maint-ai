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
    longitude: z.number().optional(),
    urgency_score: z.number().min(0).max(10).optional().default(0)
});

/**
 * POST /api/reports
 * Create a new report
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const data = reportSchema.parse(req.body);

        const { rows } = await db.query(`
            INSERT INTO reports (user_id, title, description, category, voice_url, video_url, image_urls, latitude, longitude, urgency_score)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            data.longitude || null,
            data.urgency_score
        ]);

        const report = rows[0];

        // APM Blackboard: Create Diagnosis Task
        await db.query(`
            INSERT INTO tasks (title, objective, status, priority, inputs)
            VALUES ($1, $2, 'new', 'high', $3)
        `, [
            `Diagnose Report #${report.id}`,
            'diagnose_image',
            JSON.stringify({ report_id: report.id })
        ]);

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
            if (req.user.role === 'worker') {
                // Workers see their own reports AND reports assigned to them
                query = 'SELECT * FROM reports WHERE (user_id = $1 OR matched_worker_id = (SELECT id FROM workers WHERE user_id = $1))';
                // Adjust param index for status
                query += ' AND status = $2';
                params.push(status);
            } else {
                query += ' AND status = $' + (params.length + 1);
                params.push(status);
            }
        } else if (req.user.role === 'worker') {
            // Workers see their own reports AND reports assigned to them
            query = 'SELECT * FROM reports WHERE (user_id = $1 OR matched_worker_id = (SELECT id FROM workers WHERE user_id = $1))';
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
        const { status, matched_worker_id, urgency_score } = req.body;

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
                urgency_score = COALESCE($3, urgency_score),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [status, matched_worker_id, urgency_score, req.params.id]);

        res.json({ message: 'Report updated', report: updated[0] });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/reports/:id/complete
 * Mark report as completed with resolution details (Worker only)
 */
router.put('/:id/complete', authenticate, async (req, res, next) => {
    try {
        const { resolution_details } = req.body;
        const reportId = req.params.id;

        // 1. Get report
        const { rows: reports } = await db.query('SELECT * FROM reports WHERE id = $1', [reportId]);
        if (reports.length === 0) return res.status(404).json({ error: 'Report not found' });

        const report = reports[0];

        // 2. Authorize (Only assigned worker or admin)
        if (report.matched_worker_id === null) {
            return res.status(400).json({ error: 'Report is not assigned to any worker' });
        }

        // Verify that the requester is the assigned worker
        const { rows: workers } = await db.query('SELECT * FROM workers WHERE user_id = $1', [req.user.id]);
        const worker = workers[0];

        if ((!worker || worker.id !== report.matched_worker_id) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // 3. Update report
        const resolutionJson = JSON.stringify(resolution_details || {});

        const { rows: updated } = await db.query(`
            UPDATE reports 
            SET status = 'completed',
                resolution_details = $1,
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [resolutionJson, reportId]);

        // 4. Update worker stats (increment total_jobs)
        await db.query('UPDATE workers SET total_jobs = total_jobs + 1 WHERE id = $1', [report.matched_worker_id]);

        res.json({ message: 'Report completed', report: updated[0] });
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

import { aiService } from '../services/ai.js';

/**
 * POST /api/reports/:id/plan
 * Generate an AI Repair Plan using DeepSeek R1
 */
router.post('/:id/plan', authenticate, async (req, res, next) => {
    try {
        const reportId = req.params.id;

        // 1. Get report details with user assets context
        // We join with user_assets to give the AI context about the device
        const { rows: reports } = await db.query(`
            SELECT r.*, 
                   json_group_array(json_object(
                       'name', ua.name, 
                       'brand', ua.brand, 
                       'model', ua.model
                   )) as user_assets
            FROM reports r
            LEFT JOIN user_assets ua ON r.user_id = ua.user_id
            WHERE r.id = $1
            GROUP BY r.id
        `, [reportId]);

        if (reports.length === 0) return res.status(404).json({ error: 'Report not found' });

        const report = reports[0];

        // 2. Authorize (Report Owner or Admin or Assigned Worker)
        if (report.user_id !== req.user.id && req.user.role !== 'admin') {
            // Check if assigned worker
            if (req.user.role === 'worker' && report.matched_worker_id) {
                const { rows: workers } = await db.query('SELECT id FROM workers WHERE user_id = $1', [req.user.id]);
                if (!workers[0] || workers[0].id !== report.matched_worker_id) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            } else if (req.user.role === 'worker') {
                // Worker not assigned
                return res.status(403).json({ error: 'Not authorized' });
            }
        }

        // 3. Prepare Context for AI
        const issueContext = {
            title: report.title,
            description: report.description,
            category: report.category,
            status: report.status,
            home_context: typeof report.user_assets === 'string' ? JSON.parse(report.user_assets) : report.user_assets,
            image_urls: report.image_urls
        };

        // 4. Generate Plan via DeepSeek
        // This might take 10-30 seconds, so client should handle loading state
        const planMarkdown = await aiService.generateRepairPlan(issueContext);

        // 5. Return plan (and optionally save it to a notes field or separate plans table)
        // For MVP, we return it directly. Client can choose to save it as a "Resolution Draft".
        res.json({
            report_id: reportId,
            plan: planMarkdown,
            provider: 'DeepSeek R1'
        });

    } catch (error) {
        next(error);
    }
});

export default router;
