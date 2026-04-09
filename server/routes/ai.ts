import express, { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.js';
import { ChatMessage } from '../agents/common.js';
import * as Sentry from '@sentry/node';
import { trackAiCost } from '../middleware/aiCostTracker.js';
import { trackInferenceValue } from '../middleware/inferenceValue.js';
import { anonymizeImagePayload } from '../middleware/piplBlur.js';

const router = express.Router();
const AI_INLINE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BASE64_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 40;
const MAX_CONTEXT_JSON_LENGTH = 12000;

function stripDataUrlPrefix(value: string): string {
    return value.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
}

function estimateBase64Size(value: string): number {
    const normalized = stripDataUrlPrefix(value);
    const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

const base64ImageSchema = z.string()
    .min(1, 'Image payload is required')
    .refine((value) => /^[A-Za-z0-9+/=]+$/.test(stripDataUrlPrefix(value)), 'Image payload must be base64 encoded')
    .refine((value) => estimateBase64Size(value) <= MAX_BASE64_IMAGE_BYTES, 'Image payload exceeds 5MB limit');

const localeSchema = z.string().trim().min(2).max(12);
const historyMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
});

const boundedContextSchema = z.record(z.any()).refine(
    (value) => JSON.stringify(value).length <= MAX_CONTEXT_JSON_LENGTH,
    'Context payload is too large'
);

// Track AI costs and Inference-to-Value Ratio for all routes
router.use(trackAiCost);
router.use(trackInferenceValue);

// Schema for diagnosis
const diagnoseSchema = z.object({
    image: base64ImageSchema.optional(),
    mimeType: z.enum(AI_INLINE_MIME_TYPES).optional(),
    text: z.string().trim().min(1).max(MAX_TEXT_LENGTH).optional()
});

// Schema for chat/plan
const chatSchema = z.object({
    messages: z.array(historyMessageSchema).min(1).max(MAX_HISTORY_MESSAGES),
});

const planSchema = z.object({
    issueDetails: boundedContextSchema
});

function sendAiError(res: Response, error: unknown, fallbackMessage: string) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: error.errors,
        });
    }

    Sentry.captureException(error);
    return res.status(500).json({
        error: fallbackMessage,
        details: error instanceof Error ? error.message : String(error),
    });
}

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
        return sendAiError(res, error, 'Diagnosis failed');
    }
});

/**
 * POST /api/ai/diagnose/chat
 * Multi-turn diagnosis conversation with follow-up Q&A
 */
const diagnoseChatSchema = z.object({
    image: base64ImageSchema.optional(),
    mimeType: z.enum(AI_INLINE_MIME_TYPES).optional(),
    history: z.array(historyMessageSchema).min(1).max(MAX_HISTORY_MESSAGES)
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
        return sendAiError(res, error, 'Diagnosis conversation failed');
    }
});

// ──────── Active Inquiry Endpoint ────────

const inquirySchema = z.object({
    image: base64ImageSchema.optional(),
    mimeType: z.enum(AI_INLINE_MIME_TYPES).optional(),
    locale: localeSchema.optional(),
    history: z.array(historyMessageSchema).min(1).max(MAX_HISTORY_MESSAGES)
});

/**
 * POST /api/ai/diagnose/inquiry
 * Progressive inquiry conversation — AI asks targeted questions to gather project info
 */
router.post('/diagnose/inquiry', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, locale, history } = inquirySchema.parse(req.body);
        const { result, usage } = await aiService.inquiryConversation(
            history as ChatMessage[], image, mimeType, locale
        );
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        console.error('AI Inquiry Error:', error);
        return sendAiError(res, error, 'Inquiry conversation failed');
    }
});

// ──────── 8-Step Diagnostic Flow Endpoints ────────

