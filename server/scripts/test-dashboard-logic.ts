import pool from '../config/database.js';

async function simulateDashboard() {
    const userId = 66; // Worker One
    try {
        console.log('--- Simulating GET /dashboard for user 66 ---');
        
        let { rows: workers } = await pool.query('SELECT * FROM workers WHERE user_id = $1', [userId]);
        
        if (workers.length === 0) {
            console.log('Worker profile missing. Auto-initializing...');
            // Simulating req.user.role === 'worker' check
            const { rows: newWorker } = await pool.query(`
                INSERT INTO workers (user_id, skills, available)
                VALUES ($1, $2, 1)
                RETURNING *
            `, [userId, JSON.stringify(['general'])]);
            workers = newWorker;
            console.log('✅ Created worker profile:', workers[0]);
        } else {
            console.log('ℹ️ Worker profile already exists:', workers[0]);
        }

        // Simulating the rest of the dashboard query
        const worker = workers[0];
        const { rows: jobStats } = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status IN ('matching', 'matched', 'in_progress')) as active
            FROM reports WHERE matched_worker_id = $1
        `, [worker.id]);

        console.log('Dashboard Stats:', jobStats[0]);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

simulateDashboard();
