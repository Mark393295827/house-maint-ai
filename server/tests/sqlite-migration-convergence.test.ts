import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationsFolder = fileURLToPath(new URL('../db/migrations', import.meta.url));
const bootstrapSql = readFileSync(
    fileURLToPath(new URL('../models/schema.sql', import.meta.url)),
    'utf8',
);
const foundationTables = [
    'organizations',
    'organization_memberships',
    'properties',
    'units',
    'resource_grants',
    'maintenance_cases',
    'case_events',
];

type TableInfoRow = {
    name: string;
};

function columns(database: Database.Database, table: string): string[] {
    return (database.prepare(`PRAGMA table_info(${table})`).all() as TableInfoRow[])
        .map((column) => column.name);
}

function structure(database: Database.Database, table: string) {
    const uniqueColumns = (database.pragma(`index_list('${table}')`) as Array<{
        name: string;
        unique: number;
    }>).filter((indexRow) => indexRow.unique === 1).map((indexRow) =>
        (database.pragma(`index_info('${indexRow.name}')`) as Array<{ name: string }>)
            .map((column) => column.name).join(','),
    ).sort();
    return {
        columns: database.pragma(`table_info('${table}')`),
        foreignKeys: (database.pragma(`foreign_key_list('${table}')`) as Array<Record<string, unknown>>)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ id: _id, ...foreignKey }) => foreignKey)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        uniqueColumns,
    };
}

