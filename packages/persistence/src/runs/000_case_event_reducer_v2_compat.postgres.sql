-- Forward repair for databases where migration 006 created an auto-named
-- reducer_version = 1 check before reconstruction added the named v1/v2 check.
-- Drop only a check whose catalog definition still enforces equality to 1;
-- append-only triggers and every unrelated case_events constraint remain intact.
DO $$
DECLARE
    legacy_check RECORD;
BEGIN
    FOR legacy_check IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'case_events'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) ~ 'reducer_version[^)]*= 1'
    LOOP
        EXECUTE format('ALTER TABLE case_events DROP CONSTRAINT %I', legacy_check.conname);
    END LOOP;
END;
$$;

ALTER TABLE case_events DROP CONSTRAINT IF EXISTS case_events_reducer_version_check;
ALTER TABLE case_events ADD CONSTRAINT case_events_reducer_version_check
    CHECK (reducer_version IN (1, 2));

-- The v1 foundation used timestamp-without-time-zone while all public case
-- contracts carry offset instants. Upgrade only columns that are still the
-- legacy type; interpreting them in the database session timezone preserves
-- the instant that PostgreSQL used when the offset input was originally cast.
DO $$
DECLARE
    target RECORD;
BEGIN
    FOR target IN
        SELECT table_name, column_name
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND data_type = 'timestamp without time zone'
           AND (table_name, column_name) IN (
               ('maintenance_cases', 'created_at'),
               ('maintenance_cases', 'updated_at'),
               ('maintenance_cases', 'closed_at'),
               ('case_events', 'created_at')
           )
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE current_setting(''TIMEZONE'')',
            target.table_name, target.column_name, target.column_name
        );
    END LOOP;
END;
$$;
