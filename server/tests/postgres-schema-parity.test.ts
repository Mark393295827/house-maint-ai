import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const readFixture = (relativePath: string): string => readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    'utf8',
);

const postgresSchema = readFixture('../models/schema.pg.sql');
const sqliteSchema = readFixture('../models/schema.sql');
const postgresRuntimeMigration = readFileSync(
    fileURLToPath(new URL('../db/migrations/postgres/004_runtime_parity.sql', import.meta.url)),
    'utf8',
);
const postgresResearchBudgetMigration = readFileSync(
    fileURLToPath(new URL(
        '../db/migrations/postgres/005_research_budget_reservations.sql',
        import.meta.url,
    )),
    'utf8',
);
const postgresFoundationMigration = readFixture(
    '../db/migrations/postgres/006_organization_case_foundation.sql',
);

function tableDefinition(schema: string, table: string): string {
    const match = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
    if (!match) throw new Error(`Missing table ${table}`);
    return match[1].toLowerCase();
}

function expectColumns(schema: string, table: string, columns: string[]) {
    const definition = tableDefinition(schema, table);
    for (const column of columns) {
        expect(definition, `${table}.${column}`).toMatch(new RegExp(`\\b${column}\\b`));
    }
}

describe('runtime schema parity', () => {
    it('supports AI usage writes on PostgreSQL', () => {
        expectColumns(postgresSchema, 'ai_usage_logs', ['model_name', 'input_tokens', 'output_tokens', 'total_tokens']);
        expect(postgresRuntimeMigration).toMatch(/ai_usage_logs\s+ALTER COLUMN\s+task_type\s+DROP NOT NULL/i);
    });

    it('supports asset route writes on both adapters', () => {
        const columns = ['type', 'name', 'brand', 'model', 'serial_number', 'purchase_date', 'warranty_expiry', 'specs'];
        expectColumns(sqliteSchema, 'user_assets', columns);
        expectColumns(postgresSchema, 'user_assets', columns);
    });

    it('supports blackboard polling and event logging on PostgreSQL', () => {
        expectColumns(postgresSchema, 'tasks', [
            'owner_claw',
            'inputs',
            'outputs',
            'score',
            'failure_reason',
            'retry_count',
            'max_retries',
            'parent_task_id',
        ]);
        expectColumns(postgresSchema, 'pheromone_events', ['task_id', 'actor', 'event_type', 'payload']);
    });

    it('supports worker registration and learning queries on both adapters', () => {
        expectColumns(sqliteSchema, 'workers', ['bio', 'hourly_rate']);
        expectColumns(postgresSchema, 'workers', ['bio', 'hourly_rate']);
        expectColumns(postgresSchema, 'patterns', ['consecutive_high_ratings', 'is_variant', 'generation_version']);
    });

    it('supports atomic research budget reservations on both adapters', () => {
        const columns = [
            'period_key',
            'budget_cny',
            'reserved_cny',
            'spent_cny',
            'updated_at',
        ];
        expectColumns(sqliteSchema, 'research_budget_reservations', columns);
        expectColumns(postgresSchema, 'research_budget_reservations', columns);
        expect(postgresResearchBudgetMigration).toContain(
            'CREATE TABLE IF NOT EXISTS research_budget_reservations',
        );
    });

    it('defines the organization and case foundation on both bootstrap paths', () => {
        const expected: Record<string, string[]> = {
            organizations: ['slug', 'status', 'default_timezone'],
            organization_memberships: ['organization_id', 'user_id', 'role', 'status', 'revoked_at'],
            properties: ['organization_id', 'external_ref', 'timezone', 'status'],
            units: ['organization_id', 'property_id', 'external_ref', 'status'],
            resource_grants: ['membership_id', 'resource_type', 'resource_id', 'capability'],
            maintenance_cases: ['organization_id', 'property_id', 'unit_id', 'legacy_report_id', 'version'],
            case_events: [
                'case_id',
                'sequence',
                'reducer_version',
                'projection_patch_json',
                'idempotency_key',
                'payload_hash',
            ],
        };
        for (const [table, columns] of Object.entries(expected)) {
            expectColumns(sqliteSchema, table, columns);
            expectColumns(postgresSchema, table, columns);
            expect(postgresFoundationMigration).toMatch(
                new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'i'),
            );
        }
        for (const sqlSource of [postgresSchema, postgresFoundationMigration]) {
            expect(sqlSource).toMatch(/reject_case_event_mutation/i);
            expect(sqlSource).toMatch(/projection_patch_json\s+TEXT\s+NOT NULL/i);
            expect(sqlSource).toMatch(/reducer_version\s+INTEGER\s+NOT NULL\s+DEFAULT 1/i);
            expect(sqlSource).toMatch(/ON DELETE RESTRICT/i);
            expect(sqlSource).toMatch(/ON DELETE SET NULL/i);
        }
    });
});
