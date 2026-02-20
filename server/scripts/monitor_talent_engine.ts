
import db, { query } from '../config/database.js';
import { learningService } from '../services/learning.js';
import * as fs from 'fs';

const LOG_FILE = 'talent_engine_test.log';
function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

// Clear log
fs.writeFileSync(LOG_FILE, '');

async function runTest() {
    log('🧪 TALENT ENGINE HARDENING TEST STARTED');

    try {
        // Setup: Ensure we have a pattern
        await query('DELETE FROM patterns');
        await query('DELETE FROM reports');
        await query('DELETE FROM reviews');

        // Insert a dummy pattern
        const pRes = await query(`
            INSERT INTO patterns (problem_type, context_signature, solution, success_rate, usage_count, performance_score, status)
            VALUES ('Test Leak', 'test', '{}', 1.0, 10, 0, 'experimental')
            RETURNING id
        `);

        let patternId = pRes.rows[0]?.id;
        if (!patternId) {
            const rows = await query('SELECT id FROM patterns LIMIT 1');
            patternId = rows.rows[0].id;
        }
        log(`Created Test Pattern #${patternId}`);

        // --- TEST 1: Cold Start Guardrail ---
        log('\n--- Test 1: Cold Start Guardrail (< 500 jobs) ---');
        // We have 0 reports. Should skip evaluation.
        await learningService.evaluatePerformance();
        log('✅ Cold start check executed (See console/logs for "Cold Start Mode" message)');

        // --- TEST 2: Evolution (Promotion) ---
        log('\n--- Test 2: Evolution (3x 5-star ratings) ---');

        // Get valid user
        const uRes = await query('SELECT id FROM users LIMIT 1');
        const userId = uRes.rows[0]?.id || 1; // Fallback

        // Get valid worker for reviews
        // If no workers exist, create a dummy one.
        const wRes = await query('SELECT id FROM workers LIMIT 1');
        let workerId = wRes.rows[0]?.id;
        if (!workerId) {
            // Create a temp user for the worker first if needed, but for simplicity let's use the same userId
            // Assuming workers table constraints allow it or we fail.
            // Let's safe-insert a new user and worker
            const uWorker = await query('INSERT INTO users (phone, password_hash, name, role) VALUES (\'999\', \'hash\', \'WorkerBot\', \'worker\') RETURNING id');
            const uWorkerId = uWorker.rows[0]?.id || (await query('SELECT id FROM users WHERE phone=\'999\'')).rows[0].id;
            const w = await query('INSERT INTO workers (user_id, skills) VALUES ($1, \'[]\') RETURNING id', [uWorkerId]);
            workerId = w.rows[0]?.id;
        }

        log('...Simulating 500 historical jobs to bypass Cold Start...');
        // Insert 500 dummy reports
        for (let i = 0; i < 500; i++) {
            // Hardcode valid params
            await query(`INSERT INTO reports (user_id, title, description, status) VALUES (${userId}, 'Dummy', 'Dummy', 'completed')`);
        }

        // Add 3 positive reviews linked to this pattern
        for (let i = 0; i < 3; i++) {
            const rRes = await query(`INSERT INTO reports (user_id, title, description, status, pattern_id) VALUES ($1, 'Test', 'Test', 'completed', $2) RETURNING id`, [userId, patternId]);
            const rid = rRes.rows[0]?.id || (await query('SELECT id FROM reports ORDER BY id DESC LIMIT 1')).rows[0].id;

            // Now include worker_id
            await query(`INSERT INTO reviews (report_id, user_id, worker_id, rating) VALUES ($1, $2, $3, 5)`, [rid, userId, workerId]);
        }

        log('Running Evaluation Loop...');
        await learningService.evaluatePerformance();

        const p2 = await query('SELECT status, consecutive_high_ratings FROM patterns WHERE id = $1', [patternId]);
        log(`Status: ${p2.rows[0].status}, Consecutive: ${p2.rows[0].consecutive_high_ratings}`);

        if (p2.rows[0].status === 'production' && p2.rows[0].consecutive_high_ratings >= 3) {
            log('✅ PASS: Pattern promoted to production.');
        } else {
            log(`❌ FAIL: Pattern not promoted (Status: ${p2.rows[0].status}, Consecutive: ${p2.rows[0].consecutive_high_ratings})`);
        }

        // --- TEST 3: Variant Generation ---
        log('\n--- Test 3: Variant Generation (Low Performance) ---');

        // Clear reviews to prevent recalculation pushing score back up (MVP limitation)
        await query('DELETE FROM reviews');

        // Reset score to -3 (needs variant but not fired)
        await query('UPDATE patterns SET performance_score = -3, usage_count = 10, is_variant = 0 WHERE id = $1', [patternId]);

        const pDebug = await query('SELECT * FROM patterns WHERE id = $1', [patternId]);
        log(`DEBUG Pattern #${patternId}: Score=${pDebug.rows[0].performance_score}, Usage=${pDebug.rows[0].usage_count}, Variant=${pDebug.rows[0].is_variant}`);

        await learningService.evaluatePerformance();

        const p3 = await query('SELECT is_variant FROM patterns WHERE id = $1', [patternId]);
        if (p3.rows[0].is_variant === 1) {
            log('✅ PASS: Variant generation triggered.');
        } else {
            log('❌ FAIL: Variant flag not set.');
        }

        process.exit(0);

    } catch (e) {
        log(`❌ Test Failed: ${e}`);
        console.error(e);
        process.exit(1);
    }
}

runTest();
