-- House Maint AI Database Schema
-- SQLite

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE, -- Nullable because WeChat users might not bind phone immediately
    wechat_openid TEXT UNIQUE,
    wechat_unionid TEXT UNIQUE,
    wechat_session_key TEXT,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'worker', 'admin', 'manager', 'tenant')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 工人详情表
CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    skills TEXT NOT NULL, -- JSON array: ["plumbing", "electrical"]
    rating REAL DEFAULT 5.0,
    total_jobs INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL,
    available INTEGER DEFAULT 1,
    bio TEXT,
    hourly_rate REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 报修表
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT, -- plumbing, electrical, appliance, etc.
    voice_url TEXT,
    video_url TEXT,
    image_urls TEXT, -- JSON array
    diagnosis_result TEXT,
    issue_type TEXT,
    severity TEXT,
    diagnosis_summary TEXT,
    confidence_score REAL,
    priority_protocol TEXT,
    estimated_arrival TEXT,
    resolution_plan TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'analyzed', 'planned', 'matching', 'broadcasted', 'matched', 'in_progress', 'completed', 'cancelled', 'failed_analysis', 'failed_planning', 'flagged_for_review')),
    matched_worker_id INTEGER,
    pattern_id INTEGER,
    latitude REAL,

    longitude REAL,
    urgency_score INTEGER DEFAULT 0, -- 0-10 Scale
    match_score REAL,
    matched_at TEXT,
    completed_at TEXT,
    resolution_details TEXT, -- JSON: { steps, parts, cost, photos }
    severity_tag TEXT DEFAULT '48h' CHECK(severity_tag IN ('diy', '48h', 'emergency')),
    diagnosis_correct INTEGER, -- Boolean 0/1 to close the learning loop
    first_time_fix INTEGER, -- Boolean 0/1
    pattern_extracted INTEGER DEFAULT 0, -- Boolean: Has this report been processed by AI learning?
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

-- 匹配记录表
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    score REAL NOT NULL,
    distance_score REAL,
    rating_score REAL,
    skill_score REAL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    photos TEXT, -- JSON array of URLs
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 工人平均评分视图
DROP VIEW IF EXISTS worker_ratings;
CREATE VIEW worker_ratings AS
SELECT 
  worker_id,
  AVG(rating) as avg_rating,
  COUNT(*) as total_reviews
FROM reviews
GROUP BY worker_id;

-- 社区帖子表
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON array
    likes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户资产表 (User Assets)
CREATE TABLE IF NOT EXISTS user_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- appliance, system, structure
    name TEXT NOT NULL, -- Samsung Refrigerator
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date TEXT,
    warranty_expiry TEXT,
    specs TEXT, -- JSON string for technical details
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 价格指南表 (Price Guide)
CREATE TABLE IF NOT EXISTS price_guide (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- plumbing
    task_name TEXT NOT NULL, -- Faucet Replacement
    description TEXT,
    base_price_low REAL NOT NULL,
    base_price_high REAL NOT NULL,
    unit TEXT NOT NULL, -- per_item, per_hour, fixed
    created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_workers_available ON workers(available);
CREATE INDEX IF NOT EXISTS idx_matches_report_id ON matches(report_id);

-- 模式缓存表 (AI Learning)
CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_type TEXT NOT NULL,
    context_signature TEXT NOT NULL,
    solution TEXT NOT NULL, -- JSON
    success_rate REAL DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    performance_score REAL DEFAULT 0,
    consecutive_high_ratings INTEGER DEFAULT 0,
    status TEXT DEFAULT 'experimental', -- experimental, production, deprecated
    is_variant INTEGER DEFAULT 0,
    generation_version INTEGER DEFAULT 1,
    last_used TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(problem_type, context_signature)
);

-- AI Usage Logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    model_name TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    endpoint TEXT,
    duration_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- AI Settings
CREATE TABLE IF NOT EXISTS ai_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS research_budget_reservations (
    period_key TEXT PRIMARY KEY,
    budget_cny REAL NOT NULL,
    reserved_cny REAL NOT NULL DEFAULT 0,
    spent_cny REAL NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Orders Table (P0: Payment Lifecycle)
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_id INTEGER,
    worker_id INTEGER,
    stripe_session_id TEXT,
    wechat_out_trade_no TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'cny',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

-- AI Feedback Table (P0: Trust Loop)
CREATE TABLE IF NOT EXISTS ai_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    report_id INTEGER,
    diagnosis_data TEXT,
    is_helpful INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

-- Messages Table (P1: User-Worker Messaging)
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    report_id INTEGER,
    content TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

-- Notifications Table (P1: In-App Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('job_update', 'message', 'payment', 'system')),
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    revoked INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- P1 Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);

