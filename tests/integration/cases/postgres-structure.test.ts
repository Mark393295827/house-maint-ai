import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('PostgreSQL canonical-case structure', () => {
    it('guards migrated projections and events with one transaction-local writer authority', () => {
        const migration = source('server/db/migrations/reconstruction/001_canonical_case_authority.postgres.sql');
        expect(migration).toContain("write_authority TEXT NOT NULL DEFAULT 'legacy'");
        expect(migration).toContain("current_setting('house_maint.case_writer', true)");
        expect(migration).toContain('reconstruction_case_projection_writer');
        expect(migration).toContain('reconstruction_case_event_writer');
        expect(migration).toContain('UNIQUE (organization_id, idempotency_key)');
        expect(migration).toContain('FOREIGN KEY (organization_id, case_id)');
        expect(migration).toContain("'agent_run_requested'");
        expect(migration).toContain("OLD.write_authority = 'case-command-service/v1'");
        expect(migration).toContain("NEW.write_authority = 'case-command-service/v1'");
        expect(migration).toContain("current_setting('house_maint.case_writer_authority_transition', true)");
        expect(migration).toContain("IS DISTINCT FROM 'case-command-service/v1->legacy'");
    });

    it('drops only the update immutability trigger around the ordered backfill and restores it before commit', () => {
        const migration = source('server/db/migrations/reconstruction/001_canonical_case_authority.postgres.sql');
        const dropUpdate = migration.indexOf('DROP TRIGGER IF EXISTS case_events_reject_update ON case_events;');
        const versionBackfill = migration.indexOf('UPDATE case_events SET case_version = sequence');
        const timestampBackfill = migration.indexOf('UPDATE case_events SET occurred_at = created_at');
        const restoreUpdate = migration.indexOf('CREATE TRIGGER case_events_reject_update BEFORE UPDATE ON case_events');
        const commit = migration.lastIndexOf('COMMIT;');

        expect(dropUpdate).toBeGreaterThan(-1);
        expect(versionBackfill).toBeGreaterThan(dropUpdate);
        expect(timestampBackfill).toBeGreaterThan(versionBackfill);
        expect(restoreUpdate).toBeGreaterThan(timestampBackfill);
        expect(commit).toBeGreaterThan(restoreUpdate);
        expect(migration).not.toContain('DROP TRIGGER IF EXISTS case_events_reject_delete');
    });

    it('treats either side of a canonical projection update as protected and separately gates downgrades', () => {
        const migration = source('server/db/migrations/reconstruction/001_canonical_case_authority.postgres.sql');
        const functionStart = migration.indexOf('CREATE OR REPLACE FUNCTION reconstruction_enforce_case_projection_writer()');
        const functionEnd = migration.indexOf('DROP TRIGGER IF EXISTS reconstruction_case_projection_writer');
        const guard = migration.slice(functionStart, functionEnd);

        expect(functionStart).toBeGreaterThan(-1);
        expect(functionEnd).toBeGreaterThan(functionStart);
        expect(guard).toContain("TG_OP = 'DELETE'");
        expect(guard).toContain("OLD.write_authority = 'case-command-service/v1'");
        expect(guard).toContain("NEW.write_authority = 'case-command-service/v1'");
        expect(guard).toContain("NEW.write_authority IS DISTINCT FROM OLD.write_authority");
        expect(guard).toContain("current_setting('house_maint.case_writer', true)");
        expect(guard).toContain("current_setting('house_maint.case_writer_authority_transition', true)");
        expect(guard).toContain("IS DISTINCT FROM 'case-command-service/v1->legacy'");
        expect(guard.indexOf('authority downgrade requires an explicit transition gate'))
            .toBeLessThan(guard.indexOf('canonical maintenance case requires CaseCommandService writer authority'));
    });

    it('locks idempotency before version and qualifies all case access by organization', () => {
        const repository = source('packages/persistence/src/cases/postgres-case-command-repository.ts');
        const receiptLookup = repository.indexOf('FROM case_command_receipts');
        const caseLookup = repository.indexOf('FROM maintenance_cases');
        expect(receiptLookup).toBeGreaterThan(-1);
        expect(caseLookup).toBeGreaterThan(receiptLookup);
        expect(repository).toContain('pg_advisory_xact_lock');
        expect(repository).toContain('WHERE organization_id = $1 AND id = $2');
        expect(repository).toContain("write_authority = $3");
        expect(repository).not.toMatch(/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:reports|cases)\b/i);
    });

    it('keeps the API boundary free of repository SQL and alternate writers', () => {
        const api = source('apps/api/src/modules/cases/case-module.ts');
        expect(api).not.toMatch(/maintenance_cases|case_events|case_command_receipts/i);
        expect(api).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/i);
        expect(api).toContain('resolvedScope');
        expect(api).toContain('authority.execute');
    });
});
