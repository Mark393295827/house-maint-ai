import express, { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.js';
import { ChatMessage } from '../agents/common.js';
import * as Sentry from '@sentry/node';
import { trackAiCost } from '../middleware/aiCostTracker.js';
import { trackInferenceValue } from '../middleware/inferenceValue.js';
import { anonymizeImagePayload } from '../middleware/piplBlur.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function handleAiError(res: Response, error: unknown, publicMessage: string, logLabel: string) {
    console.error(`[AI] ${logLabel}`);
    Sentry.captureException(error);
    res.status(500).json({ error: publicMessage });
}

router.use(authenticate);

// Track AI costs and Inference-to-Value Ratio for all authenticated AI routes
router.use(trackAiCost);
router.use(trackInferenceValue);

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
        handleAiError(res, error, 'Diagnosis failed', 'Diagnosis failed');
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
        handleAiError(res, error, 'Diagnosis conversation failed', 'Diagnosis chat failed');
    }
});

// ──────── Active Inquiry Endpoint ────────

const inquirySchema = z.object({
    image: z.string().optional(),
    mimeType: z.string().optional(),
    locale: z.string().optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string()
    }))
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
        handleAiError(res, error, 'Inquiry conversation failed', 'Inquiry failed');
    }
});

// ──────── Six-Stage Problem-Solving Loop Endpoint ────────

const problemSolvingSchema = z.object({
    image: z.string().optional(),
    mimeType: z.string().optional(),
    locale: z.string().optional(),
    demand: z.object({
        projectType: z.string().optional(),
        area: z.string().optional(),
        scope: z.string().optional(),
        budget: z.string().optional(),
        timeline: z.string().optional(),
        severity: z.enum(['critical', 'moderate', 'low']).optional(),
        specialRequirements: z.string().optional(),
        hasPhoto: z.boolean().optional(),
    }).passthrough(),
    context: z.record(z.any()).optional(),
});

/**
 * POST /api/ai/problem-solving
 * OpenAI/Codex-grade six-stage maintenance problem-solving loop.
 * [PIPL]: Image payload anonymized before hitting LLM.
 */
router.post('/problem-solving', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, locale, demand, context } = problemSolvingSchema.parse(req.body);
        const { result, usage } = await aiService.solveProblem({
            image,
            mimeType,
            locale,
            demand,
            context,
        });
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        handleAiError(res, error, 'Problem-solving loop failed', 'Problem-solving loop failed');
    }
});

// ──────── Structured Diagnostic Helper Endpoints ────────

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
        handleAiError(res, error, 'MECE analysis failed', 'MECE analysis failed');
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
        handleAiError(res, error, 'Hypothesis generation failed', 'Hypothesis generation failed');
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
        handleAiError(res, error, 'Checklist generation failed', 'Checklist generation failed');
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
        handleAiError(res, error, '5-Why analysis failed', '5-Why analysis failed');
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
        handleAiError(res, error, 'Solution generation failed', 'Solution generation failed');
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
        handleAiError(res, error, 'Chat failed', 'Chat failed');
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
        handleAiError(res, error, 'Plan generation failed', 'Plan generation failed');
    }
});

// ──────── 10X Blue Ocean Agent Endpoints ────────

/** S1: Material BOM Generation (材料清单) */
const materialSchema = z.object({
    diagnosisSummary: z.string(),
    category: z.string(),
    locale: z.string().optional()
});

router.post('/material-bom', async (req: Request, res: Response) => {
    try {
        const { diagnosisSummary, category, locale } = materialSchema.parse(req.body);
        const { result, usage } = await aiService.generateMaterialBOM(diagnosisSummary, category, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        handleAiError(res, error, 'Material BOM generation failed', 'Material BOM generation failed');
    }
});

/** S2: Fault Attribution (责任判定) */
const faultSchema = z.object({
    image: z.string().optional(),
    mimeType: z.string().optional(),
    description: z.string().optional(),
    propertyAgeYears: z.number().optional(),
    tenancyMonths: z.number().optional(),
    locale: z.string().optional()
});

router.post('/fault-attribution', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { image, mimeType, description, propertyAgeYears, tenancyMonths, locale } = faultSchema.parse(req.body);
        const { result, usage } = await aiService.assessFault(image, mimeType, description, propertyAgeYears, tenancyMonths, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        handleAiError(res, error, 'Fault attribution failed', 'Fault attribution failed');
    }
});

/** S3: Vacation Rental Turnover Comparison (度假房交接) */
const turnoverSchema = z.object({
    beforeImages: z.array(z.object({ data: z.string(), mimeType: z.string() })),
    afterImages: z.array(z.object({ data: z.string(), mimeType: z.string() })),
    propertyName: z.string().optional(),
    locale: z.string().optional()
});

router.post('/turnover-compare', anonymizeImagePayload, async (req: Request, res: Response) => {
    try {
        const { beforeImages, afterImages, propertyName, locale } = turnoverSchema.parse(req.body);
        const { result, usage } = await aiService.compareTurnover(beforeImages, afterImages, propertyName, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        handleAiError(res, error, 'Turnover comparison failed', 'Turnover comparison failed');
    }
});

/** Research Swarm: Full market research (调研代理群) */
const researchSchema = z.object({
    sector: z.string().min(1),
    focusArea: z.string().optional(),
    currentTAM: z.number().optional(),
    locale: z.string().optional()
});

router.post('/research-market', async (req: Request, res: Response) => {
    try {
        const { sector, focusArea, currentTAM, locale } = researchSchema.parse(req.body);
        const { result, usage } = await aiService.runResearch(sector, focusArea, currentTAM, locale);
        (req as any).aiUsage = usage;
        res.json(result);
    } catch (error) {
        handleAiError(res, error, 'Research swarm failed', 'Research swarm failed');
    }
});


export default router;

