import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { emitToUser } from '../socket.js';

const router = express.Router();

const messageSchema = z.object({
    receiverId: z.coerce.number().int().positive(),
    content: z.string().trim().min(1).max(2000),
    reportId: z.coerce.number().int().positive(),
});

async function canMessageAboutReport(reportId: number, senderId: number, receiverId: number, senderRole: string): Promise<boolean> {
    const { rows } = await db.query<{
        user_id: number;
        worker_user_id: number | null;
    }>(`
        SELECT r.user_id, w.user_id as worker_user_id
        FROM reports r
        LEFT JOIN workers w ON r.matched_worker_id = w.id
        WHERE r.id = $1
    `, [reportId]);

    const report = rows[0];
    if (!report?.worker_user_id) {
        return false;
    }

    const participants = new Set([report.user_id, report.worker_user_id]);
    if (senderRole === 'admin' || senderRole === 'manager') {
        return participants.has(receiverId);
    }

    return participants.has(senderId) && participants.has(receiverId);
}

async function canReadConversation(userId: number, partnerId: number): Promise<boolean> {
    const { rows: existingMessages } = await db.query<{ id: number }>(`
        SELECT id
        FROM messages
        WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)
        LIMIT 1
    `, [userId, partnerId]);

    if (existingMessages.length > 0) {
        return true;
    }

    const { rows: assignedReports } = await db.query<{ id: number }>(`
        SELECT r.id
        FROM reports r
        JOIN workers w ON r.matched_worker_id = w.id
        WHERE (r.user_id = $1 AND w.user_id = $2)
           OR (r.user_id = $2 AND w.user_id = $1)
        LIMIT 1
    `, [userId, partnerId]);

    return assignedReports.length > 0;
}

/**
 * GET /api/messages/conversations
 * List user's conversations (latest message per unique partner)
 */
router.get('/conversations', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get most recent message per conversation partner
        const { rows } = await db.query(`
            SELECT m.*, 
                   u.name as partner_name, u.avatar as partner_avatar,
                   CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as partner_id
            FROM messages m
            JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY m.created_at DESC
        `, [userId]);

        // Deduplicate to keep only the latest message per partner
        const seen = new Set<number>();
        const conversations = rows.filter((row: { partner_id: number;[key: string]: unknown }) => {
            if (seen.has(row.partner_id)) return false;
            seen.add(row.partner_id);
            return true;
        });

        // Count unread per conversation
        const { rows: unreadCounts } = await db.query(`
            SELECT sender_id, COUNT(*) as unread
            FROM messages
            WHERE receiver_id = $1 AND read_at IS NULL
            GROUP BY sender_id
        `, [userId]);

        const unreadMap = new Map(unreadCounts.map((r: { sender_id: number; unread: number;[key: string]: unknown }) => [r.sender_id, r.unread]));

        const enriched = conversations.map((c: { partner_id: number;[key: string]: unknown }) => ({
            ...c,
            unread: unreadMap.get(c.partner_id) || 0,
        }));

        res.json({ conversations: enriched });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/messages/:partnerId
 * Get messages between current user and a partner
 */
router.get('/:partnerId', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const partnerIdResult = z.coerce.number().int().positive().safeParse(req.params.partnerId);
        if (!partnerIdResult.success) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const partnerId = partnerIdResult.data;
        const limitResult = z.coerce.number().int().min(1).max(100).default(50).safeParse(req.query.limit);
        const limit = limitResult.success ? limitResult.data : 50;
        const before = req.query.before as string; // ISO date for pagination

        const authorized = await canReadConversation(userId, partnerId);
        if (!authorized) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        let query = `
            SELECT m.*, 
                   su.name as sender_name, su.avatar as sender_avatar,
                   ru.name as receiver_name
            FROM messages m
            JOIN users su ON m.sender_id = su.id
            JOIN users ru ON m.receiver_id = ru.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1)
        `;
        const params: unknown[] = [userId, partnerId];

        if (before) {
            params.push(before);
            query += ` AND m.created_at < $${params.length}`;
        }

        params.push(limit);
        query += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

        const { rows: messages } = await db.query(query, params);

        // Mark unread messages from partner as read
        await db.query(
            `UPDATE messages SET read_at = CURRENT_TIMESTAMP
             WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
            [partnerId, userId]
        );

        res.json({ messages: messages.reverse() }); // Return in chronological order
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/messages
 * Send a message
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const parsed = messageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid message', details: parsed.error.format() });
        }

        const { receiverId, content, reportId } = parsed.data;
        const senderId = req.user.id;

        if (senderId === receiverId) {
            return res.status(400).json({ error: 'Cannot message yourself' });
        }

        const authorized = await canMessageAboutReport(reportId, senderId, receiverId, req.user.role);
        if (!authorized) {
            return res.status(403).json({ error: 'Messaging is only available for assigned report participants' });
        }

        // Insert message
        const { rows } = await db.query(`
            INSERT INTO messages (sender_id, receiver_id, report_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [senderId, receiverId, reportId, content]);

        const message = rows[0] || { id: Date.now(), sender_id: senderId, receiver_id: receiverId, content, created_at: new Date().toISOString() };

        // Real-time delivery via Socket.IO
        emitToUser(receiverId, 'new_message', {
            ...message,
            sender_name: req.user.name,
        });

        res.status(201).json({ message });
    } catch (error) {
        next(error);
    }
});

export default router;
