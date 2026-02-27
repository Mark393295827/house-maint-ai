import db from '../config/database.js';

async function performCleanup() {
    console.log('🧹 [DB Cleanup Task] Starting database maintenance...');

    try {
        // 1. Clean up revoked or expired refresh tokens (older than 30 days)
        console.log('-> Purging expired refresh tokens...');
        const tokenRes = await db.query(`
            DELETE FROM refresh_tokens 
            WHERE revoked = 1 
            OR expires_at < datetime('now', '-30 days')
        `);
        console.log(`   Tokens removed: ${tokenRes.rowCount}`);

        // 2. Clean up old, un-matched reports that are stale (older than 30 days in 'pending' status)
        console.log('-> Purging stale pending reports...');
        const reportRes = await db.query(`
            DELETE FROM reports 
            WHERE status = 'pending' 
            AND created_at < datetime('now', '-30 days')
        `);
        console.log(`   Stale reports removed: ${reportRes.rowCount}`);

        // 3. Clear temporary matching data for completed or cancelled reports
        console.log('-> Purging orphaned matches...');
        const matchRes = await db.query(`
            DELETE FROM matches 
            WHERE report_id IN (
                SELECT id FROM reports WHERE status IN ('completed', 'cancelled')
            )
        `);
        console.log(`   Orphaned matches removed: ${matchRes.rowCount}`);

        console.log('✅ [DB Cleanup Task] Completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ [DB Cleanup Task] Failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
performCleanup();
