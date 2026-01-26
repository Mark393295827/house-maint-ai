import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// 接收反馈事件
router.post('/', async (req, res, next) => {
    try {
        const { session_id, event_type, data } = req.body;

        if (!session_id || !event_type) {
            return res.status(400).json({ error: 'Missing required fields: session_id, event_type' });
        }

        const allowedEvents = ['view', 'accept', 'correct', 'reject', 'rating_explicit', 'implicit_signal'];
        if (!allowedEvents.includes(event_type)) {
            return res.status(400).json({ error: 'Invalid event_type' });
        }

        // Store JSON data as string if it's an object
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;

        await db.run(`
            INSERT INTO feedback_events (session_id, event_type, data)
            VALUES ($1, $2, $3)
        `, [session_id, event_type, dataStr]);

        res.status(201).json({ success: true, message: 'Feedback recorded' });
    } catch (error) {
        console.error('Error recording feedback:', error);
        next(error);
    }
});

// Admin: List feedback events
router.get('/', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const events = await db.all(`
            SELECT * FROM feedback_events 
            ORDER BY timestamp DESC 
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        // Parse data JSON string back to object
        const parsedEvents = events.map(event => ({
            ...event,
            data: typeof event.data === 'string' ? JSON.parse(event.data || '{}') : (event.data || {})
        }));

        res.json(parsedEvents);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        next(error);
    }
});

// 获取反馈统计 (Simple aggregation for dev verification)
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await db.all(`
            SELECT event_type, COUNT(*) as count 
            FROM feedback_events 
            GROUP BY event_type
        `, []);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        next(error);
    }
});

export default router;
