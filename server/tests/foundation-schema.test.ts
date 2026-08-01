import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationsFolder = fileURLToPath(new URL('../db/migrations', import.meta.url));
const bootstrapSql = readFileSync(fileURLToPath(new URL('../models/schema.sql', import.meta.url)), 'utf8');

function openFoundation(source: 'migrations' | 'bootstrap'): Database.Database {
    const database = new Database(':memory:');
    database.pragma('foreign_keys = ON');
    source === 'migrations'
        ? migrate(drizzle(database), { migrationsFolder })
        : database.exec(bootstrapSql);
    return database;
}

function insertedId(
    database: Database.Database,
    sql: string,
    ...params: Array<string | number>
): number {
    return Number(database.prepare(sql).run(...params).lastInsertRowid);
}

function seedFoundation(database: Database.Database) {
    const userId = insertedId(
        database,
        "INSERT INTO users (phone, password_hash, name) VALUES ('foundation-user', 'hash', 'User')",
    );
    const reportId = insertedId(
        database,
        "INSERT INTO reports (user_id, title, description) VALUES (?, 'Leak', 'Pipe leak')",
        userId,
    );
    const organizationId = insertedId(
        database,
        "INSERT INTO organizations (slug, name) VALUES ('org-a', 'Organization A')",
    );
    const otherOrganizationId = insertedId(
        database,
        "INSERT INTO organizations (slug, name) VALUES ('org-b', 'Organization B')",
    );
    const membershipId = insertedId(
        database,
        "INSERT INTO organization_memberships (organization_id,user_id,role) VALUES (?,?,'manager')",
        organizationId,
        userId,
    );
    const propertyId = insertedId(
        database,
        "INSERT INTO properties (organization_id,name) VALUES (?,'Building A')",
        organizationId,
    );
    const unitId = insertedId(
        database,
        "INSERT INTO units (organization_id,property_id,label) VALUES (?,?,'101')",
        organizationId,
        propertyId,
    );
    const caseId = insertedId(database, `
        INSERT INTO maintenance_cases
            (organization_id,property_id,unit_id,opened_by_membership_id,legacy_report_id,title,version)
        VALUES (?,?,?,?,?,'Pipe leak',1)
    `, organizationId, propertyId, unitId, membershipId, reportId);
    const eventId = insertedId(database, `
        INSERT INTO case_events
            (organization_id,case_id,sequence,event_type,actor_type,actor_membership_id,
             idempotency_key,command_hash,payload_hash,projection_patch_json,payload_json)
        VALUES (?,?,1,'case_opened','member',?,'open-1','command','payload',
                '{"title":"Pipe leak","status":"open","stage":"intake","priority":"normal","closedAt":null}',
                '{"source":"test"}')
    `, organizationId, caseId, membershipId);
    return { caseId, eventId, membershipId, organizationId, otherOrganizationId, propertyId, reportId };
}

describe.each(['migrations', 'bootstrap'] as const)('%s foundation schema', (source) => {
    it('enforces tenancy, checks, uniqueness, deletion rules, and append-only history', () => {
        const database = openFoundation(source);
        try {
            const row = seedFoundation(database);
            expect(() => database.prepare(
                "INSERT INTO maintenance_cases (organization_id,title) VALUES (999999,'Orphan')",
            ).run()).toThrow();
            expect(() => database.prepare(
                "INSERT INTO units (organization_id,property_id,label) VALUES (?,?,'forged')",
            ).run(row.otherOrganizationId, row.propertyId)).toThrow();
            expect(() => database.prepare(`
                INSERT INTO case_events
                    (organization_id,case_id,sequence,event_type,actor_type,idempotency_key,
                     command_hash,payload_hash,projection_patch_json,payload_json)
                VALUES (?, ?, 2, 'case_updated', 'member', 'bad-actor', 'c', 'p', '{}', '{}')
            `).run(row.organizationId, row.caseId)).toThrow();
            expect(() => database.prepare(`
                INSERT INTO case_events
                    (organization_id,case_id,sequence,event_type,actor_type,actor_membership_id,
                     idempotency_key,command_hash,payload_hash,projection_patch_json,payload_json,reducer_version)
                VALUES (?, ?, 2, 'case_updated', 'member', ?, 'bad-reducer', 'c', 'p', '{}', '{}', 2)
            `).run(row.organizationId, row.caseId, row.membershipId)).toThrow();
            expect(() => database.prepare(
                'UPDATE case_events SET payload_json = ? WHERE id = ?',
            ).run('{"changed":true}', row.eventId)).toThrow(/append-only/);
            expect(() => database.prepare('DELETE FROM case_events WHERE id = ?')
                .run(row.eventId)).toThrow(/append-only/);
            expect(() => database.prepare('DELETE FROM maintenance_cases WHERE id = ?')
                .run(row.caseId)).toThrow();
            expect(() => database.prepare('DELETE FROM organizations WHERE id = ?')
                .run(row.organizationId)).toThrow();
            database.prepare('DELETE FROM reports WHERE id = ?').run(row.reportId);
            expect(database.prepare('SELECT legacy_report_id FROM maintenance_cases WHERE id = ?')
                .get(row.caseId)).toEqual({ legacy_report_id: null });
            expect(database.pragma('foreign_key_check')).toEqual([]);
        } finally {
            database.close();
        }
    });
});
