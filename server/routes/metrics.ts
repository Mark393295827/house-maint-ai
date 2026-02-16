import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { metricsStore, resetMetrics } from '../middleware/metricsCollector.js';

const router = Router();

// Protect all metrics routes - Admin only
router.use(authenticate, authorize('admin'));

/**
 * GET /api/metrics
 * Returns current system metrics
 */
router.get('/', (_req: Request, res: Response) => {
    const uptime = Date.now() - metricsStore.startTime.getTime();
    const avgResponseTime = metricsStore.responseTime.count > 0
        ? metricsStore.responseTime.total / metricsStore.responseTime.count
        : 0;

    res.json({
        system: {
            uptime_ms: uptime,
            uptime_human: formatUptime(uptime),
        },
        requests: {
            total: metricsStore.requests.total,
            success: metricsStore.requests.success,
            error: metricsStore.requests.error,
            success_rate: metricsStore.requests.total > 0
                ? (metricsStore.requests.success / metricsStore.requests.total * 100).toFixed(2) + '%'
                : 'N/A',
        },
        response_time: {
            avg_ms: avgResponseTime.toFixed(2),
            min_ms: metricsStore.responseTime.min === Infinity ? 0 : metricsStore.responseTime.min,
            max_ms: metricsStore.responseTime.max,
        },
        sda_cycles: {
            total: metricsStore.sda.cycles,
            simulate_passes: metricsStore.sda.simulatePasses,
            deploys: metricsStore.sda.deploys,
            augments: metricsStore.sda.augments,
        },
        agents: {
            total_invocations: metricsStore.agents.invocations,
            by_agent: metricsStore.agents.byAgent,
        },
    });
});

/**
 * GET /api/metrics/health
 * Returns Node.js process health stats
 */
router.get('/health', (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    res.json({
        memory: {
            rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
            heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
            heap_total_mb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
            external_mb: +(mem.external / 1024 / 1024).toFixed(2),
        },
        cpu: {
            user_ms: +(cpu.user / 1000).toFixed(2),
            system_ms: +(cpu.system / 1000).toFixed(2),
        },
        node_version: process.version,
        platform: process.platform,
        pid: process.pid,
    });
});

/**
 * POST /api/metrics/record
 * Record a metric event (for SDA/agent external reporting)
 */
router.post('/record', (req: Request, res: Response) => {
    const { type, data } = req.body;

    switch (type) {
        case 'sda':
            metricsStore.sda.cycles++;
            if (data.phase === 'simulate' && data.pass) metricsStore.sda.simulatePasses++;
            if (data.phase === 'deploy') metricsStore.sda.deploys++;
            if (data.phase === 'augment') metricsStore.sda.augments++;
            break;

        case 'agent':
            metricsStore.agents.invocations++;
            metricsStore.agents.byAgent[data.agent] = (metricsStore.agents.byAgent[data.agent] || 0) + 1;
            break;

        default:
            return res.status(400).json({ error: 'Unknown metric type. Use "sda" or "agent".' });
    }

    res.json({ success: true });
});

/**
 * POST /api/metrics/reset
 * Reset all metrics
 */
router.post('/reset', (_req: Request, res: Response) => {
    resetMetrics();
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
