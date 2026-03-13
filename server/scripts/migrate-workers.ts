import pool from '../config/database.js';

async function migrate() {
    try {
        console.log('🔄 Checking workers table schema...');
        const columns = [
            { name: 'service_area', type: 'TEXT' },
            { name: 'experience', type: 'TEXT' },
            { name: 'rating', type: 'REAL DEFAULT 5.0' },
            { name: 'latitude', type: 'REAL' },
            { name: 'longitude', type: 'REAL' },
            { name: 'skills', type: 'TEXT' } // Store as JSON string in SQLite
        ];

        for (const col of columns) {
            try {
                await pool.query(`ALTER TABLE workers ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column ${col.name}`);
            } catch (e: any) {
                if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
                    console.log(`ℹ️ Column ${col.name} already exists`);
                } else {
                    console.error(`❌ Error adding column ${col.name}:`, e.message);
                }
            }
        }

        console.log('✅ Migration complete');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

migrate();
