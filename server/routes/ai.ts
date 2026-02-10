import express, { Request, Response } from 'express';
import { z } from 'zod';
import { aiService, ChatMessage } from '../services/ai.js';
import * as Sentry from '@sentry/node';

const router = express.Router();

// Schema for diagnosis
const diagnoseSchema = z.object({
    image: z.string().optional(), // base64
    mimeType: z.string().optional(),
    text: z.string().optional()
});

// Schema for chat/plan
const chatSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string()
    }))
});

const planSchema = z.object({
    issueDetails: z.record(z.any())
});

/**
 * POST /api/ai/diagnose
 * Diagnose issue using Multimodal AI (Gemini)
 */
router.post('/diagnose', async (req: Request, res: Response) => {
    try {
        const { image, mimeType, text } = diagnoseSchema.parse(req.body);
        const result = await aiService.diagnoseIssue(image, mimeType, text);
        res.json(result);
    } catch (error: any) {
        console.error('AI Diagnosis Error:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Diagnosis failed',
            details: error.message
        });
    }
});

/**
 * POST /api/ai/chat
 * Chat with Expert AI (DeepSeek R1)
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { messages } = chatSchema.parse(req.body);
        const reply = await aiService.chatWithExpert(messages as ChatMessage[]);
        res.json({ role: 'assistant', content: reply });
    } catch (error: any) {
        console.error('AI Chat Error:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Chat failed',
            details: error.message
        });
    }
});

/**
 * POST /api/ai/plan
 * Generate Repair Plan (DeepSeek R1)
 */
router.post('/plan', async (req: Request, res: Response) => {
    try {
        const { issueDetails } = planSchema.parse(req.body);
        const plan = await aiService.generateRepairPlan(issueDetails);
        res.json({ plan });
    } catch (error: any) {
        console.error('AI Plan Error:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Plan generation failed',
            details: error.message
        });
    }
});

export default router;
