import express, { Request, Response } from 'express';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { aiService } from '../services/ai.js';
import { executiveAgentService } from '../services/executive.js';
import { aiUsageService } from '../services/aiUsage.js';
import { authenticate } from '../middleware/auth.js';
import { trackAiCost } from '../middleware/aiCostTracker.js';
import { trackInferenceValue } from '../middleware/inferenceValue.js';
import { anonymizeImagePayload } from '../middleware/piplBlur.js';

const router = express.Router();

function handleAgentError(res: Response, error: unknown, publicMessage: string, logLabel: string) {
    console.error(`[AgentRoute] ${logLabel}:`, error);
    Sentry.captureException(error);
    res.status(500).json({ error: publicMessage });
}

// All agent routes require authentication and track costs & inference value
router.use(authenticate);
router.use(trackAiCost);
router.use(trackInferenceValue);

// Request Schemas
const materialSchema = z.object({
    diagnosisSummary: z.string().min(1, 'diagnosisSummary is required'),
    category: z.string().min(1, 'category is required'),
    locale: z.string().optional()
});

const faultSchema = z.object({
    image: z.string().optional(),
    mimeType: z.string().optional(),
    description: z.string().optional(),
    propertyAgeYears: z.number().optional(),
    tenancyMonths: z.number().optional(),
    locale: z.string().optional()
});

const turnoverSchema = z.object({
    beforeImages: z.array(z.object({ data: z.string(), mimeType: z.string() })).default([]),
    afterImages: z.array(z.object({ data: z.string(), mimeType: z.string() })).default([]),
    propertyName: z.string().optional(),
    locale: z.string().optional()
});

/**
 * POST /api/v1/agents/material (and /material-bom)
 * S1: Material & Cost Prediction Agent (BOM & Sanya Pricing)
 */
const handleMaterial = async (req: Request, res: Response) => {
    try {
        const { diagnosisSummary, category, locale } = materialSchema.parse(req.body);
        const { result, usage } = await aiService.generateMaterialBOM(diagnosisSummary, category, locale);
        (req as any).aiUsage = usage;
        res.json({ success: true, data: result, usage });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input parameters', details: error.errors });
        }
        handleAgentError(res, error, 'Material BOM generation failed', 'Material BOM agent error');
    }
};

router.post('/material', handleMaterial);
router.post('/material-bom', handleMaterial);

/**
 * POST /api/v1/agents/fault (and /fault-attribution)
 * S2: Fault Attribution Agent (Landlord/Tenant Responsibility)
 */
const handleFault = async (req: Request, res: Response) => {
    try {
        const { image, mimeType, description, propertyAgeYears, tenancyMonths, locale } = faultSchema.parse(req.body);
        const { result, usage } = await aiService.assessFault(
            image, mimeType, description, propertyAgeYears, tenancyMonths, locale
        );
        (req as any).aiUsage = usage;
        res.json({ success: true, data: result, usage });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input parameters', details: error.errors });
        }
        handleAgentError(res, error, 'Fault attribution failed', 'Fault attribution agent error');
    }
};

router.post('/fault', anonymizeImagePayload, handleFault);
router.post('/fault-attribution', anonymizeImagePayload, handleFault);

/**
 * POST /api/v1/agents/turnover (and /turnover-compare)
 * S3: Vacation Rental Turnover Agent (Before/After Photo Comparison)
 */
const handleTurnover = async (req: Request, res: Response) => {
    try {
        const { beforeImages, afterImages, propertyName, locale } = turnoverSchema.parse(req.body);
        const { result, usage } = await aiService.compareTurnover(beforeImages, afterImages, propertyName, locale);
        (req as any).aiUsage = usage;
        res.json({ success: true, data: result, usage });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input parameters', details: error.errors });
        }
        handleAgentError(res, error, 'Turnover comparison failed', 'Turnover comparison agent error');
    }
};

