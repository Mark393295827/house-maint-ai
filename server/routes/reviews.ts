import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation schema
const reviewSchema = z.object({
    booking_id: z.union([z.number(), z.string()]), // Client uses booking_id, we map to report_id
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    photos: z.array(z.string()).optional()
});

/**
 * POST /api/reviews
 * Submit a review
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const data = reviewSchema.parse(req.body);
        const reportId = data.booking_id;

        // 1. Verify report exists and belongs to user
        const { rows: reports } = await db.query(
            'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
            [reportId, req.user.id]
        );

        if (reports.length === 0) {
            return res.status(404).json({ error: 'Maintenance job not found or not owned by you' });
        }

        const report = reports[0];
        if (report.status !== 'completed') {
            return res.status(400).json({ error: 'Can only review completed jobs' });
        }

        if (!report.matched_worker_id) {
            return res.status(400).json({ error: 'Job has no assigned worker to review' });
        }

        // 2. Insert review
        const { rows } = await db.query(`
            INSERT INTO reviews (report_id, user_id, worker_id, rating, comment, photos)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (report_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                comment = EXCLUDED.comment,
                photos = EXCLUDED.photos,
                created_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            reportId,
            req.user.id,
            report.matched_worker_id,
            data.rating,
            data.comment || null,
            data.photos ? JSON.stringify(data.photos) : null
        ]);

        // 3. Update worker's average rating (denormalized for quick access)
        // In a real system, this might be triggered by a hook or view sync
        await db.query(`
            UPDATE workers 
            SET rating = (SELECT AVG(rating) FROM reviews WHERE worker_id = $1)
            WHERE id = $2
        `, [report.matched_worker_id, report.matched_worker_id]);

        res.status(201).json({
            message: 'Review submitted successfully',
            review: rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reviews/worker/:id
 * Get reviews for a specific worker
 */
router.get('/worker/:id', async (req, res, next) => {
    try {
        const { rows: reviews } = await db.query(`
            SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.worker_id = $1
            ORDER BY r.created_at DESC
        `, [req.params.id]);

        // Parse photos JSON
        reviews.forEach(r => {
            if (r.photos) {
                try {
                    r.photos = JSON.parse(r.photos);
                } catch (e) { r.photos = []; }
            } else {
                r.photos = [];
            }
        });

        res.json({ reviews });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reviews/user/:id
 * Get review history for a specific user
 */
router.get('/user/:id', authenticate, async (req, res, next) => {
    try {
        // Authorize: can only see own history or admin
        if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { rows: reviews } = await db.query(`
            SELECT r.*, w.id as worker_id, wu.name as worker_name, wu.avatar as worker_avatar
            FROM reviews r
            JOIN workers w ON r.worker_id = w.id
            JOIN users wu ON w.user_id = wu.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `, [req.params.id]);

        // Parse photos JSON
        reviews.forEach(r => {
            if (r.photos) {
                try {
                    r.photos = JSON.parse(r.photos);
                } catch (e) { r.photos = []; }
            } else {
                r.photos = [];
            }
        });

        res.json({ reviews });
    } catch (error) {
        next(error);
    }
});

export default router;
