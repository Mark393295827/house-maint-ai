import express, { Request, Response } from 'express';
import { z } from 'zod';
import { fieldExperimentService } from '../services/fieldExperiment.js';
import { knowledgeService } from '../services/knowledge.js';

const router = express.Router();

/**
 * ============================================================
 * Field Experiment & Data Collection API Routes
 * ============================================================
 *
 * Solo Founder Workflow:
 *   现场拍照 → POST /api/field/record-repair → 数据自动分流到实验+本体
 */

// ─── Experiments ───

/** GET all experiments */
router.get('/experiments', (req: Request, res: Response) => {
    res.json(fieldExperimentService.getExperiments());
});

/** GET single experiment */
router.get('/experiments/:id', (req: Request, res: Response) => {
    const exp = fieldExperimentService.getExperiment(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    res.json(exp);
});

/** POST start an experiment */
router.post('/experiments/:id/start', (req: Request, res: Response) => {
    const exp = fieldExperimentService.startExperiment(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    res.json(exp);
});

/** POST add data point to experiment */
const addDataPointSchema = z.object({
    inputData: z.record(z.any()),
    outputData: z.record(z.any()),
    notes: z.string().default(''),
});

router.post('/experiments/:id/data', (req: Request, res: Response) => {
    try {
        const data = addDataPointSchema.parse(req.body);
        const point = fieldExperimentService.addDataPoint(req.params.id, data);
        if (!point) return res.status(404).json({ error: 'Experiment not found' });
        res.json(point);
    } catch (error) {
        res.status(400).json({ error: 'Invalid data', details: error instanceof Error ? error.message : String(error) });
    }
});

// ─── Repair Data Collection (the single entry point) ───

const repairSchema = z.object({
    photoBefore: z.array(z.string()).default([]),
    photoAfter: z.array(z.string()).default([]),
    aiDiagnosis: z.string(),
    actualProblem: z.string(),
    diagnosisAccurate: z.boolean(),
    materials: z.array(z.object({
        name: z.string(),
        brand: z.string(),
        quantity: z.number(),
        unit: z.string(),
        actualPrice: z.number(),
        aiPredictedPrice: z.number().optional(),
        purchaseLocation: z.string(),
    })),
    workerId: z.number(),
    arrivalMinutes: z.number(),
    completionMinutes: z.number(),
    wasFirstTimeFix: z.boolean(),
    workerRating: z.number().min(1).max(5),
    customerSatisfaction: z.number().min(1).max(5),
    customerWouldRecommend: z.boolean(),
    buildingAge: z.number().optional(),
    buildingType: z.string().optional(),
    weather: z.string().optional(),
});

/** POST record a complete repair — feeds experiments + ontology */
router.post('/record-repair', async (req: Request, res: Response) => {
    try {
        const data = repairSchema.parse(req.body);
        const result = await fieldExperimentService.recordRepair(data);

        res.json({
            success: true,
            ...result,
            message: `维修数据已录入: ${result.ontologyEntriesCreated} 条知识 + ${result.experimentDataPointsCreated} 个实验数据点`,
        });
    } catch (error) {
        res.status(400).json({ error: 'Invalid repair data', details: error instanceof Error ? error.message : String(error) });
    }
});

// ─── Sprint Metrics ───

/** GET sprint metrics for the Dashboard */
router.get('/sprint-metrics', (req: Request, res: Response) => {
    const metrics = fieldExperimentService.getSprintMetrics();
    const ontology = knowledgeService.getOntologyMetrics();
    res.json({ sprint: metrics, ontology });
});

// ─── Web Intelligence Agent ───

import { webIntelAgent } from '../agents/webintel/agent.js';

const webIntelScanSchema = z.object({
    scanType: z.enum(['complaint_harvest', 'competitor_scan', 'price_monitor', 'regulation_update']),
    region: z.string().default('三亚'),
    keywords: z.array(z.string()).default(['物业', '维修', '投诉', '漏水', '电梯']),
    sources: z.array(z.enum(['government', 'social_media', 'property_db', 'business_registry'])).default(['government', 'social_media']),
    maxResults: z.number().default(20),
});

// Store scan results in memory (production → database)
const scanResults = new Map<string, any>();

/** POST trigger a web intelligence scan */
router.post('/web-intel/scan', async (req: Request, res: Response) => {
    try {
        const params = webIntelScanSchema.parse(req.body);
        const report = await webIntelAgent.executeScan(params);
        scanResults.set(report.scanId, report);
        res.json(report);
    } catch (error) {
        res.status(400).json({ error: 'Scan failed', details: error instanceof Error ? error.message : String(error) });
    }
});

/** GET results of a previous scan */
router.get('/web-intel/results/:scanId', (req: Request, res: Response) => {
    const report = scanResults.get(req.params.scanId);
    if (!report) return res.status(404).json({ error: 'Scan not found' });
    res.json(report);
});

/** GET all scan history */
router.get('/web-intel/scans', (req: Request, res: Response) => {
    const scans = Array.from(scanResults.entries()).map(([id, report]) => ({
        scanId: id,
        scanType: report.scanType,
        region: report.region,
        timestamp: report.timestamp,
        propertiesFound: report.properties.length,
        complaintsFound: report.complaintSummary.totalComplaints,
        tasksGenerated: report.physicalTasks.length,
    }));
    res.json(scans);
});

/** GET known complaints (baseline data from manual research) */
router.get('/web-intel/known-complaints', (req: Request, res: Response) => {
    // Quick access to the pre-loaded complaint data
    const defaultScan = webIntelAgent.executeScan({
        scanType: 'complaint_harvest',
        region: '三亚',
        keywords: ['物业', '维修', '投诉'],
        sources: ['government'],
    });
    defaultScan.then(report => res.json(report)).catch(() =>
        res.status(500).json({ error: 'Failed to load known complaints' })
    );
});

export default router;

