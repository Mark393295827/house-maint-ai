import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import analyticsRouter from '../routes/analytics.js';
import { JWT_SECRET } from '../middleware/auth.js';
import {
    CompanyAnalyticsService,
    companyAnalyticsService,
    type CompanyAnalyticsOverview,
} from '../services/companyAnalytics.js';
import {
    AgentTelemetryService,
    type CurrentMetricsSnapshot,
} from '../services/agentTelemetry.js';
import { createTestDb } from './setup.js';

const NOW = new Date('2026-07-26T12:00:00.000Z');

const emptyMetrics = (): CurrentMetricsSnapshot => ({
    requests: { total: 0, success: 0, error: 0 },
    responseTime: { total: 0, count: 0, min: Infinity, max: 0 },
    agents: { invocations: 0, byAgent: {} },
    startTime: new Date('2026-07-26T11:50:00.000Z'),
});

const createUser = async (
    database: Awaited<ReturnType<typeof createTestDb>>,
    suffix: string,
    role = 'user',
) => {
    const result = await database.query<{ id: number }>(`
        INSERT INTO users (phone, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, [`analytics-${suffix}`, 'hash', `Analytics ${suffix}`, role]);
    return result.rows[0].id;
};

const createReport = async (
    database: Awaited<ReturnType<typeof createTestDb>>,
    userId: number,
    index: number,
    values: {
        status: string;
        severityTag?: string;
        diagnosisCorrect?: number | null;
        firstTimeFix?: number | null;
        createdAt?: string;
    },
) => {
    const result = await database.query<{ id: number }>(`
        INSERT INTO reports (
            user_id,
            title,
            description,
            status,
            severity_tag,
            diagnosis_correct,
            first_time_fix,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `, [
        userId,
        `Report ${index}`,
        `Report ${index} description`,
        values.status,
        values.severityTag || '48h',
        values.diagnosisCorrect ?? null,
        values.firstTimeFix ?? null,
        values.createdAt || '2026-07-25 09:00:00',
    ]);
    return result.rows[0].id;
};

const createService = async () => {
    const database = await createTestDb();
    const telemetry = new AgentTelemetryService(database, emptyMetrics, 7.2);
    return {
        database,
        service: new CompanyAnalyticsService(database, telemetry),
    };
};

describe('CompanyAnalyticsService', () => {
    it('builds the contract read model with corrected stages and minor-unit revenue', async () => {
        const { database, service } = await createService();
        const customerId = await createUser(database, 'customer');
        const workerUserOne = await createUser(database, 'worker-1', 'worker');
        const workerUserTwo = await createUser(database, 'worker-2', 'worker');

        await database.query(
            'INSERT INTO workers (user_id, skills, available) VALUES ($1, $2, $3)',
            [workerUserOne, '["plumbing"]', 1],
        );
        const workerResult = await database.query<{ id: number }>(`
            INSERT INTO workers (user_id, skills, available)
            VALUES ($1, $2, $3)
            RETURNING id
        `, [workerUserTwo, '["electrical"]', 0]);
        const workerId = workerResult.rows[0].id;

        const reports: number[] = [];
        reports.push(await createReport(database, customerId, 1, {
            status: 'pending',
            diagnosisCorrect: 1,
            firstTimeFix: 1,
            createdAt: '2026-07-20 00:00:00',
        }));
        reports.push(await createReport(database, customerId, 2, {
            status: 'failed_analysis',
            diagnosisCorrect: 0,
            firstTimeFix: 1,
        }));
        reports.push(await createReport(database, customerId, 3, {
            status: 'flagged_for_review',
            diagnosisCorrect: 1,
            firstTimeFix: 0,
        }));
        reports.push(await createReport(database, customerId, 4, {
            status: 'analyzed',
            diagnosisCorrect: 1,
            firstTimeFix: 1,
        }));
        reports.push(await createReport(database, customerId, 5, {
            status: 'failed_planning',
        }));
        reports.push(await createReport(database, customerId, 6, {
            status: 'planned',
        }));
        reports.push(await createReport(database, customerId, 7, {
            status: 'in_progress',
        }));
        reports.push(await createReport(database, customerId, 8, {
            status: 'completed',
        }));
        reports.push(await createReport(database, customerId, 9, {
            status: 'cancelled',
        }));
        reports.push(await createReport(database, customerId, 10, {
            status: 'pending',
            severityTag: 'diy',
        }));
        await createReport(database, customerId, 11, {
            status: 'pending',
            severityTag: 'diy',
            createdAt: '2026-07-01 09:00:00',
        });

        await database.query(`
            INSERT INTO reviews (report_id, user_id, worker_id, rating, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [reports[0], customerId, workerId, 5, '2026-07-25 10:00:00']);
        await database.query(`
            INSERT INTO reviews (report_id, user_id, worker_id, rating, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [reports[1], customerId, workerId, 4, '2026-07-25 11:00:00']);

        await database.query(`
            INSERT INTO orders (user_id, report_id, amount, currency, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [customerId, reports[0], 12_345, 'cny', 'paid', '2026-07-25 10:00:00']);
        await database.query(`
            INSERT INTO orders (user_id, report_id, amount, currency, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [customerId, reports[1], 50_000, 'cny', 'pending', '2026-07-25 10:00:00']);
        await database.query(`
            INSERT INTO orders (user_id, report_id, amount, currency, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [customerId, reports[2], 99_900, 'cny', 'paid', '2026-07-01 10:00:00']);

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
            'gemini-1.5-flash',
            100,
            50,
            120,
            10,
            '/api/v1/ai/diagnose',
            250,
            '2026-07-25 10:00:00',
        ]);

        const overview = await service.getOverview('7d', NOW);

        expect(overview.meta).toMatchObject({
            range: '7d',
            since: '2026-07-20T00:00:00.000Z',
            until: NOW.toISOString(),
            generated_at: NOW.toISOString(),
            formula_version: 'company-analytics-v1',
            freshness: 'partial',
        });
        expect(overview.pulse).toMatchObject({
            active_work_orders: { value: 9, measurement: 'measured' },
            available_workers: { value: 1, measurement: 'measured', sample_size: 2 },
            satisfaction: { value: 9, unit: 'score_10', sample_size: 2 },
            sla_attainment_pct: { value: null, measurement: 'unavailable' },
            deflection_rate_pct: { value: 10, sample_size: 10 },
            first_time_fix_rate_pct: { value: 75, sample_size: 4 },
            diagnosis_accuracy_pct: { value: 75, sample_size: 4 },
            revenue_cny: { value: 123.45, sample_size: 1 },
        });
        expect(overview.pulse.gross_margin_pct.value).toBeCloseTo(41.68, 2);

        expect(overview.operating_loop.map((stage) => ({
            stage: stage.stage,
            volume: stage.current_volume.value,
            exceptions: stage.exception_count.value,
        }))).toEqual([
            { stage: 'intake', volume: 2, exceptions: 0 },
            { stage: 'diagnosis', volume: 2, exceptions: 1 },
            { stage: 'deflection', volume: 2, exceptions: 1 },
            { stage: 'dispatch', volume: 1, exceptions: 0 },
            { stage: 'verification', volume: 1, exceptions: 0 },
            { stage: 'reporting', volume: 2, exceptions: 1 },
        ]);
        expect(overview.operating_loop.every(
            (stage) => stage.current_volume.source === 'reports.status',
        )).toBe(true);
        expect(overview.operating_loop.every(
            (stage) => stage.conversion_to_next_pct.measurement === 'unavailable'
                && stage.median_cycle_hours.measurement === 'unavailable',
        )).toBe(true);

        expect(overview.strategic_dimensions.find((metric) => metric.id === 'tam'))
            .toMatchObject({ confidence: 'unavailable', score: { value: null } });
        expect(overview.strategic_dimensions.find((metric) => metric.id === 'ten_x')?.score.value)
            .toBe(4.9);
        expect(overview.strategic_dimensions.find((metric) => metric.id === 'team')?.score.value)
            .toBe(7.2);
        expect(overview.strategic_dimensions.find((metric) => metric.id === 'financials')?.score.value)
            .toBeCloseTo(4.17, 2);

        expect(overview.alerts.map((alert) => alert.id)).toEqual([
            'workflow-failures',
            'diagnosis-accuracy',
            'first-time-fix',
            'workforce-capacity',
            'gross-margin',
        ]);
        expect(overview.alerts[0]).toMatchObject({
            severity: 'critical',
            metric_id: 'operating_failures',
            metric: { value: 2, unit: 'count' },
            recommendation_code: 'review_operating_exceptions',
            requires_human_approval: true,
        });
        expect(overview.alerts.find((alert) => alert.id === 'diagnosis-accuracy'))
            .toMatchObject({ recommendation_code: 'review_diagnosis_accuracy' });
        expect(overview.alerts.find((alert) => alert.id === 'first-time-fix'))
            .toMatchObject({ recommendation_code: 'review_first_time_fix' });
        expect(overview.alerts.find((alert) => alert.id === 'workforce-capacity'))
            .toMatchObject({
                metric_id: 'work_orders_per_available_worker',
                metric: { value: 9, measurement: 'measured' },
                recommendation_code: 'review_workforce_capacity',
            });
        expect(overview.alerts.find((alert) => alert.id === 'gross-margin'))
            .toMatchObject({ recommendation_code: 'review_gross_margin' });
        expect(overview.agent_operations.find((agent) => agent.id === 'diagnosis-agent'))
            .toMatchObject({ calls: { value: 1 }, total_tokens: { value: 150 } });
        expect(overview.system_load.samples).toEqual([]);
        expect(overview.efficiency.ai_compute_share_pct.measurement).toBe('unavailable');
        expect(overview.intelligence).toMatchObject({
            latest: null,
            measurement: 'unavailable',
        });
    });

    it('returns unavailable percentages and scores instead of false zeroes', async () => {
        const { database, service } = await createService();
        const customerId = await createUser(database, 'zero-worker-customer');
        await createReport(database, customerId, 1, {
            status: 'pending',
            createdAt: '2026-01-01 09:00:00',
        });

        const overview = await service.getOverview('30d', NOW);

        expect(overview.pulse.active_work_orders).toMatchObject({
            value: 1,
            measurement: 'measured',
        });
        expect(overview.pulse.available_workers).toMatchObject({
            value: 0,
            measurement: 'measured',
        });
        expect(overview.pulse.revenue_cny).toMatchObject({
            value: 0,
            measurement: 'measured',
        });
        for (const metric of [
            overview.pulse.satisfaction,
            overview.pulse.deflection_rate_pct,
            overview.pulse.first_time_fix_rate_pct,
            overview.pulse.diagnosis_accuracy_pct,
            overview.pulse.gross_margin_pct,
        ]) {
            expect(metric).toMatchObject({
                value: null,
                measurement: 'unavailable',
                sample_size: 0,
            });
            expect(metric.reason).toBeTruthy();
        }
        expect(overview.strategic_dimensions.every(
            (dimension) => dimension.score.measurement === 'unavailable',
        )).toBe(true);
        expect(overview.alerts).toHaveLength(1);
        expect(overview.alerts[0]).toMatchObject({
            id: 'workforce-capacity',
            severity: 'warning',
            metric_id: 'work_orders_per_available_worker',
            metric: {
                value: null,
                unit: 'ratio',
                measurement: 'unavailable',
                sample_size: 1,
            },
            recommendation_code: 'review_workforce_capacity',
        });
        expect(overview.alerts[0].metric.reason).toContain('zero denominator');
    });

    it('guards the complete report-status to six-stage mapping', async () => {
        const { database, service } = await createService();
        const customerId = await createUser(database, 'stage-parity');
        const statuses = [
            'pending',
            'failed_analysis',
            'flagged_for_review',
            'analyzed',
            'failed_planning',
            'planned',
            'matching',
            'broadcasted',
            'matched',
            'in_progress',
            'completed',
            'cancelled',
        ];

        for (const [index, status] of statuses.entries()) {
            await createReport(database, customerId, index, { status });
        }
        await database.query(`
            INSERT INTO reports (user_id, title, description, status, created_at)
            VALUES ($1, $2, $3, NULL, $4)
        `, [customerId, 'Null status', 'Null status', '2026-07-25 09:00:00']);
        await database.query('PRAGMA ignore_check_constraints = ON');
        await database.query(`
            INSERT INTO reports (user_id, title, description, status, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            customerId,
            'Future status',
            'Future status',
            'future_status',
            '2026-07-25 09:00:00',
        ]);

        const overview = await service.getOverview('7d', NOW);

        expect(overview.operating_loop.map((stage) => [
            stage.stage,
            stage.current_volume.value,
        ])).toEqual([
            ['intake', 3],
            ['diagnosis', 2],
            ['deflection', 2],
            ['dispatch', 4],
            ['verification', 1],
            ['reporting', 2],
        ]);
    });

    it('isolates a source failure and marks dependent metrics unavailable', async () => {
        const database = await createTestDb();
        const failingDatabase = {
            query: <T = unknown>(sql: string, params?: unknown[]) => {
                if (/\bFROM\s+reviews\b/i.test(sql)) {
                    return Promise.reject(new Error('review ledger unavailable'));
                }
                return database.query<T>(sql, params);
            },
        };
        const telemetry = new AgentTelemetryService(failingDatabase, emptyMetrics, 7.2);
        const service = new CompanyAnalyticsService(failingDatabase, telemetry);

        const overview = await service.getOverview('7d', NOW);

        expect(overview.pulse.active_work_orders.value).toBe(0);
        expect(overview.pulse.satisfaction).toMatchObject({
            value: null,
            measurement: 'unavailable',
            source: 'reviews.rating',
        });
        expect(overview.meta.access_issues).toContainEqual({
            source: 'reviews',
            message: 'review ledger unavailable',
        });
        expect(overview.meta.freshness).toBe('partial');
    });
});

describe('GET /api/v1/analytics/company-overview', () => {
    const app = express();
    app.use(cookieParser());
    app.use('/api/v1/analytics', analyticsRouter);

    const tokenFor = (role: string) => jwt.sign(
        { id: 1, name: 'Analytics User', role, type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' },
    );

    const fixture = {
        meta: {
            range: '30d',
            since: '2026-06-27T00:00:00.000Z',
            until: NOW.toISOString(),
            generated_at: NOW.toISOString(),
            formula_version: 'company-analytics-v1',
            freshness: 'partial',
            access_issues: [],
        },
    } as unknown as CompanyAnalyticsOverview;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each(['manager', 'admin'])('allows the %s role and defaults to 30d', async (role) => {
        const getOverview = vi.spyOn(companyAnalyticsService, 'getOverview')
            .mockResolvedValue(fixture);

        const response = await request(app)
            .get('/api/v1/analytics/company-overview')
            .set('Cookie', [`accessToken=${tokenFor(role)}`]);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            status: 'success',
            data: { meta: { formula_version: 'company-analytics-v1' } },
        });
        expect(getOverview).toHaveBeenCalledWith('30d');
    });

    it('rejects unauthenticated and regular-user requests', async () => {
        const unauthenticated = await request(app)
            .get('/api/v1/analytics/company-overview?range=7d');
        const regularUser = await request(app)
            .get('/api/v1/analytics/company-overview?range=7d')
            .set('Cookie', [`accessToken=${tokenFor('user')}`]);

        expect(unauthenticated.status).toBe(401);
        expect(regularUser.status).toBe(403);
    });

    it('rejects an unsupported range without invoking the read model', async () => {
        const getOverview = vi.spyOn(companyAnalyticsService, 'getOverview')
            .mockResolvedValue(fixture);

        const response = await request(app)
            .get('/api/v1/analytics/company-overview?range=365d')
            .set('Cookie', [`accessToken=${tokenFor('admin')}`]);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            status: 'fail',
            error: 'range must be one of 7d, 30d, or 90d',
        });
        expect(getOverview).not.toHaveBeenCalled();
    });
});
