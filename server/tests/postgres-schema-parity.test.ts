import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const postgresSchema = readFileSync(path.resolve('server/models/schema.pg.sql'), 'utf8');
const sqliteSchema = readFileSync(path.resolve('server/models/schema.sql'), 'utf8');
const postgresRuntimeMigration = readFileSync(
    path.resolve('server/db/migrations/postgres/004_runtime_parity.sql'),
    'utf8'
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
});
