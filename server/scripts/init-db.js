import db from '../config/database.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Initializing database...');

// Read and execute schema
const schemaPath = join(__dirname, '..', 'models', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

console.log('✅ Schema created successfully');

// Insert test data
const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (phone, password_hash, name, avatar, role)
    VALUES (?, ?, ?, ?, ?)
`);

const insertWorker = db.prepare(`
    INSERT OR IGNORE INTO workers (user_id, skills, rating, latitude, longitude, available)
    VALUES (?, ?, ?, ?, ?, ?)
`);

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
        insertUser.run(user.phone, passwordHash, user.name, user.avatar, user.role);
    } catch (e) {
        // Ignore duplicate
    }
}

console.log('✅ Test users created');

// Get worker user IDs
const workerUsers = db.prepare(`SELECT id, name FROM users WHERE role = 'worker'`).all();

// Create worker profiles
const workerProfiles = [
    { skills: '["plumbing", "electrical"]', rating: 4.8, lat: 37.7749, lng: -122.4194 },
    { skills: '["plumbing"]', rating: 4.5, lat: 37.7849, lng: -122.4094 },
    { skills: '["electrical", "appliance"]', rating: 4.2, lat: 37.7649, lng: -122.4294 },
];

workerUsers.forEach((user, index) => {
    if (workerProfiles[index]) {
        const profile = workerProfiles[index];
        try {
            insertWorker.run(user.id, profile.skills, profile.rating, profile.lat, profile.lng, 1);
        } catch (e) {
            // Ignore duplicate
        }
    }
});

console.log('✅ Worker profiles created');

// Create a test report
const insertReport = db.prepare(`
    INSERT OR IGNORE INTO reports (id, user_id, title, description, category, status, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

try {
    insertReport.run(1, 1, '水管漏水', '厨房水槽下方的水管漏水，需要维修', 'plumbing', 'pending', 37.7749, -122.4194);
} catch (e) {
    // Ignore duplicate
}

console.log('✅ Test report created');

console.log('🎉 Database initialization complete!');
console.log(`📁 Database file: ${join(__dirname, '..', 'data', 'app.db')}`);

process.exit(0);
