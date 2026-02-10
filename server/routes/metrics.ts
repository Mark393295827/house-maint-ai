import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all metrics routes - Admin only
router.use(authenticate, authorize('admin'));

// In-memory metrics storage
const metrics = {
    requests: { total: 0, success: 0, error: 0 },
    responseTime: { total: 0, count: 0, min: Infinity, max: 0 },
    sda: { cycles: 0, simulatePasses: 0, deploys: 0, augments: 0 },
    agents: { invocations: 0, byAgent: {} as Record<string, number> },
    startTime: new Date(),
};

/**
 * GET /api/metrics
 * Returns current system metrics
 */
router.get('/', (_req: Request, res: Response) => {
    const uptime = Date.now() - metrics.startTime.getTime();
    const avgResponseTime = metrics.responseTime.count > 0
        ? metrics.responseTime.total / metrics.responseTime.count
        : 0;

    res.json({
        system: {
            uptime_ms: uptime,
            uptime_human: formatUptime(uptime),
        },
        requests: {
            total: metrics.requests.total,
            success: metrics.requests.success,
            error: metrics.requests.error,
            success_rate: metrics.requests.total > 0
                ? (metrics.requests.success / metrics.requests.total * 100).toFixed(2) + '%'
                : 'N/A',
        },
        response_time: {
            avg_ms: avgResponseTime.toFixed(2),
            min_ms: metrics.responseTime.min === Infinity ? 0 : metrics.responseTime.min,
            max_ms: metrics.responseTime.max,
        },
        sda_cycles: {
            total: metrics.sda.cycles,
            simulate_passes: metrics.sda.simulatePasses,
            deploys: metrics.sda.deploys,
            augments: metrics.sda.augments,
        },
        agents: {
            total_invocations: metrics.agents.invocations,
            by_agent: metrics.agents.byAgent,
        },
    });
});

/**
 * POST /api/metrics/record
 * Record a metric event
 */
router.post('/record', (req: Request, res: Response) => {
    const { type, data } = req.body;

    switch (type) {
        case 'request':
            metrics.requests.total++;
            if (data.success) metrics.requests.success++;
            else metrics.requests.error++;
            break;

        case 'response_time':
            metrics.responseTime.total += data.duration;
            metrics.responseTime.count++;
            metrics.responseTime.min = Math.min(metrics.responseTime.min, data.duration);
            metrics.responseTime.max = Math.max(metrics.responseTime.max, data.duration);
            break;

        case 'sda':
            metrics.sda.cycles++;
            if (data.phase === 'simulate' && data.pass) metrics.sda.simulatePasses++;
            if (data.phase === 'deploy') metrics.sda.deploys++;
            if (data.phase === 'augment') metrics.sda.augments++;
            break;

        case 'agent':
            metrics.agents.invocations++;
            metrics.agents.byAgent[data.agent] = (metrics.agents.byAgent[data.agent] || 0) + 1;
            break;

        default:
            return res.status(400).json({ error: 'Unknown metric type' });
    }

    res.json({ success: true });
});

/**
 * POST /api/metrics/reset
 * Reset all metrics
 */
router.post('/reset', (_req: Request, res: Response) => {
    metrics.requests = { total: 0, success: 0, error: 0 };
    metrics.responseTime = { total: 0, count: 0, min: Infinity, max: 0 };
    metrics.sda = { cycles: 0, simulatePasses: 0, deploys: 0, augments: 0 };
    metrics.agents = { invocations: 0, byAgent: {} };
    metrics.startTime = new Date();

    res.json({ success: true, message: 'Metrics reset' });
});

function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export default router;
