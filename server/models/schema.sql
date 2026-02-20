-- House Maint AI Database Schema
-- SQLite

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
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
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'matching', 'broadcasted', 'matched', 'in_progress', 'completed', 'cancelled', 'failed_analysis')),
    matched_worker_id INTEGER,
    latitude REAL,

    longitude REAL,
    urgency_score INTEGER DEFAULT 0, -- 0-10 Scale
    matched_at TEXT,
    completed_at TEXT,
    resolution_details TEXT, -- JSON: { steps, parts, cost, photos }
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
    last_used TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(problem_type, context_signature)
);

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

-- AI Usage Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);