-- P0 Indexes (Audit Remediation)
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_report_status ON orders(user_id, report_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_matched_worker ON reports(matched_worker_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);

-- Organization-scoped maintenance case foundation (B1).
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK(id > 0), slug TEXT NOT NULL, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
    default_timezone TEXT NOT NULL DEFAULT 'UTC', created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')), CONSTRAINT organizations_slug_unique UNIQUE(slug)
);
CREATE TABLE IF NOT EXISTS organization_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, organization_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','manager','resident','worker','auditor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','suspended','revoked')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), revoked_at TEXT,
    CONSTRAINT organization_memberships_ids_positive CHECK(id > 0 AND organization_id > 0 AND user_id > 0),
    CONSTRAINT organization_memberships_org_user_unique UNIQUE(organization_id,user_id),
    CONSTRAINT organization_memberships_org_id_unique UNIQUE(organization_id,id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, organization_id INTEGER NOT NULL, name TEXT NOT NULL, external_ref TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC', status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT properties_ids_positive CHECK(id > 0 AND organization_id > 0),
    CONSTRAINT properties_org_id_unique UNIQUE(organization_id,id),
    CONSTRAINT properties_org_external_ref_unique UNIQUE(organization_id,external_ref),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, organization_id INTEGER NOT NULL, property_id INTEGER NOT NULL,
    label TEXT NOT NULL, external_ref TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT units_ids_positive CHECK(id > 0 AND organization_id > 0 AND property_id > 0),
    CONSTRAINT units_org_id_unique UNIQUE(organization_id,id),
    CONSTRAINT units_org_property_id_unique UNIQUE(organization_id,property_id,id),
    CONSTRAINT units_property_label_unique UNIQUE(property_id,label),
    CONSTRAINT units_org_property_external_ref_unique UNIQUE(organization_id,property_id,external_ref),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id) REFERENCES properties(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS resource_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, organization_id INTEGER NOT NULL, membership_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('organization','property','unit','case')), resource_id INTEGER NOT NULL,
    capability TEXT NOT NULL CHECK(capability IN ('read','contribute','manage','message','media','dispatch','verify','report')),
    granted_by_membership_id INTEGER, expires_at TEXT, revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT resource_grants_ids_positive CHECK(id > 0 AND organization_id > 0 AND membership_id > 0 AND resource_id > 0 AND (granted_by_membership_id IS NULL OR granted_by_membership_id > 0)),
    CONSTRAINT resource_grants_organization_scope_check CHECK(resource_type <> 'organization' OR resource_id = organization_id),
    CONSTRAINT resource_grants_scope_unique UNIQUE(membership_id,resource_type,resource_id,capability),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,granted_by_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS maintenance_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, organization_id INTEGER NOT NULL, property_id INTEGER, unit_id INTEGER,
    opened_by_membership_id INTEGER, legacy_report_id INTEGER, title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','closed','cancelled')),
    stage TEXT NOT NULL DEFAULT 'intake' CHECK(stage IN ('intake','diagnosis','resolution','dispatch','repair','verification','closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','urgent','emergency')),
    version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0), created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')), closed_at TEXT,
    CONSTRAINT maintenance_cases_ids_positive CHECK(id > 0 AND organization_id > 0 AND (property_id IS NULL OR property_id > 0) AND (unit_id IS NULL OR unit_id > 0) AND (opened_by_membership_id IS NULL OR opened_by_membership_id > 0) AND (legacy_report_id IS NULL OR legacy_report_id > 0)),
    CONSTRAINT maintenance_cases_unit_property_check CHECK(unit_id IS NULL OR property_id IS NOT NULL),
    CONSTRAINT maintenance_cases_org_id_unique UNIQUE(organization_id,id),
    CONSTRAINT maintenance_cases_legacy_report_unique UNIQUE(legacy_report_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id) REFERENCES properties(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id,unit_id) REFERENCES units(organization_id,property_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,opened_by_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (legacy_report_id) REFERENCES reports(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS case_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, organization_id INTEGER NOT NULL, case_id INTEGER NOT NULL, sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('case_opened','legacy_imported','case_updated','case_stage_changed','case_resolved','case_closed','case_cancelled','case_reopened')),
    schema_version INTEGER NOT NULL DEFAULT 1, reducer_version INTEGER NOT NULL DEFAULT 1,
    actor_type TEXT NOT NULL CHECK(actor_type IN ('member','system','agent','integration')), actor_membership_id INTEGER,
    idempotency_key TEXT NOT NULL, command_hash TEXT NOT NULL, payload_hash TEXT NOT NULL,
    projection_patch_json TEXT NOT NULL, payload_json TEXT NOT NULL, correlation_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT case_events_ids_positive CHECK(id > 0 AND organization_id > 0 AND case_id > 0 AND (actor_membership_id IS NULL OR actor_membership_id > 0)),
    CONSTRAINT case_events_versions_check CHECK(sequence > 0 AND schema_version > 0 AND reducer_version = 1),
    CONSTRAINT case_events_member_actor_check CHECK(actor_type <> 'member' OR actor_membership_id IS NOT NULL),
    CONSTRAINT case_events_case_sequence_unique UNIQUE(case_id,sequence),
    CONSTRAINT case_events_case_idempotency_unique UNIQUE(case_id,idempotency_key),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,case_id) REFERENCES maintenance_cases(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,actor_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_status ON organization_memberships(user_id,status);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_role_status ON organization_memberships(organization_id,role,status);
CREATE INDEX IF NOT EXISTS idx_properties_org_status ON properties(organization_id,status);
CREATE INDEX IF NOT EXISTS idx_units_org_property_status ON units(organization_id,property_id,status);
CREATE INDEX IF NOT EXISTS idx_resource_grants_target ON resource_grants(organization_id,resource_type,resource_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_cases_org_status_updated ON maintenance_cases(organization_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_cases_org_property_unit ON maintenance_cases(organization_id,property_id,unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_cases_legacy_report ON maintenance_cases(legacy_report_id);
CREATE INDEX IF NOT EXISTS idx_case_events_org_case_sequence ON case_events(organization_id,case_id,sequence);
CREATE INDEX IF NOT EXISTS idx_case_events_correlation ON case_events(correlation_id);
CREATE TRIGGER IF NOT EXISTS case_events_reject_update BEFORE UPDATE ON case_events
BEGIN SELECT RAISE(ABORT, 'case_events is append-only'); END;
CREATE TRIGGER IF NOT EXISTS case_events_reject_delete BEFORE DELETE ON case_events
BEGIN SELECT RAISE(ABORT, 'case_events is append-only'); END;

