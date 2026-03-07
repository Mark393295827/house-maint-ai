import express from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';
import type { NotificationType } from '../types/models.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get user's notifications with unread count
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { rows: notifications } = await db.query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.id]);

        const { rows: countResult } = await db.query(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
            [req.user.id]
        );

        res.json({
            notifications,
            unreadCount: parseInt(countResult[0]?.count || '0'),
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authenticate, async (req, res, next) => {
    try {
        await db.query(
            `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req, res, next) => {
    try {
        await db.query(
            `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL`,
            [req.user.id]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
});

/**
 * Helper: Create a notification and emit via Socket.IO
 * Used by other routes (payments, messages, jobs)
 */
export async function createNotification(userId: number, type: NotificationType, title: string, body?: string, data?: Record<string, unknown>) {
    try {
        await db.query(
            `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, $2, $3, $4, $5)`,
            [userId, type, title, body || null, data ? JSON.stringify(data) : null]
        );
        emitToUser(userId, 'new_notification', { type, title, body });
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
}

export default router;
