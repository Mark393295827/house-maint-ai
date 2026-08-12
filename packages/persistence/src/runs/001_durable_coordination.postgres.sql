-- Forward-only durable agent coordination schema. This migration is intentionally
-- namespaced and additive so it can be rehearsed without enabling the worker.
CREATE TABLE IF NOT EXISTS hm_agent_sessions (
    session_id TEXT PRIMARY KEY,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    policy_version TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
    scope_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (organization_id, scope_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS hm_agent_runs (
    run_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES hm_agent_sessions(session_id) ON DELETE RESTRICT,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    case_version INTEGER NOT NULL CHECK (case_version >= 0),
    command_id TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
    status TEXT NOT NULL CHECK (status IN ('pending','running','waiting_approval','succeeded','cancelled','failed')),
    budget_json JSONB NOT NULL,
    consumed_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    terminal_at TIMESTAMPTZ,
    UNIQUE (organization_id, scope_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS hm_agent_tasks (
    task_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    case_version INTEGER NOT NULL CHECK (case_version >= 0),
    policy_version TEXT NOT NULL,
    capability TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
    envelope_json JSONB NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('ready','claimed','running','retry_wait','succeeded','cancelled','failed','expired')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL CHECK (max_attempts BETWEEN 1 AND 2),
    lease_owner TEXT,
    lease_token TEXT,
    lease_expires_at TIMESTAMPTZ,
    not_before TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    output_artifact_id TEXT,
    evaluation_id TEXT,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE (run_id, idempotency_key),
    CHECK ((lease_token IS NULL) = (lease_owner IS NULL)),
    CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL))
);

CREATE INDEX IF NOT EXISTS hm_agent_tasks_claimable
    ON hm_agent_tasks(state, not_before, expires_at, created_at);

CREATE TABLE IF NOT EXISTS hm_run_signals (
    signal_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
    signal_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS hm_agent_artifacts (
    artifact_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    task_id TEXT NOT NULL REFERENCES hm_agent_tasks(task_id) ON DELETE RESTRICT,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    case_version INTEGER NOT NULL CHECK (case_version >= 0),
    policy_version TEXT NOT NULL,
    payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
    envelope_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS hm_agent_evaluations (
    evaluation_id TEXT PRIMARY KEY,
    artifact_id TEXT NOT NULL REFERENCES hm_agent_artifacts(artifact_id) ON DELETE RESTRICT,
    run_id TEXT NOT NULL REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    task_id TEXT NOT NULL REFERENCES hm_agent_tasks(task_id) ON DELETE RESTRICT,
    receipt_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE OR REPLACE FUNCTION hm_reject_agent_artifact_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'agent artifacts are immutable'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS hm_agent_artifacts_immutable ON hm_agent_artifacts;
CREATE TRIGGER hm_agent_artifacts_immutable
BEFORE UPDATE OR DELETE ON hm_agent_artifacts
FOR EACH ROW EXECUTE FUNCTION hm_reject_agent_artifact_mutation();

CREATE OR REPLACE FUNCTION hm_reject_agent_evaluation_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'agent evaluations are immutable'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS hm_agent_evaluations_immutable ON hm_agent_evaluations;
CREATE TRIGGER hm_agent_evaluations_immutable
BEFORE UPDATE OR DELETE ON hm_agent_evaluations
FOR EACH ROW EXECUTE FUNCTION hm_reject_agent_evaluation_mutation();

CREATE TABLE IF NOT EXISTS hm_run_events (
    sequence BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    run_id TEXT REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    task_id TEXT REFERENCES hm_agent_tasks(task_id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    details_json JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS hm_run_events_lineage
    ON hm_run_events(organization_id, run_id, sequence);
