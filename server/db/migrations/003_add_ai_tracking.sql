-- server/db/migrations/003_add_ai_tracking.sql
-- Migration to add AI usage tracking and budgeting tables

-- AI Usage Logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  endpoint TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);

-- AI Global Budgets / Limits
CREATE TABLE IF NOT EXISTS ai_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial budget settings
INSERT INTO ai_settings (key, value) VALUES ('daily_budget_usd', '10.0') ON CONFLICT (key) DO NOTHING;
INSERT INTO ai_settings (key, value) VALUES ('alert_email', 'admin@house-maint-ai.com') ON CONFLICT (key) DO NOTHING;
