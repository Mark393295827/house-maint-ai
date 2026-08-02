-- House Maint AI Database Schema
-- PostgreSQL forward-only initialization. Do not drop production data here.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    wechat_openid TEXT UNIQUE,
    wechat_unionid TEXT UNIQUE,
    wechat_session_key TEXT,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('user', 'worker', 'admin', 'manager', 'tenant')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skills TEXT NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    total_jobs INTEGER DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    available INTEGER DEFAULT 1,
    bio TEXT,
    hourly_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    voice_url TEXT,
    video_url TEXT,
    image_urls TEXT,
    diagnosis_result TEXT,
    issue_type TEXT,
    severity TEXT,
    diagnosis_summary TEXT,
    confidence_score REAL,
    priority_protocol TEXT,
    estimated_arrival TEXT,
    resolution_plan TEXT,
    status VARCHAR(32) DEFAULT 'pending' CHECK(status IN ('pending', 'analyzed', 'planned', 'matching', 'broadcasted', 'matched', 'in_progress', 'completed', 'cancelled', 'failed_analysis', 'failed_planning', 'flagged_for_review')),
    matched_worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    pattern_id INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    urgency_score INTEGER DEFAULT 0,
    match_score REAL,
    matched_at TIMESTAMP,
    completed_at TIMESTAMP,
    resolution_details TEXT,
    severity_tag VARCHAR(20) DEFAULT '48h' CHECK(severity_tag IN ('diy', '48h', 'emergency')),
    diagnosis_correct INTEGER,
    first_time_fix INTEGER,
    pattern_extracted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    score REAL NOT NULL,
    distance_score REAL,
    rating_score REAL,
    skill_score REAL,
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    photos TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patterns (
    id SERIAL PRIMARY KEY,
    problem_type VARCHAR(50) NOT NULL,
    context_signature VARCHAR(255) NOT NULL,
    solution TEXT NOT NULL,
    success_rate REAL DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performance_score REAL DEFAULT 0,
    consecutive_high_ratings INTEGER DEFAULT 0,
    generation_version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'experimental',
    is_variant INTEGER DEFAULT 0,
    UNIQUE(problem_type, context_signature)
);

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

CREATE TABLE IF NOT EXISTS ai_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_budget_reservations (
    period_key TEXT PRIMARY KEY,
    budget_cny DOUBLE PRECISION NOT NULL,
    reserved_cny DOUBLE PRECISION NOT NULL DEFAULT 0,
    spent_cny DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    worker_id INTEGER,
    stripe_session_id TEXT,
    wechat_out_trade_no TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'cny',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    diagnosis_data TEXT,
    is_helpful INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('job_update', 'message', 'payment', 'system')),
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    revoked INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_assets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date TEXT,
    warranty_expiry TEXT,
    specs TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'claimed', 'running', 'blocked', 'review', 'done', 'failed')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    owner_claw TEXT,
    inputs TEXT,
    outputs TEXT,
    score REAL DEFAULT 0.0,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pheromone_events (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_workers_available ON workers(available);
CREATE INDEX IF NOT EXISTS idx_matches_report_id ON matches(report_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_claw);
CREATE INDEX IF NOT EXISTS idx_pheromone_task_id ON pheromone_events(task_id);

-- Organization-scoped maintenance case foundation (B1).
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY CHECK(id > 0), slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
    default_timezone TEXT NOT NULL DEFAULT 'UTC', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS organization_memberships (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','manager','resident','worker','auditor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','suspended','revoked')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP, CHECK(id > 0 AND organization_id > 0 AND user_id > 0),
    UNIQUE(organization_id,user_id), UNIQUE(organization_id,id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, name TEXT NOT NULL, external_ref TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC', status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0), UNIQUE(organization_id,id), UNIQUE(organization_id,external_ref),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, property_id INTEGER NOT NULL, label TEXT NOT NULL,
    external_ref TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND property_id > 0), UNIQUE(organization_id,id),
    UNIQUE(organization_id,property_id,id), UNIQUE(property_id,label), UNIQUE(organization_id,property_id,external_ref),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id) REFERENCES properties(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS resource_grants (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, membership_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('organization','property','unit','case')), resource_id INTEGER NOT NULL,
    capability TEXT NOT NULL CHECK(capability IN ('read','contribute','manage','message','media','dispatch','verify','report')),
    granted_by_membership_id INTEGER, expires_at TIMESTAMP, revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND membership_id > 0 AND resource_id > 0 AND (granted_by_membership_id IS NULL OR granted_by_membership_id > 0)),
    CHECK(resource_type <> 'organization' OR resource_id = organization_id),
    UNIQUE(membership_id,resource_type,resource_id,capability),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,granted_by_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS maintenance_cases (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, property_id INTEGER, unit_id INTEGER,
    opened_by_membership_id INTEGER, legacy_report_id INTEGER UNIQUE, title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','closed','cancelled')),
    stage TEXT NOT NULL DEFAULT 'intake' CHECK(stage IN ('intake','diagnosis','resolution','dispatch','repair','verification','closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','urgent','emergency')),
    version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND (property_id IS NULL OR property_id > 0) AND (unit_id IS NULL OR unit_id > 0) AND (opened_by_membership_id IS NULL OR opened_by_membership_id > 0) AND (legacy_report_id IS NULL OR legacy_report_id > 0)),
    CHECK(unit_id IS NULL OR property_id IS NOT NULL), UNIQUE(organization_id,id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id) REFERENCES properties(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id,unit_id) REFERENCES units(organization_id,property_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,opened_by_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (legacy_report_id) REFERENCES reports(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS case_events (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, case_id INTEGER NOT NULL, sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('case_opened','legacy_imported','case_updated','case_stage_changed','case_resolved','case_closed','case_cancelled','case_reopened')),
    schema_version INTEGER NOT NULL DEFAULT 1, reducer_version INTEGER NOT NULL DEFAULT 1,
    actor_type TEXT NOT NULL CHECK(actor_type IN ('member','system','agent','integration')), actor_membership_id INTEGER,
    idempotency_key TEXT NOT NULL, command_hash TEXT NOT NULL, payload_hash TEXT NOT NULL,
    projection_patch_json TEXT NOT NULL, payload_json TEXT NOT NULL, correlation_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND case_id > 0 AND (actor_membership_id IS NULL OR actor_membership_id > 0)),
    CHECK(sequence > 0 AND schema_version > 0 AND reducer_version = 1),
    CHECK(actor_type <> 'member' OR actor_membership_id IS NOT NULL),
    UNIQUE(case_id,sequence), UNIQUE(case_id,idempotency_key),
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
CREATE OR REPLACE FUNCTION reject_case_event_mutation() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'case_events is append-only'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS case_events_reject_update ON case_events;
CREATE TRIGGER case_events_reject_update BEFORE UPDATE ON case_events
FOR EACH ROW EXECUTE FUNCTION reject_case_event_mutation();
DROP TRIGGER IF EXISTS case_events_reject_delete ON case_events;
CREATE TRIGGER case_events_reject_delete BEFORE DELETE ON case_events
FOR EACH ROW EXECUTE FUNCTION reject_case_event_mutation();
