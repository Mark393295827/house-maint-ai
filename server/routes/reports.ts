import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import type { ReportRow } from '../types/models.js';
import { parseJsonColumn } from '../utils/parseJson.js';

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

        res.status(201).json(ApiResponse.success({ report }, 'Report created successfully'));
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/available
 * Get available orders for workers (pending/matching status)
 */
router.get('/available', authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'worker' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Workers only' });
        }

        const workerLat = parseFloat(req.query.latitude as string) || 39.9042;
        const workerLng = parseFloat(req.query.longitude as string) || 116.4074;

        const { rows: orders } = await db.query(`
            SELECT r.*, u.name as user_name, u.phone as user_phone
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.status IN ('pending', 'matching')
            ORDER BY r.urgency_score DESC, r.created_at DESC
            LIMIT 50
        `);

        const enriched = orders.map((order: any) => {
            let distanceKm: number | null = null;
            if (order.latitude && order.longitude) {
                const R = 6371;
                const dLat = (order.latitude - workerLat) * Math.PI / 180;
                const dLng = (order.longitude - workerLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                    Math.cos(workerLat * Math.PI / 180) * Math.cos(order.latitude * Math.PI / 180) *
                    Math.sin(dLng / 2) ** 2;
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distanceKm = Math.round(R * c * 10) / 10;
            }
            return { ...order, distance_km: distanceKm };
        });

        res.json(ApiResponse.success({ orders: enriched }));
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/my-jobs
 * Get jobs assigned to the current worker
 */
router.get('/my-jobs', authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'worker' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Workers only' });
        }

        const { rows: workerRows } = await db.query('SELECT id FROM workers WHERE user_id = $1', [req.user.id]);
        const workerId = workerRows[0]?.id;

        let jobs: any[] = [];
        if (workerId) {
            const { rows } = await db.query(`
                SELECT r.*, u.name as user_name, u.phone as user_phone
                FROM reports r
                JOIN users u ON r.user_id = u.id
                WHERE r.matched_worker_id = $1
                ORDER BY
                    CASE r.status WHEN 'in_progress' THEN 0 WHEN 'matched' THEN 1 ELSE 2 END,
                    r.updated_at DESC
                LIMIT 50
            `, [workerId]);
            jobs = rows;
        }

        res.json(ApiResponse.success({ jobs }));
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
        let params: any[] = [req.user.id];

        if (req.user.role === 'admin' || req.user.role === 'manager') {
            query = 'SELECT * FROM reports WHERE 1=1';
            params = [];
        } else if (req.user.role === 'worker') {
            query = 'SELECT * FROM reports WHERE (user_id = $1 OR matched_worker_id = (SELECT id FROM workers WHERE user_id = $1))';
        }

        if (status) {
            query += ' AND status = $' + (params.length + 1);
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const { rows: reports } = await db.query(query, params);

        res.json(ApiResponse.success({ reports }));
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
            WHERE r.id = $1 AND (
                r.user_id = $2
                OR $3 IN ('admin', 'manager')
                OR ($3 = 'worker' AND r.matched_worker_id = (SELECT id FROM workers WHERE user_id = $2))
            )
        `, [req.params.id, req.user.id, req.user.role]);

        const report = rows[0];

        if (!report) {
            return res.status(404).json(ApiResponse.fail('Report not found'));
        }

        if (report.image_urls) {
            report.image_urls = parseJsonColumn<string[]>(report.image_urls, []);
        }

        res.json(ApiResponse.success({ report }));
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

        const { rows: existing } = await db.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const reportData = existing[0];
        if (reportData.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json(ApiResponse.fail('Not authorized'));
        }

        // State Machine Guard
        if (status && status !== reportData.status) {
            const current = reportData.status;
            let valid = false;
            if (current === 'pending' && ['matching', 'cancelled'].includes(status)) valid = true;
            else if (current === 'matching' && ['matched', 'cancelled', 'broadcasted', 'failed_analysis'].includes(status)) valid = true;
            else if (current === 'broadcasted' && ['matched', 'cancelled'].includes(status)) valid = true;
            else if (current === 'matched' && ['in_progress', 'cancelled'].includes(status)) valid = true;
            else if (current === 'in_progress' && ['completed', 'cancelled'].includes(status)) valid = true;
            else if (['completed', 'cancelled', 'failed_analysis'].includes(current)) valid = false;

            if (!valid && req.user.role !== 'admin') {
                return res.status(400).json(ApiResponse.fail(`Illegal state transition from ${current} to ${status}`));
            }
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

        res.json(ApiResponse.success({ report: updated[0] }, 'Report updated'));
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/reports/:id/accept
 * Worker accepts the job (matched → in_progress)
 */
router.put('/:id/accept', authenticate, async (req, res, next) => {
    try {
        const reportId = req.params.id;

        if (!['worker', 'admin'].includes(req.user.role)) {
            return res.status(403).json(ApiResponse.fail('Only workers can accept jobs'));
        }

        const { rows: reports } = await db.query('SELECT * FROM reports WHERE id = $1', [reportId]);
        if (reports.length === 0) return res.status(404).json({ error: 'Report not found' });
        const report = reports[0];

        if (!['pending', 'matching', 'matched', 'broadcasted'].includes(report.status)) {
            return res.status(400).json(ApiResponse.fail(`Cannot accept a job in "${report.status}" status`));
        }

        const { rows: workers } = await db.query('SELECT * FROM workers WHERE user_id = $1', [req.user.id]);
        const worker = workers[0] || null;

        if (req.user.role === 'worker' && !worker) {
            return res.status(403).json(ApiResponse.fail('Worker profile not found'));
        }

        const isMatchedWorker = !!worker && report.matched_worker_id === worker.id;
        const isPoolJob = !report.matched_worker_id;

        if (!isMatchedWorker && !isPoolJob && req.user.role !== 'admin') {
            return res.status(403).json(ApiResponse.fail('Not authorized to accept this job'));
        }

        const { rows: updated } = await db.query(`
            UPDATE reports
            SET status = 'in_progress',
                matched_worker_id = COALESCE(matched_worker_id, $2),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [reportId, worker?.id ?? null]);

        res.json(ApiResponse.success({ report: updated[0] }, 'Job accepted'));
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

        const { rows: reports } = await db.query('SELECT * FROM reports WHERE id = $1', [reportId]);
        if (reports.length === 0) return res.status(404).json({ error: 'Report not found' });

        const report = reports[0];

        if (report.matched_worker_id === null) {
            return res.status(400).json(ApiResponse.fail('Report is not assigned to any worker'));
        }

        const { rows: workers } = await db.query('SELECT * FROM workers WHERE user_id = $1', [req.user.id]);
        const worker = workers[0];

        if ((!worker || worker.id !== report.matched_worker_id) && req.user.role !== 'admin') {
            return res.status(403).json(ApiResponse.fail('Not authorized'));
        }

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

        await db.query('UPDATE workers SET total_jobs = total_jobs + 1 WHERE id = $1', [report.matched_worker_id]);

        import('../services/learning.js').then(({ learningService }) => {
            learningService.processCompletedReports().catch((err: unknown) =>
                console.error('Learning loop error:', err)
            );
        });

        res.json(ApiResponse.success({ report: updated[0] }, 'Report completed'));
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
            return res.status(403).json(ApiResponse.fail('Not authorized'));
        }

        await db.query('DELETE FROM reports WHERE id = $1', [req.params.id]);

        res.json(ApiResponse.success(null, 'Report deleted'));
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

        // Cross-compatible SQL (works on both PostgreSQL and SQLite)
        const { rows: reports } = await db.query(
            'SELECT * FROM reports WHERE id = $1',
            [reportId]
        );

        if (reports.length === 0) return res.status(404).json({ error: 'Report not found' });

        const report = reports[0];

        // Fetch user assets separately (works on both PostgreSQL and SQLite)
        let userAssets: any[] = [];
        try {
            const { rows: assetRows } = await db.query(
                'SELECT name, brand, model FROM user_assets WHERE user_id = $1',
                [report.user_id]
            );
            userAssets = assetRows;
        } catch {
            // user_assets table may not exist yet
        }

        // Authorize
        if (report.user_id !== req.user.id && req.user.role !== 'admin') {
            if (req.user.role === 'worker' && report.matched_worker_id) {
                const { rows: workers } = await db.query('SELECT id FROM workers WHERE user_id = $1', [req.user.id]);
                if (!workers[0] || workers[0].id !== report.matched_worker_id) {
                    return res.status(403).json(ApiResponse.fail('Not authorized'));
                }
            } else if (req.user.role === 'worker') {
                return res.status(403).json(ApiResponse.fail('Not authorized'));
            }
        }

        const issueContext = {
            title: report.title,
            description: report.description,
            category: report.category,
            status: report.status,
            home_context: userAssets,
            image_urls: report.image_urls
        };

        const plan = await aiService.generateRepairPlan({
            title: issueContext.title,
            description: issueContext.description,
            diagnosis: issueContext.home_context,
        });

        res.json(ApiResponse.success({
            report_id: reportId,
            plan: plan,
            provider: 'DeepSeek R1'
        }));

    } catch (error) {
        next(error);
    }
});

export default router;