router.post('/turnover', anonymizeImagePayload, handleTurnover);
router.post('/turnover-compare', anonymizeImagePayload, handleTurnover);

/**
 * POST /api/v1/agents/webintel (and /scan-complaints)
 * WebIntel: 12345 Public Property Complaint Harvester & Sales Lead Generator
 */
const webIntelSchema = z.object({
    scanType: z.enum(['complaint_harvest', 'competitor_scan', 'price_monitor', 'regulation_update']).default('complaint_harvest'),
    region: z.string().default('三亚'),
    keywords: z.array(z.string()).default(['物业', '投诉', '漏水']),
    sources: z.array(z.enum(['government', 'social_media', 'property_db', 'business_registry'])).default(['government', 'social_media']),
    maxResults: z.number().optional()
});

const handleWebIntel = async (req: Request, res: Response) => {
    try {
        const params = webIntelSchema.parse(req.body);
        const report = await aiService.scanWebIntel(params);
        res.json({ success: true, data: report });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input parameters', details: error.errors });
        }
        handleAgentError(res, error, 'Web intelligence scan failed', 'WebIntel agent error');
    }
};

router.post('/webintel', handleWebIntel);
router.post('/scan-complaints', handleWebIntel);

// ──────── Executive Control (CFO & COO Rules) Endpoints ────────

/**
 * GET /api/v1/agents/cfo/budget
 * Rule 1: CFO Budget Health Check & Daily AI Spend Monitor
 */
router.get('/cfo/budget', async (_req: Request, res: Response) => {
    try {
        const budgetStatus = await aiUsageService.getBudgetStatus();
        const alerts = await executiveAgentService.checkBudgetHealth();
        res.json({
            success: true,
            data: {
                budget_status: budgetStatus,
                alerts
            }
        });
    } catch (error) {
        handleAgentError(res, error, 'CFO budget check failed', 'CFO budget check error');
    }
});

/**
 * GET /api/v1/agents/cfo/unit-economics
 * Rule 4: CFO Monthly Unit Economics Health Check
 */
router.get('/cfo/unit-economics', async (_req: Request, res: Response) => {
    try {
        const insight = await executiveAgentService.checkUnitEconomics();
        res.json({ success: true, data: insight });
    } catch (error) {
        handleAgentError(res, error, 'CFO unit economics check failed', 'CFO unit economics check error');
    }
});

/**
 * GET /api/v1/agents/coo/supply-demand
 * Rule 2: COO Worker Supply-Demand Rebalance Check
 */
router.get('/coo/supply-demand', async (_req: Request, res: Response) => {
    try {
        const alerts = await executiveAgentService.checkSupplyDemand();
        res.json({ success: true, data: { alerts } });
    } catch (error) {
        handleAgentError(res, error, 'COO supply-demand check failed', 'COO supply-demand check error');
    }
});

/**
 * GET /api/v1/agents/coo/accuracy
 * Rule 3: COO AI Diagnosis Accuracy Circuit Breaker Check
 */
router.get('/coo/accuracy', async (_req: Request, res: Response) => {
    try {
        const alerts = await executiveAgentService.checkDiagnosisAccuracy();
        res.json({ success: true, data: { alerts } });
    } catch (error) {
        handleAgentError(res, error, 'COO accuracy check failed', 'COO accuracy check error');
    }
});

/**
 * GET /api/v1/agents/executive/dashboard
 * Full CFO + COO Executive Control Dashboard
 */
router.get('/executive/dashboard', async (_req: Request, res: Response) => {
    try {
        const dashboard = await executiveAgentService.generateExecutiveDashboard();
        const budgetStatus = await aiUsageService.getBudgetStatus();
        res.json({
            success: true,
            data: {
                ...dashboard,
                budget_status: budgetStatus
            }
        });
    } catch (error) {
        handleAgentError(res, error, 'Executive dashboard fetch failed', 'Executive dashboard error');
    }
});

export default router;
