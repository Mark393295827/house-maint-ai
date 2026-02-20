import db, { isSQLite } from './server/config/database.js';

async function verify() {
    console.log('🔍 Verifying Blackboard Schema...');

    // Trigger initSchema by running a simple query
    await db.query('SELECT 1');

    try {
        // Check tasks table
        const tasks = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'");
        if (tasks.rows.length > 0) {
            console.log('✅ Table "tasks" exists.');
        } else {
            console.error('❌ Table "tasks" MISSING.');
        }

        // Check pheromone_events table
        const events = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pheromone_events'");
        if (events.rows.length > 0) {
            console.log('✅ Table "pheromone_events" exists.');
        } else {
            console.error('❌ Table "pheromone_events" MISSING.');
        }

    } catch (err) {
        console.error('❌ Verification failed:', err);
    }
}

verify();
