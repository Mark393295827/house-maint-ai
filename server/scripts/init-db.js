/**
 * Database Initialization Script
 * Supports both SQLite (development) and PostgreSQL (production)
 */

import 'dotenv/config';
import db from '../config/db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
    console.log('🔧 Initializing database...');
    console.log(`📊 Database type: ${db.isUsingPostgres() ? 'PostgreSQL' : 'SQLite'}`);

    // Read and execute schema
    const schemaFile = db.isUsingPostgres() ? 'schema.pg.sql' : 'schema.sql';
    const schemaPath = join(__dirname, '..', 'models', schemaFile);
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    try {
        await db.exec(schema);
        console.log('✅ Schema created successfully');
    } catch (err) {
        console.error('❌ Schema creation failed:', err.message);
        process.exit(1);
    }

    // Create test users
    const passwordHash = bcrypt.hashSync('123456', 10);

    const testUsers = [
        { phone: '13800138001', name: 'Alex 用户', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', role: 'user' },
        { phone: '13800138002', name: 'Wang Shifu', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', role: 'worker' },
        { phone: '13800138003', name: 'Li Shifu', avatar: 'https://randomuser.me/api/portraits/men/45.jpg', role: 'worker' },
        { phone: '13800138004', name: 'Zhang Shifu', avatar: 'https://randomuser.me/api/portraits/men/22.jpg', role: 'worker' },
        { phone: '13800138000', name: '管理员', avatar: null, role: 'admin' },
    ];

    for (const user of testUsers) {
        try {
            const insertSql = db.isUsingPostgres()
                ? `INSERT INTO users (phone, password_hash, name, avatar, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO NOTHING`
                : `INSERT OR IGNORE INTO users (phone, password_hash, name, avatar, role) VALUES ($1, $2, $3, $4, $5)`;
            await db.run(insertSql, [user.phone, passwordHash, user.name, user.avatar, user.role]);
        } catch (e) {
            // Ignore duplicates
        }
    }
    console.log('✅ Test users created');

    // Get worker user IDs
    const workerUsers = await db.all(`SELECT id, name FROM users WHERE role = $1`, ['worker']);

    // Create worker profiles
    const workerProfiles = [
        { skills: '["plumbing", "electrical"]', rating: 4.8, lat: 37.7749, lng: -122.4194 },
        { skills: '["plumbing"]', rating: 4.5, lat: 37.7849, lng: -122.4094 },
        { skills: '["electrical", "appliance"]', rating: 4.2, lat: 37.7649, lng: -122.4294 },
    ];

    for (let i = 0; i < workerUsers.length && i < workerProfiles.length; i++) {
        const user = workerUsers[i];
        const profile = workerProfiles[i];
        try {
            const insertSql = db.isUsingPostgres()
                ? `INSERT INTO workers (user_id, skills, rating, latitude, longitude, available) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO NOTHING`
                : `INSERT OR IGNORE INTO workers (user_id, skills, rating, latitude, longitude, available) VALUES ($1, $2, $3, $4, $5, $6)`;
            await db.run(insertSql, [user.id, profile.skills, profile.rating, profile.lat, profile.lng, db.isUsingPostgres() ? true : 1]);
        } catch (e) {
            // Ignore duplicates
        }
    }
    console.log('✅ Worker profiles created');

    // Create a test report
    try {
        const firstUser = await db.get(`SELECT id FROM users WHERE role = $1 LIMIT 1`, ['user']);
        if (firstUser) {
            const insertSql = db.isUsingPostgres()
                ? `INSERT INTO reports (user_id, title, description, category, status, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7)`
                : `INSERT OR IGNORE INTO reports (user_id, title, description, category, status, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
            await db.run(insertSql, [firstUser.id, '水管漏水', '厨房水槽下方的水管漏水，需要维修', 'plumbing', 'pending', 37.7749, -122.4194]);
        }
    } catch (e) {
        // Ignore duplicates
    }
    console.log('✅ Test report created');

    console.log('🎉 Database initialization complete!');

    await db.close();
    process.exit(0);
}

initDatabase().catch(err => {
    console.error('❌ Initialization failed:', err);
    process.exit(1);
});