describe('SQLite migration convergence', () => {
    it('migrates an empty database to the current Drizzle schema', () => {
        const sqlite = new Database(':memory:');

        try {
            sqlite.pragma('foreign_keys = ON');
            migrate(drizzle(sqlite), { migrationsFolder });

            expect(sqlite.prepare(`
                SELECT COUNT(*) AS count
                FROM __drizzle_migrations
            `).get()).toEqual({ count: 7 });

            const tables = (sqlite.prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name NOT LIKE 'sqlite_%'
                  AND name <> '__drizzle_migrations'
                ORDER BY name
            `).all() as TableInfoRow[]).map((table) => table.name);

            expect(tables).toEqual([
                'agent_sessions',
                'ai_feedback',
                'ai_settings',
                'ai_usage_logs',
                'case_events',
                'cases',
                'device_nodes',
                'fault_attributions',
                'maintenance_cases',
                'matches',
                'messages',
                'notifications',
                'orders',
                'organization_memberships',
                'organizations',
                'patterns',
                'pheromone_events',
                'posts',
                'price_guide',
                'properties',
                'refresh_tokens',
                'reports',
                'research_budget_reservations',
                'resource_grants',
                'reviews',
                'tasks',
                'turnover_inspections',
                'units',
                'user_assets',
                'users',
                'workers',
            ]);

            expect(columns(sqlite, 'users')).toEqual(expect.arrayContaining([
                'phone',
                'wechat_openid',
                'wechat_unionid',
                'wechat_session_key',
            ]));
            expect(columns(sqlite, 'workers')).toEqual(expect.arrayContaining([
                'bio',
                'hourly_rate',
            ]));
            expect(columns(sqlite, 'reports')).toEqual(expect.arrayContaining([
                'diagnosis_result',
                'issue_type',
                'severity',
                'diagnosis_summary',
                'confidence_score',
                'priority_protocol',
                'estimated_arrival',
                'resolution_plan',
                'pattern_id',
                'urgency_score',
                'match_score',
                'matched_at',
                'completed_at',
                'resolution_details',
                'severity_tag',
                'diagnosis_correct',
                'first_time_fix',
                'pattern_extracted',
            ]));
            expect(columns(sqlite, 'research_budget_reservations')).toEqual([
                'period_key',
                'budget_cny',
                'reserved_cny',
                'spent_cny',
                'updated_at',
            ]);
            expect(columns(sqlite, 'reviews')).toContain('photos');
            expect(columns(sqlite, 'patterns')).toEqual(expect.arrayContaining([
                'performance_score',
                'consecutive_high_ratings',
                'status',
                'is_variant',
                'generation_version',
            ]));
            expect(columns(sqlite, 'tasks')).toEqual(expect.arrayContaining([
                'owner_claw',
                'inputs',
                'outputs',
                'failure_reason',
                'retry_count',
                'max_retries',
                'parent_task_id',
            ]));

            const insertCurrentRows = sqlite.transaction(() => {
                const userId = Number(sqlite.prepare(`
                    INSERT INTO users (wechat_openid, password_hash, name, role)
                    VALUES (?, ?, ?, ?)
                `).run('migration-open-id', 'hash', 'Migration User', 'user').lastInsertRowid);
                const workerId = Number(sqlite.prepare(`
                    INSERT INTO workers (user_id, skills, bio, hourly_rate)
                    VALUES (?, ?, ?, ?)
                `).run(userId, '["plumbing"]', 'Licensed plumber', 125).lastInsertRowid);
                const reportId = Number(sqlite.prepare(`
                    INSERT INTO reports (
                        user_id,
                        title,
                        description,
                        diagnosis_result,
                        issue_type,
                        severity,
                        diagnosis_summary,
                        confidence_score,
                        priority_protocol,
                        estimated_arrival,
                        resolution_plan,
                        status,
                        matched_worker_id,
                        pattern_id,
                        urgency_score,
                        match_score,
                        matched_at,
                        completed_at,
                        resolution_details,
                        severity_tag,
                        diagnosis_correct,
                        first_time_fix,
                        pattern_extracted
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    userId,
                    'Leaking supply line',
                    'Water is visible below the sink',
                    '{"cause":"loose fitting"}',
                    'plumbing',
                    'high',
                    'Shut off water and replace the fitting',
                    0.94,
                    'dispatch-now',
                    '2026-07-20T09:30:00.000Z',
                    '{"steps":["isolate","repair","test"]}',
                    'completed',
                    workerId,
                    7,
                    93,
                    0.88,
                    '2026-07-20T09:00:00.000Z',
                    '2026-07-20T10:00:00.000Z',
                    '{"parts":["fitting"]}',
                    'emergency',
                    1,
                    1,
                    1,
                ).lastInsertRowid);

                sqlite.prepare(`
                    INSERT INTO ai_usage_logs (user_id, model_name, input_tokens, output_tokens)
                    VALUES (?, ?, ?, ?)
                `).run(userId, 'migration-model', 12, 5);
                sqlite.prepare(`
                    INSERT INTO ai_settings (key, value)
                    VALUES (?, ?)
                `).run('migration-test', 'enabled');
                sqlite.prepare(`
                    INSERT INTO ai_feedback (user_id, report_id, is_helpful, type, comment)
                    VALUES (?, ?, ?, ?, ?)
                `).run(userId, reportId, 1, 'thumbs_up', 'Accurate diagnosis');
                sqlite.prepare(`
                    INSERT INTO orders (user_id, report_id, worker_id, amount, status)
                    VALUES (?, ?, ?, ?, ?)
                `).run(userId, reportId, workerId, 125, 'paid');
                sqlite.prepare(`
                    INSERT INTO messages (sender_id, receiver_id, report_id, content)
                    VALUES (?, ?, ?, ?)
                `).run(userId, userId, reportId, 'Repair completed');
                sqlite.prepare(`
                    INSERT INTO notifications (user_id, type, title, body)
                    VALUES (?, ?, ?, ?)
                `).run(userId, 'job_update', 'Repair update', 'The repair is complete');
                sqlite.prepare(`
                    INSERT INTO cases (id, user_id, title, title_en, date)
                    VALUES (?, ?, ?, ?, ?)
                `).run('case-migration', userId, 'Supply line', 'Supply line', '2026-07-20');
                sqlite.prepare(`
                    INSERT INTO agent_sessions (user_id, channel, external_id, context)
                    VALUES (?, ?, ?, ?)
                `).run(userId, 'web', 'session-migration', '{"step":1}');
                sqlite.prepare(`
                    INSERT INTO device_nodes (id, user_id, name, type, status)
                    VALUES (?, ?, ?, ?, ?)
                `).run('device-migration', userId, 'Leak sensor', 'sensor', 'online');
                sqlite.prepare(`
                    INSERT INTO fault_attributions (
                        report_id,
                        attribution,
                        confidence_score,
                        evidence,
                        reasoning
                    ) VALUES (?, ?, ?, ?, ?)
                `).run(reportId, 'tenant', 0.8, '["loose fitting"]', 'Recent fixture change');
                sqlite.prepare(`
                    INSERT INTO turnover_inspections (
                        property_id,
                        inspection_type,
                        overall_condition,
                        cleanliness_score
                    ) VALUES (?, ?, ?, ?)
                `).run('property-migration', 'checkout', 'good', 9);
                const taskId = Number(sqlite.prepare(`
                    INSERT INTO tasks (title, objective, priority, inputs)
                    VALUES (?, ?, ?, ?)
                `).run('Diagnose migrated report', 'diagnose_image', 'high', JSON.stringify({ report_id: reportId })).lastInsertRowid);
                sqlite.prepare(`
                    INSERT INTO pheromone_events (task_id, actor, event_type, payload)
                    VALUES (?, ?, ?, ?)
                `).run(taskId, 'migration-test', 'task_created', '{}');

                return { reportId, userId };
            });

            const { reportId, userId } = insertCurrentRows();
            expect(sqlite.prepare(`
                SELECT
                    urgency_score AS urgencyScore,
                    diagnosis_summary AS diagnosisSummary,
                    severity_tag AS severityTag,
                    pattern_extracted AS patternExtracted
                FROM reports
                WHERE id = ?
            `).get(reportId)).toEqual({
                urgencyScore: 93,
                diagnosisSummary: 'Shut off water and replace the fitting',
                severityTag: 'emergency',
                patternExtracted: 1,
            });
            expect(sqlite.prepare('SELECT phone FROM users WHERE id = ?').get(userId))
                .toEqual({ phone: null });
            expect(sqlite.pragma('foreign_key_check')).toEqual([]);

            const bootstrap = new Database(':memory:');
            try {
                bootstrap.pragma('foreign_keys = ON');
                bootstrap.exec(bootstrapSql);
                for (const table of foundationTables) {
                    expect(structure(sqlite, table), table).toEqual(structure(bootstrap, table));
                }
                const triggers = (database: Database.Database) => database.prepare(`
                    SELECT name FROM sqlite_master
                    WHERE type = 'trigger' AND tbl_name = 'case_events'
                    ORDER BY name
                `).all();
                expect(triggers(sqlite)).toEqual(triggers(bootstrap));
            } finally {
                bootstrap.close();
            }
        } finally {
            sqlite.close();
        }
    });
});
