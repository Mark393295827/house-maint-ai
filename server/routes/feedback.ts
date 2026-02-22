import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation schema
const feedbackSchema = z.object({
    diagnosisData: z.any().optional(),
    isHelpful: z.boolean(),
    comment: z.string().optional(),
});

/**
 * POST /api/ai/feedback
 * Submit feedback on an AI diagnosis result
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const parsed = feedbackSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid feedback data', details: parsed.error.format() });
        }

        const { diagnosisData, isHelpful, comment } = parsed.data;
        const userId = (req as any).user?.id;

        await db.query(
            `INSERT INTO ai_feedback (user_id, diagnosis_data, is_helpful, comment)
             VALUES ($1, $2, $3, $4)`,
            [
                userId || null,
                diagnosisData ? JSON.stringify(diagnosisData) : null,
                isHelpful ? 1 : 0,
                comment || null
            ]
        );

        return res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Feedback submission error:', error);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

export default router;
