import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    captureException: vi.fn(),
    diagnoseIssue: vi.fn(),
    emitToUser: vi.fn(),
    findTopMatches: vi.fn(),
    generateRepairPlan: vi.fn(),
    logUsage: vi.fn(),
    query: vi.fn()
}));

vi.mock('../server/config/database.js', () => ({
    default: { query: mocks.query },
    query: mocks.query
}));

vi.mock('../server/services/ai.js', () => ({
    aiService: {
        diagnoseIssue: mocks.diagnoseIssue,
        generateRepairPlan: mocks.generateRepairPlan
    }
}));

vi.mock('../server/services/aiUsage.js', () => ({
    aiUsageService: { logUsage: mocks.logUsage }
}));

vi.mock('../server/services/matching.js', () => ({
    matchingService: { findTopMatches: mocks.findTopMatches }
}));

vi.mock('../server/socket.js', () => ({
    emitToUser: mocks.emitToUser,
    emitToWorkers: vi.fn()
}));

vi.mock('@sentry/node', () => ({
    captureException: mocks.captureException
}));

import { DiagnosticsClawService } from '../server/services/diagnostics_claw.js';
import { PlanningClawService } from '../server/services/planning_claw.js';
import { VendorSourcingClawService } from '../server/services/vendor_claw.js';

type QueryCall = [string, unknown[]?];

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

const matchingReport = (overrides: Record<string, unknown> = {}) => ({
    id: 31,
    user_id: 7,
    title: 'Leaking pipe',
    description: 'Water under sink',
    status: 'matching',
    matched_worker_id: null,
    urgency_score: 3,
    ...overrides
});

const workerMatch = (overrides: Record<string, unknown> = {}) => ({
    id: 41,
    user_id: 17,
    name: 'Repair Pro',
    score: 92,
    distanceScore: 95,
    ratingScore: 90,
    skillScore: 91,
    ...overrides
});

