
import db from '../server/config/database.js';

async function migrate() {
    console.log('🔄 Adding urgency_score column to reports table...');
    try {
        await db.query(`
            ALTER TABLE reports 
            ADD COLUMN urgency_score INTEGER DEFAULT 0;
        `);
        console.log('✅ urgency_score column added successfully.');
    } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
            console.log('⚠️  Column urgency_score already exists. Skipping.');
        } else {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
    }
}

migrate();
