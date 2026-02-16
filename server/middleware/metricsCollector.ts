/**
 * Metrics Collector Middleware
 * Automatically tracks request count, success/error rates, and response times.
 */

// Shared metrics store — imported by routes/metrics.ts
export const metricsStore = {
    requests: { total: 0, success: 0, error: 0 },
    responseTime: { total: 0, count: 0, min: Infinity, max: 0 },
    sda: { cycles: 0, simulatePasses: 0, deploys: 0, augments: 0 },
    agents: { invocations: 0, byAgent: {} as Record<string, number> },
    startTime: new Date(),
};

/**
 * Reset all metrics (used by POST /api/metrics/reset and tests)
 */
export function resetMetrics(): void {
    metricsStore.requests = { total: 0, success: 0, error: 0 };
    metricsStore.responseTime = { total: 0, count: 0, min: Infinity, max: 0 };
    metricsStore.sda = { cycles: 0, simulatePasses: 0, deploys: 0, augments: 0 };
    metricsStore.agents = { invocations: 0, byAgent: {} };
    metricsStore.startTime = new Date();
}

/**
 * Express middleware that records request metrics on every response.
 */
export function metricsCollector(req: any, res: any, next: any): void {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - start);
        const durationMs = durationNs / 1_000_000;

        // Count request
        metricsStore.requests.total++;
        if (res.statusCode < 400) {
            metricsStore.requests.success++;
        } else {
            metricsStore.requests.error++;
        }

        // Track response time
        metricsStore.responseTime.total += durationMs;
        metricsStore.responseTime.count++;
        metricsStore.responseTime.min = Math.min(metricsStore.responseTime.min, durationMs);
        metricsStore.responseTime.max = Math.max(metricsStore.responseTime.max, durationMs);
    });

    next();
}
