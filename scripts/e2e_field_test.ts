// Use node --env-file=.env or tsx --env-file=.env instead of dotenv

import db from '../server/config/database.js';
import { aiService } from '../server/services/ai.js';

async function runFieldTest() {
    console.log("=====================================================");
    console.log("🚀 STARTING E2E FIELD TEST SIMULATION");
    console.log("=====================================================\n");

    try {
        // --- 1. Project deployment / Initialize Mock Data --- //
        console.log("📦 [1] Deployment & Setup:");
        const mockPhone = `test_${Date.now()}`;
        const mockWorkerPhone = `worker_${Date.now()}`;

        console.log("   - Creating mock user...");
        const userRes = await db.query(
            `INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *`,
            [mockPhone, 'mock_hash', 'John FieldTest', 'user']
        );
        const testUser = userRes.rows[0];

        console.log("   - Creating mock worker...");
        const workerRes = await db.query(
            `INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *`,
            [mockWorkerPhone, 'mock_hash', 'Bob Builder', 'worker']
        );
        const testWorker = workerRes.rows[0];

        const workerProfileRes = await db.query(
            `INSERT INTO workers (user_id, skills, rating, available) VALUES ($1, $2, $3, $4) RETURNING *`,
            [testWorker.id, JSON.stringify(["Plumbing", "Electrical"]), "5.0", 1]
        );
        const workerProfile = workerProfileRes.rows[0];

        console.log("   ✅ Setup complete.\n");

        // --- 2. Field Test Input --- //
        console.log("🛠️ [2] Field Test Input:");
        const issueTitle = "Water leaking from under the kitchen sink";
        const issueDescription = "I noticed a pool of water under the kitchen sink. It seems to be dripping from the U-shaped pipe when the water is running.";
        console.log(`   - User submits issue: "${issueTitle}"`);
        console.log(`   - Description: "${issueDescription}"`);

        const reportRes = await db.query(
            `INSERT INTO reports (user_id, title, description, status, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [testUser.id, issueTitle, issueDescription, 'pending', 18.2528, 109.5119]
        );
        let report = reportRes.rows[0];
        console.log(`   - Report created in DB (ID: ${report.id}).\n`);

        // --- 3. Diagnosis (Gemini) --- //
        console.log("🧠 [3] AI Diagnosis (Claw 1 - Gemini):");
        console.log("   - Requesting multimodal diagnosis...");
        const diagnosisStart = Date.now();
        const aiDiag = await aiService.diagnoseIssue(undefined, undefined, `Title: ${issueTitle}\nDescription: ${issueDescription}`);
        const diagnosisEnd = Date.now();
        console.log(`   - Diagnosis retrieved in ${diagnosisEnd - diagnosisStart}ms.`);
        console.log("   - Result:");
        console.log(JSON.stringify(aiDiag.result.diagnosis, null, 2));
        console.log(`   - Token Usage: ${aiDiag.usage.total_tokens} tokens\n`);

        // Save diagnosis to DB
        const updateDiagRes = await db.query(
            `UPDATE reports SET urgency_score = $1 WHERE id = $2 RETURNING *`,
            [aiDiag.result.diagnosis?.urgency_score || 5, report.id]
        );
        report = updateDiagRes.rows[0];

        // --- 4. Scheme (DeepSeek) --- //
        console.log("📋 [4] Repair Scheme Generation (Claw 2 - DeepSeek):");
        console.log("   - Sending diagnosis to reasoning layer for action plan...");
        const schemeStart = Date.now();
        const aiScheme = await aiService.generateRepairPlan({
            title: report.title,
            description: report.description,
            diagnosis: aiDiag.result
        });
        const schemeEnd = Date.now();
        console.log(`   - Scheme generated in ${schemeEnd - schemeStart}ms.`);
        console.log("   - Recommended Plan:");
        console.log(JSON.stringify(aiScheme.result, null, 2));
        console.log(`   - Token Usage: ${aiScheme.usage.total_tokens} tokens\n`);

        // Update DB with plan
        const updatePlanRes = await db.query(
            `UPDATE reports SET status = $1 WHERE id = $2 RETURNING *`,
            ['matching', report.id]
        );
        report = updatePlanRes.rows[0];

        // --- 5. Validation --- //
        console.log("✅ [5] Validation / Matching:");
        console.log("   - User validates the scheme. Cost accepted.");
        console.log("   - System assigns best worker according to requirements.");

        const assignRes = await db.query(
            `UPDATE reports SET status = $1, matched_worker_id = $2, matched_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
            ['matched', workerProfile.id, report.id]
        );
        report = assignRes.rows[0];
        console.log(`   - Assigned to worker: ${testWorker.name}\n`);

        // --- 6. Execution --- //
        console.log("🔧 [6] Execution:");
        console.log("   - Worker goes on-site and executes the AI repair plan.");
        const completeRes = await db.query(
            `UPDATE reports SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            ['completed', report.id]
        );
        report = completeRes.rows[0];
        console.log("   - Status changed to COMPLETED.\n");

        // --- 7. Evaluation --- //
        console.log("⭐ [7] Evaluation:");
        console.log("   - User provides a 5-star review, marking the AI diagnosis as 100% accurate.");
        const reviewText = "The AI knew perfectly that it was the P-trap joint leaking! The plumber arrived with the exact parts and fixed it in 15 mins.";
        console.log(`   - Review: "${reviewText}"\n`);

        // --- 8. Improvement (Learning Loop) --- //
        console.log("🔄 [8] Improvement (AI Pattern Extraction):");
        console.log("   - Feeding completed job details back to AI to abstract a pattern for the knowledge graph...");
        const learnStart = Date.now();
        const resolutionDetails = {
            parts_used: "1.5 inch PVC P-trap slip joint washer",
            time_taken: "15 minutes",
            worker_notes: "Replaced degraded washer on the trap. Hand tightened. No leaks observed.",
            user_review: reviewText
        };

        const extractedPattern = await aiService.extractRepairPattern(
            report.title,
            report.description,
            resolutionDetails
        );
        const learnEnd = Date.now();

        console.log(`   - Pattern extracted in ${learnEnd - learnStart}ms.`);
        console.log("   - Abstracted Intelligence:");
        console.log(JSON.stringify(extractedPattern.result, null, 2));
        console.log(`   - Token Usage: ${extractedPattern.usage.total_tokens} tokens\n`);

        console.log("=====================================================");
        console.log("🎉 FIELD TEST CYCLE COMPLETED SUCCESSFULLY");
        console.log("=====================================================\n");
        process.exit(0);

    } catch (e) {
        console.error("❌ E2E Test Failed:", e);
        process.exit(1);
    }
}

runFieldTest();
