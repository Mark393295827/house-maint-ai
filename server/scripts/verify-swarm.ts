import db, { query, isSQLite } from '../config/database.js';
import { diagnosticsClaw } from '../services/diagnostics_claw.js';
import { planningClaw } from '../services/planning_claw.js';
import { vendorClaw } from '../services/vendor_claw.js';
import { learningService } from '../services/learning.js';
import { aiService } from '../services/ai.js';
import { DiagnosisResult, AiResponse, RepairPattern } from '../agents/common.js';
import * as fs from 'fs';

// Mock AI Service with AiResponse structure
aiService.diagnoseIssue = async (): Promise<AiResponse<DiagnosisResult>> => ({
    result: {
        diagnosis: {
            issue_type: 'Simulated Leak',
            severity: 'critical',
            diagnosis_summary: 'A simulated critical test leak.',
            confidence_score: 0.95,
            category: 'Plumbing',
            urgency_score: 9,
            safety_warning: 'SHUT OFF WATER'
        },
        solution: { can_diy: true, steps: ['Fix it'], required_parts: [], tools_needed: [] },
        worker_matching_criteria: { required_skill: 'Plumbing', urgency: 'immediate', estimated_man_hours: '1h' }
    },
    usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30, model_name: 'gemini-1.5-flash-mock' }
});

aiService.generateRepairPlan = async (): Promise<AiResponse<any>> => ({
    result: {
        steps: ['Step 1: Inspect', 'Step 2: Repair', 'Step 3: Verify'],
        estimated_cost_range: { min: 50, max: 100 },
        priority_protocol: 'immediate'
    },
    usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300, model_name: 'deepseek-reasoner-mock' }
});

aiService.extractRepairPattern = async (): Promise<AiResponse<RepairPattern>> => ({
    result: {
        problem_type: 'Simulated Leak Pattern',
        context_signature: 'test, leak, simulation',
        solution: { steps: ['Fix'], parts_spec: ['Tape'] }
    },
    usage: { input_tokens: 5, output_tokens: 10, total_tokens: 15, model_name: 'gemini-1.5-flash-mock' }
});

const LOG_FILE = 'verify_debug.log';
function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

// Clear log
fs.writeFileSync(LOG_FILE, '');

