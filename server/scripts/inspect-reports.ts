import { query } from '../config/database.js';

async function inspect() {
    try {
        console.log('--- Current Reports ---');
        const { rows } = await query('SELECT id, title, status, matched_worker_id, user_id FROM reports');
        console.table(rows);
        
        console.log('\n--- Workers ---');
        const { rows: workers } = await query('SELECT id, user_id, bio FROM workers');
        console.table(workers);
        
        console.log('\n--- Status Counts ---');
        const { rows: stats } = await query('SELECT status, COUNT(*) as count FROM reports GROUP BY status');
        console.table(stats);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

inspect();
