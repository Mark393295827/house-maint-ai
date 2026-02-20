
import pool, { isSQLite } from '../config/database.js';

async function migrate() {
    console.log('🔄 Migrating status check constraint & Fixing FKs...');

    if (!isSQLite) {
        // Postgres logic (same as before)
        try {
            await pool.query(`ALTER TABLE reports DROP CONSTRAINT reports_status_check`);
            await pool.query(`
                ALTER TABLE reports ADD CONSTRAINT reports_status_check 
                CHECK (status IN ('pending', 'matching', 'broadcasted', 'matched', 'in_progress', 'completed', 'cancelled', 'failed_analysis', 'analyzed', 'planned', 'flagged_for_review'))
            `);
            console.log('✅ Postgres constraints updated');
        } catch (e) {
            console.log('⚠️  Postgres constraint update failed:', e.message);
        }
        return;
    }

    try {
        await pool.query('PRAGMA foreign_keys=OFF');

        // --- 1. REPORTS ---
        console.log('📦 Migrating Reports...');
        try { await pool.query('DROP TABLE IF EXISTS reports_old'); } catch (e) { }

        // Check if reports exists
        try {
            await pool.query('ALTER TABLE reports RENAME TO reports_old');
        } catch (e) {
            console.log('⚠️ Reports table missing or already renamed');
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT,
                voice_url TEXT,
                video_url TEXT,
                image_urls TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'matching', 'broadcasted', 'matched', 'in_progress', 'completed', 'cancelled', 'failed_analysis', 'analyzed', 'planned', 'flagged_for_review')),
                matched_worker_id INTEGER,
                latitude REAL,
                longitude REAL,
                urgency_score INTEGER DEFAULT 0,
                matched_at TEXT,
                completed_at TEXT,
                resolution_details TEXT,
                pattern_extracted INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                
                -- v1.0 Columns
                issue_type TEXT,
                severity TEXT,
                diagnosis_summary TEXT,
                confidence_score REAL,
                priority_protocol TEXT,
                match_score REAL,
                estimated_arrival TEXT,
                resolution_plan TEXT,
                pattern_id INTEGER,

                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (matched_worker_id) REFERENCES workers(id) ON DELETE SET NULL
            )
        `);

        try {
            await pool.query(`
                INSERT INTO reports (
                    id, user_id, title, description, category, voice_url, video_url, image_urls, status, 
                    matched_worker_id, latitude, longitude, urgency_score, matched_at, completed_at, 
                    resolution_details, pattern_extracted, created_at, updated_at,
                    issue_type, severity, diagnosis_summary, confidence_score, priority_protocol, match_score, estimated_arrival, resolution_plan, pattern_id
                )
                SELECT 
                    id, user_id, title, description, category, voice_url, video_url, image_urls, status, 
                    matched_worker_id, latitude, longitude, urgency_score, matched_at, completed_at, 
                    resolution_details, pattern_extracted, created_at, updated_at,
                    issue_type, severity, diagnosis_summary, confidence_score, priority_protocol, match_score, estimated_arrival, resolution_plan, pattern_id
                FROM reports_old
            `);
            await pool.query('DROP TABLE reports_old');
        } catch (e) {
            console.log('⚠️ Could not copy reports data (source might be missing/empty):', e.message);
        }

        // --- 2. MATCHES ---
        console.log('📦 Migrating Matches (Fixing FK)...');
        try { await pool.query('DROP TABLE IF EXISTS matches_old'); } catch (e) { }
        try { await pool.query('ALTER TABLE matches RENAME TO matches_old'); } catch (e) { }

        await pool.query(`
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
            )
        `);

        try {
            await pool.query('INSERT INTO matches SELECT * FROM matches_old');
            await pool.query('DROP TABLE matches_old');
        } catch (e) { console.log('⚠️ Could not copy matches:', e.message); }

        // --- 3. REVIEWS ---
        console.log('📦 Migrating Reviews (Fixing FK)...');
        try { await pool.query('DROP TABLE IF EXISTS reviews_old'); } catch (e) { }
        try { await pool.query('ALTER TABLE reviews RENAME TO reviews_old'); } catch (e) { }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                worker_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
            )
        `);
        try {
            await pool.query('INSERT INTO reviews SELECT * FROM reviews_old');
            await pool.query('DROP TABLE reviews_old');
        } catch (e) { console.log('⚠️ Could not copy reviews:', e.message); }

        await pool.query('PRAGMA foreign_keys=ON');
        console.log('✅ SQLite tables migrated successfully');
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

migrate();
