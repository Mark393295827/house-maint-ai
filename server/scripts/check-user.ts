import pool from '../config/database.js';

async function check() {
    try {
        const { rows: users } = await pool.query("SELECT id, name, phone, role FROM users WHERE phone = '13533334444'");
        console.log('User:', users[0]);
        if (users[0]) {
            const { rows: workers } = await pool.query("SELECT * FROM workers WHERE user_id = $1", [users[0].id]);
            console.log('Worker Profile:', workers[0]);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
