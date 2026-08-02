import db from '../config/database.js';

interface BudgetDatabase {
    query<T = unknown>(
        text: string,
        params?: unknown[],
    ): Promise<{ rows: T[]; rowCount: number | null }>;
}

interface BudgetConfig {
    budgetCny: number;
    maxRunCostCny: number;
}

interface BudgetLedgerRow {
    budget_cny: number | string;
    reserved_cny: number | string;
    spent_cny: number | string;
}

export type ResearchBudgetReasonCode =
    | 'research_budget_settings_missing'
    | 'research_budget_exhausted';

export interface ResearchBudgetPreflight {
    state: 'available' | 'blocked' | 'unavailable';
    allowed: boolean;
    measurement: 'measured' | 'unavailable';
    period: string;
    budget_cny: number | null;
    reserved_cny: number | null;
    spent_cny: number | null;
    remaining_cny: number | null;
    estimated_run_cost_cny: number | null;
    reason_code: ResearchBudgetReasonCode | null;
}

export interface ResearchBudgetReservation {
    period: string;
    amount_cny: number;
}

export type ResearchBudgetReservationResult =
    | {
        reserved: true;
        reservation: ResearchBudgetReservation;
        preflight: ResearchBudgetPreflight;
    }
    | {
        reserved: false;
        reservation: null;
        preflight: ResearchBudgetPreflight;
    };

const BUDGET_SETTING = 'research_daily_budget_cny';
const MAX_RUN_COST_SETTING = 'research_max_run_cost_cny';

const numeric = (value: number | string | null | undefined): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number): number => Number(value.toFixed(4));

const periodKey = (date: Date): string => date.toISOString().slice(0, 10);

export class ResearchBudgetService {
    constructor(private readonly database: BudgetDatabase = db) {}

    async getPreflight(now = new Date()): Promise<ResearchBudgetPreflight> {
        const period = periodKey(now);
        const config = await this.readConfig();
        if (!config) {
            return {
                state: 'unavailable',
                allowed: false,
                measurement: 'unavailable',
                period,
                budget_cny: null,
                reserved_cny: null,
                spent_cny: null,
                remaining_cny: null,
                estimated_run_cost_cny: null,
                reason_code: 'research_budget_settings_missing',
            };
        }

        const ledger = await this.readLedger(period);
        const reservedCny = numeric(ledger?.reserved_cny);
        const spentCny = numeric(ledger?.spent_cny);
        const remainingCny = Math.max(
            0,
            config.budgetCny - reservedCny - spentCny,
        );
        const allowed = remainingCny >= config.maxRunCostCny;

        return {
            state: allowed ? 'available' : 'blocked',
            allowed,
            measurement: 'measured',
            period,
            budget_cny: roundCurrency(config.budgetCny),
            reserved_cny: roundCurrency(reservedCny),
            spent_cny: roundCurrency(spentCny),
            remaining_cny: roundCurrency(remainingCny),
            estimated_run_cost_cny: roundCurrency(config.maxRunCostCny),
            reason_code: allowed ? null : 'research_budget_exhausted',
        };
    }

    async reserve(now = new Date()): Promise<ResearchBudgetReservationResult> {
        const config = await this.readConfig();
        if (!config) {
            return {
                reserved: false,
                reservation: null,
                preflight: await this.getPreflight(now),
            };
        }

        const period = periodKey(now);
        await this.database.query(`
            INSERT INTO research_budget_reservations (
                period_key,
                budget_cny,
                reserved_cny,
                spent_cny,
                updated_at
            ) VALUES ($1, $2, 0, 0, CURRENT_TIMESTAMP)
            ON CONFLICT (period_key) DO NOTHING
        `, [period, config.budgetCny]);

        const reservation = await this.database.query(`
            UPDATE research_budget_reservations
            SET
                budget_cny = $2,
                reserved_cny = reserved_cny + $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE period_key = $1
              AND spent_cny + reserved_cny + $3 <= $2
        `, [period, config.budgetCny, config.maxRunCostCny]);

        const preflight = await this.getPreflight(now);
        if (reservation.rowCount !== 1) {
            return {
                reserved: false,
                reservation: null,
                preflight,
            };
        }

        return {
            reserved: true,
            reservation: {
                period,
                amount_cny: config.maxRunCostCny,
            },
            preflight,
        };
    }

    async settle(
        reservation: ResearchBudgetReservation,
        actualCostCny: number,
    ): Promise<void> {
        await this.database.query(`
            UPDATE research_budget_reservations
            SET
                reserved_cny = CASE
                    WHEN reserved_cny >= $2 THEN reserved_cny - $2
                    ELSE 0
                END,
                spent_cny = spent_cny + $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE period_key = $1
        `, [
            reservation.period,
            reservation.amount_cny,
            Math.max(0, actualCostCny),
        ]);
    }

    async release(reservation: ResearchBudgetReservation): Promise<void> {
        await this.settle(reservation, 0);
    }

    private async readConfig(): Promise<BudgetConfig | null> {
        const result = await this.database.query<{ key: string; value: string }>(`
            SELECT key, value
            FROM ai_settings
            WHERE key IN ($1, $2)
        `, [BUDGET_SETTING, MAX_RUN_COST_SETTING]);
        const settings = new Map(result.rows.map((row) => [row.key, Number(row.value)]));
        const budgetCny = settings.get(BUDGET_SETTING);
        const maxRunCostCny = settings.get(MAX_RUN_COST_SETTING);

        if (
            budgetCny === undefined
            || maxRunCostCny === undefined
            || !Number.isFinite(budgetCny)
            || !Number.isFinite(maxRunCostCny)
            || budgetCny < 0
            || maxRunCostCny <= 0
        ) {
            return null;
        }

        return { budgetCny, maxRunCostCny };
    }

    private async readLedger(period: string): Promise<BudgetLedgerRow | null> {
        const result = await this.database.query<BudgetLedgerRow>(`
            SELECT budget_cny, reserved_cny, spent_cny
            FROM research_budget_reservations
            WHERE period_key = $1
        `, [period]);
        return result.rows[0] || null;
    }
}

export const researchBudgetService = new ResearchBudgetService();
