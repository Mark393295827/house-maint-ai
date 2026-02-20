
import db from '../server/config/database';

async function migrate() {
    console.log('Migrating database...');
    try {
        await db.query(`
            ALTER TABLE reports ADD COLUMN pattern_extracted INTEGER DEFAULT 0;
        `);
        console.log('Migration successful: Added pattern_extracted to reports table.');
    } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
            console.log('Migration skipped: Column pattern_extracted already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    }
}

migrate();
