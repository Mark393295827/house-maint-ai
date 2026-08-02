import { describe, expect, it } from 'vitest';
import {
    AGENT_ENDPOINT_REGISTRY,
    AgentTelemetryService,
    MAX_AI_USAGE_LEDGER_ROWS,
    resolveAgentEndpoint,
    type CurrentMetricsSnapshot,
} from '../services/agentTelemetry.js';
import { createTestDb } from './setup.js';

const NOW = new Date('2026-07-26T12:00:00.000Z');
const SINCE = new Date('2026-07-20T00:00:00.000Z');

const emptyMetrics = (): CurrentMetricsSnapshot => ({
    requests: { total: 0, success: 0, error: 0 },
    responseTime: { total: 0, count: 0, min: Infinity, max: 0 },
    agents: { invocations: 0, byAgent: {} },
    startTime: new Date('2026-07-26T11:50:00.000Z'),
});

const insertUsage = async (
    database: Awaited<ReturnType<typeof createTestDb>>,
    values: {
        endpoint: string;
        model: string;
        input: number;
        output: number;
        total: number;
        costUsd: number;
        durationMs: number | null;
        createdAt: string;
    },
) => {
    await database.query(`
        INSERT INTO ai_usage_logs (
            model_name,
            input_tokens,
            output_tokens,
            total_tokens,
            cost_usd,
            endpoint,
            duration_ms,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
        values.model,
        values.input,
        values.output,
        values.total,
        values.costUsd,
        values.endpoint,
        values.durationMs,
        values.createdAt,
    ]);
};

describe('AgentTelemetryService', () => {
    it('uses the endpoint registry and aggregates effective tokens per ledger row', async () => {
        const database = await createTestDb();
        await insertUsage(database, {
            endpoint: '/api/v1/ai/diagnose?locale=zh',
            model: 'gemini-1.5-flash',
            input: 10,
            output: 20,
            total: 5,
            costUsd: 1,
            durationMs: 100,
            createdAt: '2026-07-26 11:55:00',
        });
        await insertUsage(database, {
            endpoint: 'claw:diagnostics',
            model: 'deepseek-reasoner',
            input: 5,
            output: 5,
            total: 20,
            costUsd: 2,
            durationMs: 300,
            createdAt: '2026-07-26 11:40:00',
        });
        await insertUsage(database, {
            endpoint: '/api/v1/ai/plan',
            model: 'deepseek-reasoner',
            input: 8,
            output: 2,
            total: 10,
            costUsd: 0.5,
            durationMs: 400,
            createdAt: '2026-07-25 10:59:59',
        });
        await insertUsage(database, {
            endpoint: '/api/v1/ai/research-market',
            model: 'gemini-1.5-flash',
            input: 7,
            output: 3,
            total: 10,
            costUsd: 0.25,
            durationMs: null,
            createdAt: '2026-07-26 10:00:00',
        });

        const service = new AgentTelemetryService(database, emptyMetrics, 7.2);
        const result = await service.getTelemetry({
            since: SINCE,
            until: NOW,
            generatedAt: NOW,
        });

        const diagnosis = result.agent_operations.find((agent) => agent.id === 'diagnosis-agent');
        expect(diagnosis).toMatchObject({
            display_code: 'DIAGNOSIS',
            workflow_stage: 'diagnosis',
            status: 'online',
            models: ['deepseek-reasoner', 'gemini-1.5-flash'],
            calls: { value: 2, measurement: 'measured', sample_size: 2 },
            input_tokens: { value: 15, measurement: 'measured', sample_size: 2 },
            output_tokens: { value: 25, measurement: 'measured', sample_size: 2 },
            total_tokens: { value: 50, measurement: 'measured', sample_size: 2 },
            cost_cny: { value: 21.6, measurement: 'measured', sample_size: 2 },
            average_latency_ms: { value: 200, measurement: 'measured', sample_size: 2 },
            p95_latency_ms: { value: 300, measurement: 'measured', sample_size: 2 },
            success_rate_pct: { value: null, measurement: 'unavailable', sample_size: 0 },
            last_active_at: '2026-07-26T11:55:00.000Z',
        });

        expect(result.agent_operations.find((agent) => agent.id === 'planning-agent')?.status)
            .toBe('offline');
        expect(result.agent_operations.find((agent) => agent.id === 'research-swarm')?.status)
            .toBe('idle');
        expect(result.total_cost_cny).toBe(27);
        expect(result.access_issues).toEqual([]);
    });

    it('uses only the current process metrics store for current system load', async () => {
        const database = await createTestDb();
        const metrics = (): CurrentMetricsSnapshot => ({
            requests: { total: 100, success: 90, error: 10 },
            responseTime: { total: 5_000, count: 100, min: 10, max: 500 },
            agents: { invocations: 40, byAgent: { diagnosis: 40 } },
            startTime: new Date('2026-07-26T11:50:00.000Z'),
        });
        const service = new AgentTelemetryService(database, metrics, 7.2);

        const result = await service.getTelemetry({
            since: SINCE,
            until: NOW,
            generatedAt: NOW,
        });

        expect(result.system_load).toMatchObject({
            observation_started_at: '2026-07-26T11:50:00.000Z',
            throughput_per_minute: {
                value: 10,
                measurement: 'measured',
                sample_size: 100,
                source: 'metricsStore.current_process',
            },
            success_rate_pct: {
                value: 90,
                measurement: 'measured',
                sample_size: 100,
                source: 'metricsStore.current_process',
            },
            average_latency_ms: {
                value: 50,
                measurement: 'measured',
                sample_size: 100,
                source: 'metricsStore.current_process',
            },
            p95_latency_ms: { value: null, measurement: 'unavailable' },
            active_agents: { value: null, measurement: 'unavailable' },
            utilization_pct: { value: null, measurement: 'unavailable' },
            samples: [],
        });
    });

    it('returns registered offline agents and explicit unavailable latency without usage rows', async () => {
        const database = await createTestDb();
        const service = new AgentTelemetryService(database, emptyMetrics, 7.2);

        const result = await service.getTelemetry({
            since: SINCE,
            until: NOW,
            generatedAt: NOW,
        });

        expect(result.agent_operations).toHaveLength(AGENT_ENDPOINT_REGISTRY.length);
        expect(result.agent_operations.every((agent) => agent.status === 'offline')).toBe(true);
        expect(result.agent_operations.every((agent) => agent.calls.value === 0)).toBe(true);
        expect(result.agent_operations.every(
            (agent) => agent.average_latency_ms.measurement === 'unavailable',
        )).toBe(true);
        expect(result.agent_operations.every(
            (agent) => agent.success_rate_pct.reason && agent.p95_latency_ms.reason,
        )).toBe(true);
    });

    it('keeps telemetry explicit when the durable ledger cannot be read', async () => {
        const database = {
            query: async () => {
                throw new Error('usage ledger unavailable');
            },
        };
        const service = new AgentTelemetryService(database, emptyMetrics, 7.2);

        const result = await service.getTelemetry({
            since: SINCE,
            until: NOW,
            generatedAt: NOW,
        });

        expect(result.total_cost_cny).toBeNull();
        expect(result.access_issues).toEqual([{
            source: 'ai_usage_logs',
            message: 'usage ledger unavailable',
        }]);
        expect(result.agent_operations.every(
            (agent) => agent.calls.measurement === 'unavailable'
                && agent.calls.value === null
                && Boolean(agent.calls.reason),
        )).toBe(true);
    });

    it('fails closed when the usage ledger exceeds the bounded read limit', async () => {
        const rows: unknown[] = [];
        rows.length = MAX_AI_USAGE_LEDGER_ROWS + 1;
        const database = {
            query: async <T = unknown>() => ({
                rows: rows as T[],
                rowCount: rows.length,
            }),
        };
        const service = new AgentTelemetryService(database, emptyMetrics, 7.2);

        const result = await service.getTelemetry({
            since: SINCE,
            until: NOW,
            generatedAt: NOW,
        });

        expect(result.total_cost_cny).toBeNull();
        expect(result.access_issues[0]).toMatchObject({
            source: 'ai_usage_logs',
        });
        expect(result.access_issues[0].message).toContain('bounded');
        expect(result.agent_operations.every(
            (agent) => agent.calls.measurement === 'unavailable',
        )).toBe(true);
    });

    it('normalizes versioned API paths and keeps unknown endpoints explicit', () => {
        expect(resolveAgentEndpoint('/api/v1/ai/diagnose/inquiry?locale=en').id)
            .toBe('intake-agent');
        expect(resolveAgentEndpoint('/api/ai/material-bom/').id)
            .toBe('materials-agent');
        expect(resolveAgentEndpoint('training:pattern_extraction').id)
            .toBe('learning-agent');
        expect(resolveAgentEndpoint('/api/v1/ai/not-registered').id)
            .toBe('unregistered-agent');
    });
});
