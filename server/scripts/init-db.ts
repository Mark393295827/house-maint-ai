import pool, { isSQLite } from '../config/database.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initDb = async () => {
    console.log('🔧 Initializing database...');
    console.log(`📦 Using ${isSQLite ? 'SQLite' : 'PostgreSQL'} database`);

    try {
        // For SQLite, the schema is already auto-initialized by database.ts
        // For PostgreSQL, we need to run the schema file
        if (!isSQLite) {
            const schemaPath = join(__dirname, '..', 'models', 'schema.pg.sql');
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            await pool.query(schema);
            console.log('✅ PostgreSQL schema created successfully');
        } else {
            console.log('✅ SQLite schema auto-initialized');
        }

        // Insert test data
        const passwordHash = bcrypt.hashSync('123456', 10);

        const testUsers = [
            { phone: '13800138001', name: 'Alex 用户', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', role: 'user' },
            { phone: '13800138002', name: 'Wang Shifu', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', role: 'worker' },
            { phone: '13800138003', name: 'Li Shifu', avatar: 'https://randomuser.me/api/portraits/men/45.jpg', role: 'worker' },
            { phone: '13800138004', name: 'Zhang Shifu', avatar: 'https://randomuser.me/api/portraits/men/22.jpg', role: 'worker' },
            { phone: '13800138000', name: '管理员', avatar: null, role: 'admin' },
            { phone: '13800138005', name: '物业经理', avatar: null, role: 'manager' },
            { phone: '13800138006', name: '企业租户', avatar: null, role: 'tenant' },
        ];

        for (const user of testUsers) {
            try {
                if (isSQLite) {
                    // SQLite: Use INSERT OR REPLACE
                    await pool.query(
                        `INSERT OR REPLACE INTO users (phone, password_hash, name, avatar, role)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [user.phone, passwordHash, user.name, user.avatar, user.role]
                    );
                } else {
                    // PostgreSQL: Use ON CONFLICT
                    await pool.query(
                        `INSERT INTO users (phone, password_hash, name, avatar, role)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
                        [user.phone, passwordHash, user.name, user.avatar, user.role]
                    );
                }
            } catch (e) {
                console.error(`Error inserting user ${user.phone}:`, e);
            }
        }

        console.log('✅ Test users created');

        // Get worker user IDs
        const { rows: workerUsers } = await pool.query(`SELECT id, name FROM users WHERE role = 'worker'`);

        // Create worker profiles
        const workerProfiles = [
            { skills: '["plumbing", "electrical"]', rating: 4.8, lat: 37.7749, lng: -122.4194 },
            { skills: '["plumbing"]', rating: 4.5, lat: 37.7849, lng: -122.4094 },
            { skills: '["electrical", "appliance"]', rating: 4.2, lat: 37.7649, lng: -122.4294 },
        ];

        for (let index = 0; index < workerUsers.length; index++) {
            const user = workerUsers[index];
            if (workerProfiles[index]) {
                const profile = workerProfiles[index];
                try {
                    if (isSQLite) {
                        await pool.query(
                            `INSERT OR IGNORE INTO workers (user_id, skills, rating, latitude, longitude, available)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [user.id, profile.skills, profile.rating, profile.lat, profile.lng, 1]
                        );
                    } else {
                        await pool.query(
                            `INSERT INTO workers (user_id, skills, rating, latitude, longitude, available)
                             VALUES ($1, $2, $3, $4, $5, $6)
                             ON CONFLICT (user_id) DO NOTHING`,
                            [user.id, profile.skills, profile.rating, profile.lat, profile.lng, 1]
                        );
                    }
                } catch (e) {
                    console.error(`Error inserting worker profile for ${user.id}:`, e);
                }
            }
        }

        console.log('✅ Worker profiles created');

        // Create a test report
        try {
            const { rows: users } = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['user']);
            if (users.length > 0) {
                const userId = users[0].id;
                await pool.query(
                    `INSERT INTO reports (user_id, title, description, category, status, latitude, longitude)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, '水管漏水', '厨房水槽下方的水管漏水，需要维修', 'plumbing', 'pending', 37.7749, -122.4194]
                );
                console.log('✅ Test report created');
            }
        } catch (e) {
            console.error('Error creating report:', e);
        }

        console.log('🎉 Database initialization complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        process.exit(1);
    }
};

initDb();
