-- Forward-only reconstruction migration. It is intentionally not wired into
-- production migration execution by this graph node.
BEGIN;

ALTER TABLE maintenance_cases
    ADD COLUMN IF NOT EXISTS active_run_id TEXT,
    ADD COLUMN IF NOT EXISTS accepted_artifact_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS write_authority TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE case_events
    ADD COLUMN IF NOT EXISTS event_id TEXT,
    ADD COLUMN IF NOT EXISTS case_version INTEGER,
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

-- Migration 006 makes case_events append-only. Remove only its UPDATE guard
-- while this forward migration backfills newly added columns; DELETE remains
-- protected throughout the transaction. Restore the UPDATE guard immediately
-- after the backfill and before any later migration work can run.
DROP TRIGGER IF EXISTS case_events_reject_update ON case_events;
UPDATE case_events SET case_version = sequence WHERE case_version IS NULL;
UPDATE case_events SET occurred_at = created_at WHERE occurred_at IS NULL;
CREATE TRIGGER case_events_reject_update BEFORE UPDATE ON case_events
FOR EACH ROW EXECUTE FUNCTION reject_case_event_mutation();

ALTER TABLE case_events DROP CONSTRAINT IF EXISTS case_events_event_type_check;
ALTER TABLE case_events ADD CONSTRAINT case_events_event_type_check CHECK (event_type IN (
    'case_opened', 'legacy_imported', 'case_updated', 'case_stage_changed',
    'agent_run_requested', 'agent_artifact_accepted', 'approval_requested',
    'approval_decided', 'case_resolved', 'case_closed', 'case_cancelled', 'case_reopened'
));
ALTER TABLE case_events DROP CONSTRAINT IF EXISTS case_events_reducer_version_check;
ALTER TABLE case_events ADD CONSTRAINT case_events_reducer_version_check CHECK (reducer_version IN (1, 2));

ALTER TABLE maintenance_cases DROP CONSTRAINT IF EXISTS maintenance_cases_write_authority_check;
ALTER TABLE maintenance_cases ADD CONSTRAINT maintenance_cases_write_authority_check
    CHECK (write_authority IN ('legacy', 'case-command-service/v1'));
ALTER TABLE maintenance_cases DROP CONSTRAINT IF EXISTS maintenance_cases_artifact_ids_check;
ALTER TABLE maintenance_cases ADD CONSTRAINT maintenance_cases_artifact_ids_check
    CHECK (jsonb_typeof(accepted_artifact_ids_json) = 'array');

CREATE UNIQUE INDEX IF NOT EXISTS case_events_event_id_unique
    ON case_events(event_id) WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS case_command_receipts (
    id BIGSERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL,
    case_id INTEGER NOT NULL,
    command_hash TEXT NOT NULL CHECK (command_hash ~ '^[a-f0-9]{64}$'),
    event_id TEXT NOT NULL,
    case_version INTEGER NOT NULL CHECK (case_version > 0),
    response_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (organization_id, idempotency_key),
    UNIQUE (event_id),
    FOREIGN KEY (organization_id, case_id)
        REFERENCES maintenance_cases(organization_id, id) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION reconstruction_enforce_case_projection_writer()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    authority TEXT;
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.write_authority = 'case-command-service/v1'
       AND NEW.write_authority IS DISTINCT FROM OLD.write_authority
       AND current_setting('house_maint.case_writer_authority_transition', true)
           IS DISTINCT FROM 'case-command-service/v1->legacy' THEN
        RAISE EXCEPTION 'canonical maintenance case authority downgrade requires an explicit transition gate'
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'DELETE' THEN
        authority := OLD.write_authority;
    ELSIF TG_OP = 'UPDATE'
          AND (OLD.write_authority = 'case-command-service/v1'
               OR NEW.write_authority = 'case-command-service/v1') THEN
        authority := 'case-command-service/v1';
    ELSE
        authority := NEW.write_authority;
    END IF;
    IF authority = 'case-command-service/v1'
       AND current_setting('house_maint.case_writer', true) IS DISTINCT FROM 'case-command-service/v1' THEN
        RAISE EXCEPTION 'canonical maintenance case requires CaseCommandService writer authority'
            USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reconstruction_case_projection_writer ON maintenance_cases;
CREATE TRIGGER reconstruction_case_projection_writer
BEFORE INSERT OR UPDATE OR DELETE ON maintenance_cases
FOR EACH ROW EXECUTE FUNCTION reconstruction_enforce_case_projection_writer();

CREATE OR REPLACE FUNCTION reconstruction_enforce_case_event_writer()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    authority TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT write_authority INTO authority
          FROM maintenance_cases
         WHERE organization_id = OLD.organization_id AND id = OLD.case_id;
    ELSE
        SELECT write_authority INTO authority
          FROM maintenance_cases
         WHERE organization_id = NEW.organization_id AND id = NEW.case_id;
    END IF;
    IF authority = 'case-command-service/v1'
       AND current_setting('house_maint.case_writer', true) IS DISTINCT FROM 'case-command-service/v1' THEN
        RAISE EXCEPTION 'canonical case event requires CaseCommandService writer authority'
            USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reconstruction_case_event_writer ON case_events;
CREATE TRIGGER reconstruction_case_event_writer
BEFORE INSERT OR UPDATE OR DELETE ON case_events
FOR EACH ROW EXECUTE FUNCTION reconstruction_enforce_case_event_writer();

COMMIT;