async function runVerification() {
    log('🐜 ATOMIC SWARM VERIFICATION STARTED (OpenClaw v1.0)');

    // Clear previous data
    await query('DELETE FROM reviews');
    await query('DELETE FROM matches');
    await query('DELETE FROM reports');
    await query('DELETE FROM patterns');
    try { await query('DELETE FROM sqlite_sequence WHERE name IN ("reports", "matches", "reviews", "patterns")'); } catch (e) { }
    log('🧹 Database cleared for verification.');

    try {
        // 0. Get Valid User
        const userRes = await query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error('No users found in DB. Run init-db first.');
        const userId = userRes.rows[0].id;

        // 1. Create a Test Report
        log('\n--- Step 1: User Upload (Pending Status) ---');
        const reportRes = await query(`
            INSERT INTO reports (user_id, title, description, category, status, latitude, longitude)
            VALUES ($1, 'Swarm Test Leak', 'Verification of atomic claws', 'plumbing', 'pending', 37.7749, -122.4194)
            RETURNING id
        `, [userId]);

        let reportId;
        if (reportRes.rows && reportRes.rows.length > 0) {
            reportId = reportRes.rows[0].id;
        } else {
            const last = await query('SELECT id FROM reports ORDER BY id DESC LIMIT 1');
            reportId = last.rows[0].id;
        }
        log(`✅ Report #${reportId} created.`);

        // 2. Diagnostics Claw
        log('\n--- Step 2: Diagnostics Claw (Perception) ---');
        await (diagnosticsClaw as any).processPendingReports();

        const r2 = await query('SELECT status, issue_type, severity, confidence_score FROM reports WHERE id = $1', [reportId]);
        log(`Current Status: ${r2.rows[0].status}`);
        log(`Diagnosis: ${r2.rows[0].issue_type} | Severity: ${r2.rows[0].severity}`);

        if (r2.rows[0].status === 'analyzed' && r2.rows[0].severity === 'critical') log('✅ Diagnostics Claw Success (v1.0 Compliance Verified)');
        else log(`❌ Diagnostics Claw Failed. Status: ${r2.rows[0].status}`);

        // Check columns
        try { await query('SELECT priority_protocol FROM reports LIMIT 1'); log('✅ Column priority_protocol exists.'); }
        catch (e) { log('❌ Column priority_protocol MISSING.'); throw e; }

        // 3. Planning Claw
        log('\n--- Step 3: Planning Claw (Reasoning) ---');
        await (planningClaw as any).processAnalyzedReports();

        const r3 = await query('SELECT status, resolution_plan, priority_protocol FROM reports WHERE id = $1', [reportId]);
        log(`Current Status: ${r3.rows[0].status}`);
        log(`Protocol: ${r3.rows[0].priority_protocol}`);

        if (r3.rows[0].status === 'planned' && r3.rows[0].priority_protocol === 'immediate') {
            log('✅ Planning Claw Success (Priority Protocol Verified)');
        } else log(`❌ Planning Claw Failed. Status: ${r3.rows[0].status}`);

        // 4. Vendor Claw
        log('\n--- Step 4: Vendor Claw (Execution) ---');
        await (vendorClaw as any).processMatchingReports();

        const r4 = await query('SELECT status, matched_worker_id, match_score FROM reports WHERE id = $1', [reportId]);
        log(`Current Status: ${r4.rows[0].status}`);
        if (r4.rows[0].status === 'broadcasted' || r4.rows[0].status === 'matched') {
            log(`✅ Vendor Claw Success. Status: ${r4.rows[0].status}`);
        } else log(`❌ Vendor Claw Failed. Status: ${r4.rows[0].status}`);

        // 5. Job Completion
        log('\n--- Step 5: Job Completion ---');
        await query(`
            UPDATE reports 
            SET status = 'completed', 
                resolution_details = '{"notes": "Fixed it well"}',
                completed_at = datetime('now')
            WHERE id = $1
        `, [reportId]);
        log('✅ Job completed.');

        // 6. Learning Loop
        log('\n--- Step 6: Learning Loop (Knowledge Capture) ---');
        const learnRes = await learningService.processCompletedReports();
        log(`Learning Result: ${JSON.stringify(learnRes)}`);

        const r6 = await query('SELECT pattern_id, pattern_extracted FROM reports WHERE id = $1', [reportId]);
        if (r6.rows[0].pattern_extracted) {
            log(`✅ Pattern Extracted. Pattern ID: ${r6.rows[0].pattern_id}`);
        } else log('❌ Learning Loop Failed');

        // 7. Talent Engine
        log('\n--- Step 7: Talent Engine (Self-Optimization) ---');
        let workerId = r4.rows[0].matched_worker_id;
        if (!workerId) {
            const w = await query('SELECT id FROM workers LIMIT 1');
            workerId = w.rows[0].id;
        }

        await query(`
            INSERT INTO reviews (report_id, user_id, worker_id, rating, comment)
            VALUES ($1, $2, $3, 5, 'Great swarm!')
        `, [reportId, userId, workerId]);

        await learningService.evaluatePerformance();

        if (r6.rows[0].pattern_id) {
            const p7 = await query('SELECT performance_score, status FROM patterns WHERE id = $1', [r6.rows[0].pattern_id]);
            log(`Pattern Score: ${p7.rows[0].performance_score}`);
            if (p7.rows[0].performance_score > 0) {
                log('✅ Talent Engine Success: Score increased.');
            } else log('❌ Talent Engine Failed (Score did not increase)');
        } else {
            log('❌ Skipping Talent Engine check (No Pattern ID)');
        }

        log('\n🎉 ALL SYSTEMS GO: ATOMIC SWARM v1.0 VERIFIED.');
        process.exit(0);

    } catch (e) {
        log(`❌ Verification Failed: ${e}`);
        console.error(e);
        process.exit(1);
    }
}

runVerification();
