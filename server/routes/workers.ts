import express from 'express';
import db from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';

const router = express.Router();

/**
 * 匹配度计算公式: S = w1*D + w2*R + w3*T
 * D = 距离分数, R = 评价分数, T = 技能匹配分数
 */
const DEFAULT_WEIGHTS = {
    w1: 0.3, // 距离权重
    w2: 0.4, // 评价权重
    w3: 0.3, // 技能权重
};

function calculateDistanceScore(workerLat, workerLng, userLat, userLng, maxDistance = 10) {
    if (!workerLat || !workerLng || !userLat || !userLng) return 50;

    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = (userLat - workerLat) * Math.PI / 180;
    const dLng = (userLng - workerLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(workerLat * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance >= maxDistance) return 0;
    return Math.round((1 - distance / maxDistance) * 100);
}

function calculateRatingScore(rating) {
    return Math.round((rating / 5) * 100);
}

function calculateSkillScore(workerSkills, requiredCategory) {
    if (!requiredCategory) return 100;
    const skills = JSON.parse(workerSkills || '[]');
    return skills.includes(requiredCategory) ? 100 : 50;
}

function calculateMatchScore(worker, report, weights = DEFAULT_WEIGHTS) {
    const D = calculateDistanceScore(
        worker.latitude, worker.longitude,
        report.latitude, report.longitude
    );
    const R = calculateRatingScore(worker.rating);
    const T = calculateSkillScore(worker.skills, report.category);

    const score = Math.round(weights.w1 * D + weights.w2 * R + weights.w3 * T);

    return {
        score,
        distanceScore: D,
        ratingScore: R,
        skillScore: T
    };
}

/**
 * GET /api/workers
 * Get all available workers
 * Cached for 5 minutes
 */
router.get('/', optionalAuth, cacheMiddleware(300), async (req, res, next) => {
    try {
        const { skill, available } = req.query;
        const isAvailable = available ? parseInt(available as string) : 1;

        let query = `
            SELECT w.*, u.name, u.phone, u.avatar
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE w.available = $1
        `;
        const params: any[] = [isAvailable];

        if (skill) {
            query += ` AND w.skills LIKE $2`;
            params.push(`%${skill}%`);
        }

        query += ' ORDER BY w.rating DESC';

        const { rows: workers } = await db.query(query, params);

        // Parse skills JSON
        workers.forEach(w => {
            try {
                w.skills = JSON.parse(w.skills || '[]');
            } catch (e) { w.skills = []; }
        });

        res.json({ workers });
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
        const { report_id, latitude, longitude, category, limit = 5 } = req.query as any;

        // Get report if report_id provided
        let report: any = null;
        if (report_id) {
            const { rows } = await db.query('SELECT * FROM reports WHERE id = $1', [report_id]);
            report = rows[0];
        } else {
            report = {
                latitude: parseFloat(latitude) || null,
                longitude: parseFloat(longitude) || null,
                category: category || null
            };
        }

        // Get available workers
        const { rows: workers } = await db.query(`
            SELECT w.*, u.name, u.phone, u.avatar
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE w.available = 1
        `);

        // Calculate match scores
        const matchedWorkers = workers.map(worker => {
            const scores = calculateMatchScore(worker, report);
            try {
                worker.skills = JSON.parse(worker.skills || '[]');
            } catch (e) { worker.skills = []; }

            return {
                ...worker,
                ...scores
            };
        });

        // Sort by score descending
        matchedWorkers.sort((a, b) => b.score - a.score);

        // Return top matches
        const topMatches = matchedWorkers.slice(0, parseInt(limit));

        res.json({
            matches: topMatches,
            total: workers.length
        });
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
        const { rows: workers } = await db.query(`
            SELECT w.*, u.name, u.phone, u.avatar
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE w.id = $1
        `, [req.params.id]);

        const worker = workers[0];

        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }

        try {
            worker.skills = JSON.parse(worker.skills || '[]');
        } catch (e) { worker.skills = []; }

        const { rows: reviews } = await db.query(`
            SELECT r.*, u.name as reviewer_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.worker_id = $1
            ORDER BY r.created_at DESC
            LIMIT 5
        `, [req.params.id]);

        res.json({ worker, reviews });
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
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('UPDATE workers SET available = $1 WHERE id = $2', [available ? 1 : 0, req.params.id]);

        // Clear cache for this worker and general list
        await clearCache(`workers`);

        res.json({ message: 'Availability updated' });
    } catch (error) {
        next(error);
    }
});

export default router;
