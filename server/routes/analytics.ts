import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { analyticsService } from '../services/analytics.js';
import * as Sentry from '@sentry/node';

const router = Router();

// Protect all analytics routes - Manager and Admin only
router.use(authenticate, authorize('manager', 'admin'));

/**
 * GET /api/analytics/dashboard
 * Get aggregate dashboard stats
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

/**
 * GET /api/analytics/tickets
 * Get ticket volume trend
 */
router.get('/tickets', async (req: Request, res: Response) => {
    try {
        const trend = await analyticsService.getTicketTrend();
        res.json(trend);
    } catch (error) {
        console.error('Error fetching ticket trend:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to fetch ticket trend' });
    }
});

/**
 * GET /api/analytics/workers
 * Get top performing workers
 */
router.get('/workers', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 5;
        const workers = await analyticsService.getTopWorkers(limit);
        res.json(workers);
    } catch (error) {
        console.error('Error fetching top workers:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to fetch top workers' });
    }
});

export default router;
