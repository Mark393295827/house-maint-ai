import express, { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.js';
import { ChatMessage } from '../agents/common.js';
import * as Sentry from '@sentry/node';
import { trackAiCost } from '../middleware/aiCostTracker.js';
import { anonymizeImagePayload } from '../middleware/piplBlur.js';

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
 * Diagnose issue using Multimodal AI (Gemini/DeepSeek)
 * [PIPL]: Image payload anonymized before hitting LLM
 */
router.post('/diagnose', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, text } = diagnoseSchema.parse(req.body);
        const { result, usage } = await aiService.diagnoseIssue(image, mimeType, text);

        // Attach usage for middleware tracking
        (req as any).aiUsage = usage;

        res.json(result);
    } catch (error) {
        console.error('AI Diagnosis Error:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Diagnosis failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/ai/diagnose/chat
 * Multi-turn diagnosis conversation with follow-up Q&A
 */
const diagnoseChatSchema = z.object({
    image: z.string().optional(),
    mimeType: z.string().optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string()
    }))
});

router.post('/diagnose/chat', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, history } = diagnoseChatSchema.parse(req.body);
        const { result, usage } = await aiService.continueDiagnosis(
            history as ChatMessage[], image, mimeType
        );
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        console.error('AI Diagnosis Chat Error:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Diagnosis conversation failed', details: error instanceof Error ? error.message : String(error) });
    }
});

// ──────── 8-Step Diagnostic Flow Endpoints ────────

const stepSchema = z.object({
    image: z.string().optional(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    locale: z.string().optional(),
    category: z.string().optional(),
    hypothesis: z.string().optional(),
    rootCause: z.string().optional(),
    context: z.record(z.any()).optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string()
    })).optional()
});

/** Step 2: MECE Category Analysis */
router.post('/diagnose/mece', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, text, locale } = stepSchema.parse(req.body);
        const { result, usage } = await aiService.meceAnalysis(image, mimeType, text, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: 'MECE analysis failed', details: error instanceof Error ? error.message : String(error) });
    }
});

/** Step 3: Hypothesis Generation */
router.post('/diagnose/hypothesis', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { category, image, mimeType, text, locale } = stepSchema.parse(req.body);
        if (!category) return res.status(400).json({ error: 'category is required' });
        const { result, usage } = await aiService.hypothesisGeneration(category, image, mimeType, text, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: 'Hypothesis generation failed', details: error instanceof Error ? error.message : String(error) });
    }
});

/** Step 4: Data Collection Checklist */
router.post('/diagnose/checklist', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { hypothesis, image, mimeType, text, locale } = stepSchema.parse(req.body);
        if (!hypothesis) return res.status(400).json({ error: 'hypothesis is required' });
        const { result, usage } = await aiService.checklistGeneration(hypothesis, image, mimeType, text, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: 'Checklist generation failed', details: error instanceof Error ? error.message : String(error) });
    }
});

/** Step 5: 5-Why Dialog Analysis */
router.post('/diagnose/five-why', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { history, context, image, mimeType, locale } = stepSchema.parse(req.body);
        const { result, usage } = await aiService.fiveWhyAnalysis(
            (history || []) as ChatMessage[], context || {}, image, mimeType, locale
        );
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: '5-Why analysis failed', details: error instanceof Error ? error.message : String(error) });
    }
});

/** Step 6: Solution Generation */
router.post('/diagnose/solution', async (req: Request, res: Response) => {
    try {
        const { rootCause, context, locale } = stepSchema.parse(req.body);
        if (!rootCause) return res.status(400).json({ error: 'rootCause is required' });
        const { result, usage } = await aiService.solutionGeneration(rootCause, context || {}, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: 'Solution generation failed', details: error instanceof Error ? error.message : String(error) });
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
    } catch (error) {
        console.error('AI Chat Error:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Chat failed',
            details: error instanceof Error ? error.message : String(error)
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
    } catch (error) {
        console.error('AI Plan Error:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Plan generation failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});


export default router;
