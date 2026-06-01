import { vi, describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Master Schema String
const MASTER_SCHEMA = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE,
        password_hash TEXT,
        name TEXT,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        voice_url TEXT,
        video_url TEXT,
        image_urls TEXT DEFAULT '[]',
        user_assets TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        matched_worker_id INTEGER,
        pattern_id INTEGER,
        latitude REAL,
        longitude REAL,
        urgency_score INTEGER DEFAULT 0,
        match_score REAL,
        severity_tag TEXT DEFAULT '48h',
        resolution_details TEXT,
        pattern_extracted INTEGER DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_type TEXT NOT NULL,
        context_signature TEXT NOT NULL,
        solution TEXT NOT NULL,
        success_rate REAL DEFAULT 1.0,
        usage_count INTEGER DEFAULT 1,
        performance_score REAL DEFAULT 0,
        consecutive_high_ratings INTEGER DEFAULT 0,
        status TEXT DEFAULT 'experimental',
        is_variant INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        model_name TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        cost_usd REAL,
        endpoint TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        user_id INTEGER,
        worker_id INTEGER,
        rating INTEGER,
        comment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        revoked INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        name TEXT,
        brand TEXT,
        model TEXT,
        serial_number TEXT,
        purchase_date TEXT,
        warranty_expiry TEXT,
        specs TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        skills TEXT DEFAULT '[]',
        rating REAL DEFAULT 5.0,
        total_jobs INTEGER DEFAULT 0,
        latitude REAL,
        longitude REAL,
        available INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        objective TEXT,
        status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'medium',
        inputs TEXT,
        result TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`;

const mockQuery = (db: any) => async (text: string, params?: any[]) => {
    let sql = text;
    if (params) {
        params.forEach((p, i) => {
            const val = (p === undefined || p === null) ? 'NULL' : (typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : p);
            sql = sql.replace('$' + (i + 1), val);
        });
    }
    sql = sql.replace(/RETURNING\s+[\w,\s,*]+/gi, '')
             .replace(/json_group_array\(.*\)/gi, "'[]'")
             .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");

    try {
        const trimmed = sql.trim().toUpperCase();
        
        // Simplify geographic queries for SQLite mock
        if (trimmed.includes('ACOS(') || trimmed.includes('RADIANS(')) {
            // Replace distance calculation with a dummy value
            sql = sql.replace(/\(6371\s*\*\s*acos\(.*?\)\)\s*AS\s*distance/gi, "0 AS distance");
            // Remove distance filter/order if any
            sql = sql.replace(/ORDER\s+BY\s+distance\s+ASC/gi, "");
        }

        if (trimmed.startsWith('SELECT')) {
            const rows = db.prepare(sql).all();
            return { rows, rowCount: rows.length };
        } else {
            const result = db.prepare(sql).run();
            if (text.toUpperCase().includes('RETURNING')) {
                 // Try to find table name from INSERT or UPDATE
                 const tableMatch = text.match(/(?:INSERT\s+INTO|UPDATE)\s+(\w+)/i);
                 if (tableMatch) {
                    const table = tableMatch[1];
                    // If INSERT, take last row. If UPDATE, we'd need ID, but usually we just want the touched row.
                    // Simplified: just take the most recently updated row from that table.
                    const row = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`).get();
                    return { rows: [row], rowCount: 1 };
                 }
            }
            return { rows: [], rowCount: result.changes };
        }
    } catch (e: any) {
        console.error('MOCK DB ERROR:', e.message, '\nSQL:', sql);
        throw e;
    }
};

export { MASTER_SCHEMA, mockQuery };
