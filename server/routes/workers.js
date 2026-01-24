import { Router } from 'express';
import db from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

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
 */
router.get('/', optionalAuth, (req, res) => {
    const { skill, available = 1 } = req.query;

    let query = `
        SELECT w.*, u.name, u.phone, u.avatar
        FROM workers w
        JOIN users u ON w.user_id = u.id
        WHERE w.available = ?
    `;
    const params = [parseInt(available)];

    if (skill) {
        query += ` AND w.skills LIKE ?`;
        params.push(`%${skill}%`);
    }

    query += ' ORDER BY w.rating DESC';

    const workers = db.prepare(query).all(...params);

    // Parse skills JSON
    workers.forEach(w => {
        w.skills = JSON.parse(w.skills || '[]');
    });

    res.json({ workers });
});

/**
 * GET /api/workers/match
 * Get matched workers for a report
 */
router.get('/match', authenticate, (req, res) => {
    const { report_id, latitude, longitude, category, limit = 5 } = req.query;

    // Get report if report_id provided
    let report = null;
    if (report_id) {
        report = db.prepare('SELECT * FROM reports WHERE id = ?').get(report_id);
    } else {
        report = {
            latitude: parseFloat(latitude) || null,
            longitude: parseFloat(longitude) || null,
            category: category || null
        };
    }

    // Get available workers
    const workers = db.prepare(`
        SELECT w.*, u.name, u.phone, u.avatar
        FROM workers w
        JOIN users u ON w.user_id = u.id
        WHERE w.available = 1
    `).all();

    // Calculate match scores
    const matchedWorkers = workers.map(worker => {
        const scores = calculateMatchScore(worker, report);
        return {
            ...worker,
            skills: JSON.parse(worker.skills || '[]'),
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
});

/**
 * GET /api/workers/:id
 * Get worker details
 */
router.get('/:id', optionalAuth, (req, res) => {
    const worker = db.prepare(`
        SELECT w.*, u.name, u.phone, u.avatar
        FROM workers w
        JOIN users u ON w.user_id = u.id
        WHERE w.id = ?
    `).get(req.params.id);

    if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
    }

    worker.skills = JSON.parse(worker.skills || '[]');

    // Get recent reviews
    const reviews = db.prepare(`
        SELECT r.*, u.name as reviewer_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.worker_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
    `).all(req.params.id);

    res.json({ worker, reviews });
});

/**
 * PUT /api/workers/:id/availability
 * Update worker availability
 */
router.put('/:id/availability', authenticate, (req, res) => {
    const { available } = req.body;

    // Check if user owns this worker profile
    const worker = db.prepare('SELECT * FROM workers WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.user.id);

    if (!worker && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('UPDATE workers SET available = ? WHERE id = ?')
        .run(available ? 1 : 0, req.params.id);

    res.json({ message: 'Availability updated' });
});

export default router;
