import db from '../config/database.js';
import { aiService } from './ai.js';
import * as Sentry from '@sentry/node';
import * as fs from 'fs';

export class DiagnosticsClawService {
    private interval: NodeJS.Timeout | null = null;
    private isProcessing = false;
    private agentName = 'claw-diagnosis-v1';

    constructor(private pollIntervalMs: number = 5000) { } // Faster polling for Blackboard

    start() {
        if (this.interval) return;
        console.log('🚀 Diagnostics Claw: Perception active. Polling Blackboard...');
        this.interval = setInterval(() => this.processBlackboardTasks(), this.pollIntervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    // New Stigmergic Loop
    private async processBlackboardTasks() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 1. Poll for NEW tasks with objective="diagnose_image"
            const { rows: tasks } = await db.query(`
                SELECT * FROM tasks 
                WHERE status = 'new' 
                AND objective = 'diagnose_image'
                ORDER BY priority DESC, created_at ASC
                LIMIT 1
            `);

            if (tasks.length === 0) {
                this.isProcessing = false;
                return;
            }

            const task = tasks[0];
            console.log(`🐜 [${this.agentName}] Found Task #${task.id}: ${task.title}`);

            // 2. Claim Task (Atomic check-and-set technically required, but single poller for now)
            await db.query(`UPDATE tasks SET status = 'claimed', owner_claw = $1 WHERE id = $2`, [this.agentName, task.id]);
            await this.logPheromone(task.id, 'claimed', { by: this.agentName });

            // 3. Execute
            await this.executeDiagnosis(task);

        } catch (error) {
            console.error('❌ Diagnostics Claw Error:', error);
            Sentry.captureException(error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async logPheromone(taskId: number, event: string, payload: any) {
        await db.query(`
            INSERT INTO pheromone_events (task_id, actor, event_type, payload)
            VALUES ($1, $2, $3, $4)
        `, [taskId, this.agentName, event, JSON.stringify(payload)]);
    }

    private async executeDiagnosis(task: any) {
        try {
            const inputs = JSON.parse(task.inputs || '{}');
            const reportId = inputs.report_id;

            if (!reportId) {
                throw new Error(`Task #${task.id} missing report_id in inputs`);
            }

            // Fetch the Report (Legacy Data Source)
            const { rows: reports } = await db.query('SELECT * FROM reports WHERE id = $1', [reportId]);
            if (reports.length === 0) {
                throw new Error(`Report #${reportId} not found`);
            }
            const report = reports[0];

            console.log(`🤖 Diagnosing Report #${report.id}...`);

            // AI Call (Delegated to DiagnosisAgent via Facade)
            const diagnosis = await aiService.diagnoseIssue(
                undefined,
                undefined,
                `Title: ${report.title}\nDescription: ${report.description}`
            );

            // Stigmergy: Store result in Task Outputs
            await db.query(`
                UPDATE tasks 
                SET status = 'done', 
                    outputs = $1, 
                    score = $2,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $3
            `, [JSON.stringify(diagnosis), diagnosis.diagnosis.confidence_score, task.id]);

            await this.logPheromone(task.id, 'completed', { score: diagnosis.diagnosis.confidence_score });

            // Legacy Side-Effect: Update Reports Table for UI
            const { issue_type, severity, diagnosis_summary, confidence_score } = diagnosis.diagnosis;

            let status = 'analyzed';
            if (confidence_score && confidence_score < 0.7) {
                status = 'flagged_for_review';
            }

            await db.query(`
                UPDATE reports 
                SET diagnosis_result = $1,
                    issue_type = $2,
                    severity = $3,
                    diagnosis_summary = $4,
                    confidence_score = $5,
                    urgency_score = $6,
                    status = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
            `, [
                JSON.stringify(diagnosis),
                issue_type || report.title,
                severity || 'moderate',
                diagnosis_summary || 'No summary provided',
                confidence_score || 0,
                diagnosis.diagnosis.urgency_score || 0,
                status,
                report.id
            ]);

            console.log(`✅ Task #${task.id} Complete. Report #${report.id} updated.`);

        } catch (error) {
            console.error(`❌ Task #${task.id} Failed:`, error);

            await db.query(`
                UPDATE tasks 
                SET status = 'failed', 
                    failure_reason = $1, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [String(error), task.id]);

            await this.logPheromone(task.id, 'failed', { error: String(error) });
        }
    }
}

export const diagnosticsClaw = new DiagnosticsClawService();
