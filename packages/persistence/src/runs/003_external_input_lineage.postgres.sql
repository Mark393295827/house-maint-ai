-- Forward-only immutable external input lineage. A row binds one declared run
-- to exact accepted artifact, evaluation, and independent registry-route proof
-- bytes before any task is enqueued.
CREATE TABLE IF NOT EXISTS hm_agent_run_inputs (
    input_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    command_id TEXT NOT NULL,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    case_version INTEGER NOT NULL CHECK (case_version >= 0),
    policy_version TEXT NOT NULL,
    artifact_id TEXT NOT NULL,
    evaluation_id TEXT NOT NULL,
    proof_id TEXT NOT NULL,
    input_hash TEXT NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
    artifact_hash TEXT NOT NULL CHECK (artifact_hash ~ '^[a-f0-9]{64}$'),
    evaluation_hash TEXT NOT NULL CHECK (evaluation_hash ~ '^[a-f0-9]{64}$'),
    route_proof_hash TEXT NOT NULL CHECK (route_proof_hash ~ '^[a-f0-9]{64}$'),
    input_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (run_id, artifact_id),
    CHECK (input_json->>'schema' = 'agent-run-input/v1'),
    CHECK (input_json->>'input_id' = input_id),
    CHECK (input_json->>'run_id' = run_id),
    CHECK (input_json->>'command_id' = command_id),
    CHECK (input_json->'artifact'->>'artifact_id' = artifact_id),
    CHECK (input_json->'evaluation'->>'evaluation_id' = evaluation_id),
    CHECK (input_json->'route_proof'->>'proof_id' = proof_id)
);

CREATE INDEX IF NOT EXISTS hm_agent_run_inputs_lineage
    ON hm_agent_run_inputs(run_id, created_at, input_id);

CREATE OR REPLACE FUNCTION hm_reject_agent_run_input_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'agent run inputs are immutable'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS hm_agent_run_inputs_immutable ON hm_agent_run_inputs;
CREATE TRIGGER hm_agent_run_inputs_immutable
BEFORE UPDATE OR DELETE ON hm_agent_run_inputs
FOR EACH ROW EXECUTE FUNCTION hm_reject_agent_run_input_mutation();
