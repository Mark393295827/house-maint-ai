import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// 接收反馈事件
router.post('/', (req, res) => {
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

        const stmt = db.prepare(`
            INSERT INTO feedback_events (session_id, event_type, data)
            VALUES (?, ?, ?)
        `);

        stmt.run(session_id, event_type, dataStr);

        res.status(201).json({ success: true, message: 'Feedback recorded' });
    } catch (error) {
        console.error('Error recording feedback:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 获取反馈统计 (Simple aggregation for dev verification)
router.get('/stats', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT event_type, COUNT(*) as count 
            FROM feedback_events 
            GROUP BY event_type
        `).all();

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
