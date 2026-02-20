import db from '../server/config/database.js';

async function migrate() {
    try {
        console.log('🚀 Adding diagnosis_result column to reports table...');

        // Check if column exists first (SQLite specific or just try-catch)
        await db.query('ALTER TABLE reports ADD COLUMN diagnosis_result TEXT');

        console.log('✅ Column added successfully.');
    } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
            console.log('ℹ️ Column already exists, skipping.');
        } else {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
    }
}

migrate();
