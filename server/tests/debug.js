import { SQLiteFallback } from '../config/database.js';
async function run() {
    try {
        console.log('Working Dir:', process.cwd());
        const adapter = new SQLiteFallback(':memory:');
        console.log('Init Schema...');
        await adapter.initSchema();
        console.log('Success!');

        // Test query
        const res = await adapter.query('SELECT name FROM sqlite_master WHERE type="table"');
        console.log('Tables found:', res.rows.length);

        process.exit(0);
    } catch (e) {
        console.error('FAILED AT:', e.stack || e);
        process.exit(1);
    }
}
run();
