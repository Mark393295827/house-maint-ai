import { describe, expect, it } from 'vitest';
import { ResearchBudgetService } from '../services/researchBudget.js';
import { createTestDb } from './setup.js';

const NOW = new Date('2026-07-26T12:00:00.000Z');

const configureBudget = async (
    database: Awaited<ReturnType<typeof createTestDb>>,
    budgetCny: number,
    maxRunCostCny: number,
) => {
    await database.query(`
        INSERT INTO ai_settings (key, value)
        VALUES ($1, $2), ($3, $4)
    `, [
        'research_daily_budget_cny',
        String(budgetCny),
        'research_max_run_cost_cny',
        String(maxRunCostCny),
    ]);
};

describe('ResearchBudgetService', () => {
    it('fails closed when authoritative budget settings are missing', async () => {
        const database = await createTestDb();
        const service = new ResearchBudgetService(database);

        const preflight = await service.getPreflight(NOW);
        const reservation = await service.reserve(NOW);

        expect(preflight).toMatchObject({
            state: 'unavailable',
            allowed: false,
            measurement: 'unavailable',
            reason_code: 'research_budget_settings_missing',
        });
        expect(reservation.reserved).toBe(false);
    });

    it('atomically reserves budget and rejects concurrent over-allocation', async () => {
        const database = await createTestDb();
        await configureBudget(database, 1, 0.6);
        const service = new ResearchBudgetService(database);

        const reservations = await Promise.all([
            service.reserve(NOW),
            service.reserve(NOW),
        ]);

        expect(reservations.filter((result) => result.reserved)).toHaveLength(1);
        expect(reservations.filter((result) => !result.reserved)).toHaveLength(1);
        expect(await service.getPreflight(NOW)).toMatchObject({
            state: 'blocked',
            allowed: false,
            reserved_cny: 0.6,
            remaining_cny: 0.4,
            reason_code: 'research_budget_exhausted',
        });
    });

    it('settles actual cost and releases unused reservation capacity', async () => {
        const database = await createTestDb();
        await configureBudget(database, 1, 0.6);
        const service = new ResearchBudgetService(database);
        const result = await service.reserve(NOW);

        expect(result.reserved).toBe(true);
        if (!result.reserved) return;

        await service.settle(result.reservation, 0.2);

        expect(await service.getPreflight(NOW)).toMatchObject({
            state: 'available',
            allowed: true,
            reserved_cny: 0,
            spent_cny: 0.2,
            remaining_cny: 0.8,
        });
    });
});
