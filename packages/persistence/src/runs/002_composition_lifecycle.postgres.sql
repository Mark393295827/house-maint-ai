-- Forward-only declared run plans. Legacy runs remain valid without a plan;
-- composition runs persist one content-addressed plan before any task claim.
CREATE TABLE IF NOT EXISTS hm_agent_run_plans (
    run_id TEXT PRIMARY KEY REFERENCES hm_agent_runs(run_id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL,
    plan_hash TEXT NOT NULL CHECK (plan_hash ~ '^[a-f0-9]{64}$'),
    plan_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CHECK (plan_json->>'schema' = 'agent-run-plan/v1'),
    CHECK (plan_json->>'plan_id' = plan_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS hm_agent_run_plans_identity
    ON hm_agent_run_plans(run_id, plan_hash);

CREATE OR REPLACE FUNCTION hm_reject_agent_run_plan_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'agent run plans are immutable'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS hm_agent_run_plans_immutable ON hm_agent_run_plans;
CREATE TRIGGER hm_agent_run_plans_immutable
BEFORE UPDATE OR DELETE ON hm_agent_run_plans
FOR EACH ROW EXECUTE FUNCTION hm_reject_agent_run_plan_mutation();