const stepSchema = z.object({
    image: base64ImageSchema.optional(),
    mimeType: z.enum(AI_INLINE_MIME_TYPES).optional(),
    text: z.string().trim().min(1).max(MAX_TEXT_LENGTH).optional(),
    locale: localeSchema.optional(),
    category: z.string().trim().min(1).max(120).optional(),
    hypothesis: z.string().trim().min(1).max(MAX_TEXT_LENGTH).optional(),
    rootCause: z.string().trim().min(1).max(MAX_TEXT_LENGTH).optional(),
    context: boundedContextSchema.optional(),
    history: z.array(historyMessageSchema).max(MAX_HISTORY_MESSAGES).optional()
});

/** Step 2: MECE Category Analysis */
router.post('/diagnose/mece', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, text, locale } = stepSchema.parse(req.body);
        const { result, usage } = await aiService.meceAnalysis(image, mimeType, text, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        return sendAiError(res, error, 'MECE analysis failed');
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
        return sendAiError(res, error, 'Hypothesis generation failed');
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
        return sendAiError(res, error, 'Checklist generation failed');
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
        return sendAiError(res, error, '5-Why analysis failed');
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
        return sendAiError(res, error, 'Solution generation failed');
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
        return sendAiError(res, error, 'Chat failed');
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
        return sendAiError(res, error, 'Plan generation failed');
    }
});

// ──────── 10X Blue Ocean Agent Endpoints ────────

/** S1: Material BOM Generation (材料清单) */
const materialSchema = z.object({
    diagnosisSummary: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
    category: z.string().trim().min(1).max(120),
    locale: localeSchema.optional()
});

router.post('/material-bom', async (req: Request, res: Response) => {
    try {
        const { diagnosisSummary, category, locale } = materialSchema.parse(req.body);
        const { result, usage } = await aiService.generateMaterialBOM(diagnosisSummary, category, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        return sendAiError(res, error, 'Material BOM generation failed');
    }
});

/** S2: Fault Attribution (责任判定) */
const faultSchema = z.object({
    image: base64ImageSchema.optional(),
    mimeType: z.enum(AI_INLINE_MIME_TYPES).optional(),
    description: z.string().trim().min(1).max(MAX_TEXT_LENGTH).optional(),
    propertyAgeYears: z.number().optional(),
    tenancyMonths: z.number().optional(),
    locale: localeSchema.optional()
});

router.post('/fault-attribution', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, description, propertyAgeYears, tenancyMonths, locale } = faultSchema.parse(req.body);
        const { result, usage } = await aiService.assessFault(image, mimeType, description, propertyAgeYears, tenancyMonths, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        return sendAiError(res, error, 'Fault attribution failed');
    }
});

/** S3: Vacation Rental Turnover Comparison (度假房交接) */
const turnoverSchema = z.object({
    beforeImages: z.array(z.object({ data: base64ImageSchema, mimeType: z.enum(AI_INLINE_MIME_TYPES) })).min(1).max(10),
    afterImages: z.array(z.object({ data: base64ImageSchema, mimeType: z.enum(AI_INLINE_MIME_TYPES) })).min(1).max(10),
    propertyName: z.string().trim().min(1).max(200).optional(),
    locale: localeSchema.optional()
});

router.post('/turnover-compare', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { beforeImages, afterImages, propertyName, locale } = turnoverSchema.parse(req.body);
        const { result, usage } = await aiService.compareTurnover(beforeImages, afterImages, propertyName, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        return sendAiError(res, error, 'Turnover comparison failed');
    }
});

/** Research Swarm: Full market research (调研代理群) */
const researchSchema = z.object({
    sector: z.string().trim().min(1).max(200),
    focusArea: z.string().trim().min(1).max(400).optional(),
    currentTAM: z.number().nonnegative().optional(),
    locale: localeSchema.optional()
});

router.post('/research-market', async (req: Request, res: Response) => {
    try {
        const { sector, focusArea, currentTAM, locale } = researchSchema.parse(req.body);
        const { result, usage } = await aiService.runResearch(sector, focusArea, currentTAM, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        return sendAiError(res, error, 'Research swarm failed');
    }
});


export default router;

