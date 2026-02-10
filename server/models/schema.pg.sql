-- House Maint AI Database Schema
-- PostgreSQL

-- Drop tables if they exist (reverse order of dependencies)
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS workers;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('user', 'worker', 'admin', 'manager', 'tenant')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workers Table
CREATE TABLE workers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skills TEXT NOT NULL, -- JSON array stored as text
    rating DECIMAL(3, 2) DEFAULT 5.0,
    total_jobs INTEGER DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    available INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    voice_url TEXT,
    video_url TEXT,
    image_urls TEXT, -- JSON array
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'matching', 'matched', 'in_progress', 'completed', 'cancelled')),
    matched_worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches Table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    score DECIMAL(5, 4) NOT NULL,
    distance_score DECIMAL(5, 4),
    rating_score DECIMAL(5, 4),
    skill_score DECIMAL(5, 4),
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community Posts Table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON array
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_workers_available ON workers(available);
CREATE INDEX IF NOT EXISTS idx_matches_report_id ON matches(report_id);

-- Patterns Table (AI Learning)
CREATE TABLE patterns (
    id SERIAL PRIMARY KEY,
    problem_type VARCHAR(50) NOT NULL,
    context_signature VARCHAR(255) NOT NULL,
    solution TEXT NOT NULL, -- JSON
    success_rate DECIMAL(3, 2) DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(problem_type, context_signature)
);
