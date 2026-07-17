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

async function saveReview(input: {
    reportId: number | string;
    userId: number;
    workerId: number;
    rating: number;
    comment?: string;
    photos?: string[];
}) {
    const comment = input.comment || null;
    const photosJson = input.photos ? JSON.stringify(input.photos) : null;

    const updateAttempts = [
        {
            sql: `UPDATE reviews
                  SET rating = $1,
                      comment = $2,
                      photos = $3,
                      created_at = CURRENT_TIMESTAMP
                  WHERE report_id = $4
                  RETURNING *`,
            params: [input.rating, comment, photosJson, input.reportId]
        },
        {
            sql: `UPDATE reviews
                  SET rating = $1,
                      comment = $2,
                      created_at = CURRENT_TIMESTAMP
                  WHERE report_id = $3
                  RETURNING *`,
            params: [input.rating, comment, input.reportId]
        }
    ];

    for (const attempt of updateAttempts) {
        try {
            const result = await db.query(attempt.sql, attempt.params);
            if (result.rowCount && result.rows[0]) {
                return result.rows[0];
            }
        } catch {
            // Try the older schema shape that does not have photos.
        }
    }

    const insertAttempts = [
        {
            sql: `INSERT INTO reviews (report_id, user_id, worker_id, rating, comment, photos)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  RETURNING *`,
            params: [input.reportId, input.userId, input.workerId, input.rating, comment, photosJson]
        },
        {
            sql: `INSERT INTO reviews (report_id, user_id, worker_id, rating, comment)
                  VALUES ($1, $2, $3, $4, $5)
                  RETURNING *`,
            params: [input.reportId, input.userId, input.workerId, input.rating, comment]
        }
    ];

    let lastError: unknown;
    for (const attempt of insertAttempts) {
        try {
            const { rows } = await db.query(attempt.sql, attempt.params);
            return rows[0];
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

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

        // 2. Insert or update review. Keep this tolerant of older DBs without photos/unique index.
        const review = await saveReview({
            reportId,
            userId: req.user.id,
            workerId: report.matched_worker_id,
            rating: data.rating,
            comment: data.comment,
            photos: data.photos
        });

        // 3. Update worker's average rating (denormalized for quick access)
        // In a real system, this might be triggered by a hook or view sync
        await db.query(`
            UPDATE workers 
            SET rating = (SELECT AVG(rating) FROM reviews WHERE worker_id = $1)
            WHERE id = $2
        `, [report.matched_worker_id, report.matched_worker_id]);

        res.status(201).json({
            message: 'Review submitted successfully',
            review
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
                } catch { r.photos = []; }
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
                } catch { r.photos = []; }
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
