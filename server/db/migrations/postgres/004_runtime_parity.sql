-- Forward-only PostgreSQL repair for installations created from older schema.pg.sql versions.

ALTER TABLE workers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS hourly_rate REAL;

ALTER TABLE patterns ADD COLUMN IF NOT EXISTS consecutive_high_ratings INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS is_variant INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS generation_version INTEGER DEFAULT 1;

ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS model_name TEXT;
UPDATE ai_usage_logs SET model_name = 'unknown' WHERE model_name IS NULL;
ALTER TABLE ai_usage_logs ALTER COLUMN model_name SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_usage_logs' AND column_name = 'task_type'
    ) THEN
        ALTER TABLE ai_usage_logs ALTER COLUMN task_type DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS purchase_date TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS warranty_expiry TEXT;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS specs TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_assets' AND column_name = 'label'
    ) THEN
        EXECUTE 'UPDATE user_assets SET name = COALESCE(name, label) WHERE name IS NULL';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_assets' AND column_name = 'category'
    ) THEN
        EXECUTE 'UPDATE user_assets SET type = COALESCE(type, category, ''other'') WHERE type IS NULL';
    ELSE
        UPDATE user_assets SET type = 'other' WHERE type IS NULL;
    END IF;
END $$;

ALTER TABLE user_assets ALTER COLUMN type SET NOT NULL;
ALTER TABLE user_assets ALTER COLUMN name SET NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_claw TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS outputs TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS score REAL DEFAULT 0.0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'result'
    ) THEN
        EXECUTE 'UPDATE tasks SET outputs = COALESCE(outputs, result) WHERE outputs IS NULL';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pheromone_events (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_claw);
CREATE INDEX IF NOT EXISTS idx_pheromone_task_id ON pheromone_events(task_id);
