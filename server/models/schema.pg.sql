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