describe('claw compare-and-set transitions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        mocks.diagnoseIssue.mockResolvedValue({
            result: {
                diagnosis: {
                    confidence_score: 0.9,
                    diagnosis_summary: 'Replace the failed seal',
                    issue_type: 'plumbing',
                    severity: 'moderate',
                    urgency_score: 4
                }
            },
            usage: { total_tokens: 20 }
        });
        mocks.generateRepairPlan.mockResolvedValue({
            result: JSON.stringify({ steps: ['Shut off water'], priority_protocol: 'batch' }),
            usage: { total_tokens: 20 }
        });
        mocks.logUsage.mockResolvedValue(undefined);
        mocks.findTopMatches.mockResolvedValue([workerMatch()]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('lets only the successful task claimant execute diagnosis', async () => {
        const task = {
            id: 11,
            title: 'Diagnose leak',
            inputs: JSON.stringify({ report_id: 21 })
        };
        let claimAttempts = 0;

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (normalized.startsWith('select * from tasks')) {
                return { rows: [task], rowCount: 1 };
            }
            if (normalized.includes("set status = 'claimed'")) {
                claimAttempts += 1;
                return claimAttempts === 1
                    ? { rows: [{ id: task.id }], rowCount: 1 }
                    : { rows: [], rowCount: 0 };
            }
            if (normalized.startsWith('insert into pheromone_events')) {
                return { rows: [], rowCount: 1 };
            }
            throw new Error(`Unexpected query: ${normalized}`);
        });

        const firstClaw = new DiagnosticsClawService();
        const secondClaw = new DiagnosticsClawService();
        const firstExecution = vi.spyOn(firstClaw as any, 'executeDiagnosis').mockResolvedValue(undefined);
        const secondExecution = vi.spyOn(secondClaw as any, 'executeDiagnosis').mockResolvedValue(undefined);

        await (firstClaw as any).processBlackboardTasks();
        await (secondClaw as any).processBlackboardTasks();

        expect(firstExecution.mock.calls.length + secondExecution.mock.calls.length).toBe(1);
        const claimSql = normalizeSql(
            (mocks.query.mock.calls as QueryCall[]).find(([sql]) => normalizeSql(sql).includes("set status = 'claimed'"))![0]
        );
        expect(claimSql).toContain("where id = $2 and status = 'new'");
        expect(claimSql).toContain('returning id');
    });

    it('does not overwrite a report cancelled while diagnosis is running', async () => {
        const report = {
            id: 21,
            user_id: 7,
            title: 'Leaking pipe',
            description: 'Water under sink',
            status: 'pending'
        };
        let persistedStatus = 'pending';

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (normalized.startsWith('select * from reports')) {
                persistedStatus = 'cancelled';
                return { rows: [report], rowCount: 1 };
            }
            if (normalized.startsWith('update reports')) {
                const isGuarded = normalized.includes("and status = 'pending'");
                if (!isGuarded || persistedStatus === 'pending') {
                    persistedStatus = 'analyzed';
                    return { rows: [{ id: report.id }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }
            if (normalized.startsWith('update tasks') || normalized.startsWith('insert into pheromone_events')) {
                return { rows: [], rowCount: 1 };
            }
            throw new Error(`Unexpected query: ${normalized}`);
        });

        await (new DiagnosticsClawService() as any).executeDiagnosis({
            id: 11,
            inputs: JSON.stringify({ report_id: report.id })
        });

        expect(persistedStatus).toBe('cancelled');
        const updateSql = normalizeSql(
            (mocks.query.mock.calls as QueryCall[]).find(([sql]) => normalizeSql(sql).startsWith('update reports'))![0]
        );
        expect(updateSql).toContain("where id = $8 and status = 'pending'");
        expect(updateSql).toContain('returning id');
    });

    it('does not publish a plan over a concurrent report cancellation', async () => {
        const report = {
            id: 51,
            user_id: 7,
            title: 'Broken valve',
            description: 'Valve will not close',
            status: 'analyzed',
            resolution_plan: null,
            diagnosis_result: '{}'
        };
        let persistedStatus = 'cancelled';

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (!normalized.startsWith('update reports')) {
                throw new Error(`Unexpected query: ${normalized}`);
            }
            const isGuarded = normalized.includes("and status = 'analyzed'")
                && normalized.includes('resolution_plan is null');
            if (!isGuarded || persistedStatus === 'analyzed') {
                persistedStatus = 'planned';
                return { rows: [{ id: report.id }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });

        await (new PlanningClawService() as any).createRepairPlan(report);

        expect(persistedStatus).toBe('cancelled');
        const updateSql = normalizeSql((mocks.query.mock.calls[0] as QueryCall)[0]);
        expect(updateSql).toContain("where id = $3 and status = 'analyzed'");
        expect(updateSql).toContain("resolution_plan = ''");
        expect(updateSql).toContain('returning id');
    });

    it('does not mark a report failed after another planner advances it', async () => {
        const report = {
            id: 52,
            user_id: 7,
            title: 'Broken valve',
            description: 'Valve will not close',
            status: 'analyzed',
            resolution_plan: null,
            diagnosis_result: '{}'
        };
        let persistedStatus = 'planned';
        mocks.generateRepairPlan.mockRejectedValueOnce(new Error('planner unavailable'));

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (!normalized.startsWith('update reports')) {
                throw new Error(`Unexpected query: ${normalized}`);
            }
            const isGuarded = normalized.includes("and status = 'analyzed'")
                && normalized.includes('resolution_plan is null');
            if (!isGuarded || persistedStatus === 'analyzed') {
                persistedStatus = 'failed_planning';
                return { rows: [{ id: report.id }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });

        await (new PlanningClawService() as any).createRepairPlan(report);

        expect(persistedStatus).toBe('planned');
        const updateSql = normalizeSql((mocks.query.mock.calls[0] as QueryCall)[0]);
        expect(updateSql).toContain("where id = $1 and status = 'analyzed'");
        expect(updateSql).toContain("resolution_plan = ''");
        expect(updateSql).toContain('returning id');
    });

    it('does not source vendors for a planned report before payment opens matching', async () => {
        const plannedReport = matchingReport({ id: 61, status: 'planned' });

        mocks.findTopMatches.mockResolvedValue([]);
        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (!normalized.startsWith('select * from reports')) {
                throw new Error(`Unexpected query: ${normalized}`);
            }
            return normalized.includes("'planned'")
                ? { rows: [plannedReport], rowCount: 1 }
                : { rows: [], rowCount: 0 };
        });

        await (new VendorSourcingClawService() as any).processMatchingReports();

        expect(mocks.findTopMatches).not.toHaveBeenCalled();
        expect(mocks.emitToUser).not.toHaveBeenCalled();
        const pollSql = normalizeSql((mocks.query.mock.calls[0] as QueryCall)[0]);
        expect(pollSql).toContain("where status = 'matching'");
        expect(pollSql).toContain('matched_worker_id is null');
        expect(pollSql).not.toContain("'planned'");
    });

    it('does not broadcast or notify after concurrent cancellation', async () => {
        const report = matchingReport({ id: 62, urgency_score: 9 });
        let persistedStatus = 'cancelled';
        let insertedMatches = 0;

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (normalized.startsWith('insert into matches')) {
                insertedMatches += 1;
                return { rows: [], rowCount: 1 };
            }
            if (normalized.startsWith('update reports')) {
                const isGuarded = normalized.includes("and status = 'matching'")
                    && normalized.includes('matched_worker_id is null');
                if (!isGuarded || persistedStatus === 'matching') {
                    persistedStatus = 'broadcasted';
                    return { rows: [{ id: report.id }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }
            throw new Error(`Unexpected query: ${normalized}`);
        });

        await (new VendorSourcingClawService() as any).matchReport(report);

        expect(persistedStatus).toBe('cancelled');
        expect(insertedMatches).toBe(0);
        expect(mocks.emitToUser).not.toHaveBeenCalled();
        const updateSql = normalizeSql(
            (mocks.query.mock.calls as QueryCall[]).find(([sql]) => normalizeSql(sql).startsWith('update reports'))![0]
        );
        expect(updateSql).toContain("where id = $1 and status = 'matching'");
        expect(updateSql).toContain('matched_worker_id is null');
        expect(updateSql).toContain('returning id');
    });

    it('does not overwrite an existing assignment or notify a second worker', async () => {
        const report = matchingReport({ id: 63 });
        let persistedStatus = 'matching';
        let persistedWorkerId: number | null = 99;

        mocks.query.mockImplementation(async (sql: string, params?: unknown[]) => {
            const normalized = normalizeSql(sql);
            if (!normalized.startsWith('update reports')) {
                throw new Error(`Unexpected query: ${normalized}`);
            }
            const isGuarded = normalized.includes("and status = 'matching'")
                && normalized.includes('matched_worker_id is null');
            if (!isGuarded || (persistedStatus === 'matching' && persistedWorkerId === null)) {
                persistedStatus = 'matched';
                persistedWorkerId = Number(params?.[0]);
                return { rows: [{ id: report.id }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });

        await (new VendorSourcingClawService() as any).matchReport(report);

        expect(persistedStatus).toBe('matching');
        expect(persistedWorkerId).toBe(99);
        expect(mocks.emitToUser).not.toHaveBeenCalled();
        const updateSql = normalizeSql((mocks.query.mock.calls[0] as QueryCall)[0]);
        expect(updateSql).toContain("where id = $3 and status = 'matching'");
        expect(updateSql).toContain('matched_worker_id is null');
        expect(updateSql).toContain('returning id');
    });

    it('keeps a cancelled report out of the review queue when matching confidence is low', async () => {
        const report = matchingReport({ id: 64 });
        let persistedStatus = 'cancelled';
        mocks.findTopMatches.mockResolvedValue([workerMatch({ score: 50 })]);

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (!normalized.startsWith('update reports')) {
                throw new Error(`Unexpected query: ${normalized}`);
            }
            const isGuarded = normalized.includes("and status = 'matching'")
                && normalized.includes('matched_worker_id is null');
            if (!isGuarded || persistedStatus === 'matching') {
                persistedStatus = 'flagged_for_review';
                return { rows: [{ id: report.id }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });

        await (new VendorSourcingClawService() as any).matchReport(report);

        expect(persistedStatus).toBe('cancelled');
        const updateSql = normalizeSql((mocks.query.mock.calls[0] as QueryCall)[0]);
        expect(updateSql).toContain("where id = $2 and status = 'matching'");
        expect(updateSql).toContain('matched_worker_id is null');
        expect(updateSql).toContain('returning id');
    });

    it('emits assignment notifications only after a successful guarded transition', async () => {
        const report = matchingReport({ id: 65 });
        const events: string[] = [];

        mocks.query.mockImplementation(async (sql: string) => {
            const normalized = normalizeSql(sql);
            if (!normalized.startsWith('update reports')) {
                throw new Error(`Unexpected query: ${normalized}`);
            }
            events.push('transition');
            return { rows: [{ id: report.id }], rowCount: 1 };
        });
        mocks.emitToUser.mockImplementation(() => {
            events.push('notification');
        });

        await (new VendorSourcingClawService() as any).matchReport(report);

        expect(events).toEqual(['transition', 'notification', 'notification']);
        const updateSql = normalizeSql((mocks.query.mock.calls[0] as QueryCall)[0]);
        expect(updateSql).toContain("where id = $3 and status = 'matching'");
        expect(updateSql).toContain('matched_worker_id is null');
        expect(updateSql).toContain('returning id');
    });
});
