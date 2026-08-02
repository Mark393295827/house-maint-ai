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

async function insertFeedback(input: {
    userId: number;
    diagnosisData?: unknown;
    isHelpful: boolean;
    comment?: string;
}) {
    const diagnosisJson = input.diagnosisData ? JSON.stringify(input.diagnosisData) : null;
    const helpfulValue = input.isHelpful ? 1 : 0;
    const legacyType = input.isHelpful ? 'thumbs_up' : 'thumbs_down';
    const legacyRating = input.isHelpful ? 5 : 1;
    const comment = input.comment || null;

    const attempts = [
        {
            sql: `INSERT INTO ai_feedback (user_id, diagnosis_data, is_helpful, type, rating, comment)
                  VALUES ($1, $2, $3, $4, $5, $6)`,
            params: [input.userId, diagnosisJson, helpfulValue, legacyType, legacyRating, comment]
        },
        {
            sql: `INSERT INTO ai_feedback (user_id, diagnosis_data, is_helpful, comment)
                  VALUES ($1, $2, $3, $4)`,
            params: [input.userId, diagnosisJson, helpfulValue, comment]
        },
        {
            sql: `INSERT INTO ai_feedback (user_id, rating, type, comment)
                  VALUES ($1, $2, $3, $4)`,
            params: [input.userId, legacyRating, legacyType, comment]
        }
    ];

    let lastError: unknown;
    for (const attempt of attempts) {
        try {
            await db.query(attempt.sql, attempt.params);
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

/**
 * POST /api/ai/feedback
 * Submit feedback on an AI diagnosis result
 */
router.post('/', authenticate, async (req, res, _next) => {
    try {
        const parsed = feedbackSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid feedback data', details: parsed.error.format() });
        }

        const { diagnosisData, isHelpful, comment } = parsed.data;
        await insertFeedback({
            userId: req.user.id,
            diagnosisData,
            isHelpful,
            comment
        });

        return res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Feedback submission error:', error);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

export default router;
