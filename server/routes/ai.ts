import express, { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.js';
import { ChatMessage } from '../agents/common.js';
import * as Sentry from '@sentry/node';
import { trackAiCost } from '../middleware/aiCostTracker.js';

const router = express.Router();

// Track AI costs for all routes in this router
router.use(trackAiCost);

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
        const { result, usage } = await aiService.diagnoseIssue(image, mimeType, text);

        // Attach usage for middleware tracking
        (req as any).aiUsage = usage;

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
        const { result: reply, usage } = await aiService.chatWithExpert(messages as ChatMessage[]);

        // Attach usage
        (req as any).aiUsage = usage;

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
        const { result: plan, usage } = await aiService.generateRepairPlan(issueDetails as any);

        // Attach usage
        (req as any).aiUsage = usage;

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
