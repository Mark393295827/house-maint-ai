import db from './server/config/database.js';
import { diagnosticsClaw } from './server/services/diagnostics_claw.js';

async function verify() {
    console.log('🧪 Verifying APM Blackboard Integration...');

    // 0. Setup: Ensure dummy user exists
    await db.query(`
        INSERT INTO users (phone, password_hash, name, role)
        VALUES ('13800138000', 'hash', 'Test User', 'user')
        ON CONFLICT(phone) DO NOTHING
    `);

    const { rows: users } = await db.query("SELECT * FROM users WHERE phone = '13800138000'");
    if (users.length === 0) throw new Error("Failed to create/find user");
    const userId = users[0].id;
    console.log(`👤 User ID: ${userId}`);

    // 1. Setup: Create a dummy report
    const { rows: reports } = await db.query(`
        INSERT INTO reports (user_id, title, description, status)
        VALUES ($1, 'APM Test Leak', 'Water leaking under sink', 'pending')
        RETURNING *
    `, [userId]);
    const report = reports[0];
    console.log(`📝 Created Test Report #${report.id}`);

    // 2. Simulate API: Create a Task
    // (This is what server/routes/reports.ts does now)
    const inputPayload = JSON.stringify({ report_id: report.id });
    const { rows: tasks } = await db.query(`
        INSERT INTO tasks (title, objective, status, priority, inputs)
        VALUES ($1, $2, 'new', 'high', $3)
        RETURNING *
    `, [`Diagnose Report #${report.id}`, 'diagnose_image', inputPayload]);

    const task = tasks[0];
    console.log(`📌 Created Blackboard Task #${task.id}`);

    // 3. Start the Claw
    // It should poll, find the task, and process it
    diagnosticsClaw.start();

    console.log('⏳ Waiting for Claw to process task...');

    // Poll DB for completion
    let attempts = 0;
    const maxAttempts = 10;

    const checkLoop = setInterval(async () => {
        attempts++;

        const { rows: updatedTasks } = await db.query('SELECT * FROM tasks WHERE id = $1', [task.id]);
        const currentTask = updatedTasks[0];

        if (currentTask.status === 'done') {
            clearInterval(checkLoop);
            diagnosticsClaw.stop();
            console.log('✅ Task marked DONE!');

            // Verify Report Update
            const { rows: updatedReports } = await db.query('SELECT * FROM reports WHERE id = $1', [report.id]);
            const finalReport = updatedReports[0];

            if (finalReport.status !== 'pending' && finalReport.diagnosis_result) {
                console.log('✅ Report updated with diagnosis!');
            } else {
                console.error('❌ Report NOT updated correctly.');
            }

            // Verify Pheromones
            const { rows: events } = await db.query('SELECT * FROM pheromone_events WHERE task_id = $1', [task.id]);
            console.log(`✅ Found ${events.length} pheromone events:`, events.map(e => e.event_type).join(', '));

            process.exit(0);
        } else if (currentTask.status === 'failed') {
            clearInterval(checkLoop);
            diagnosticsClaw.stop();
            console.error('❌ Task FAILED:', currentTask.failure_reason);
            process.exit(1);
        }

        if (attempts >= maxAttempts) {
            clearInterval(checkLoop);
            diagnosticsClaw.stop();
            console.error('❌ Timeout waiting for task completion.');
            process.exit(1);
        }

        process.stdout.write('.');
    }, 1000);
}

verify();
