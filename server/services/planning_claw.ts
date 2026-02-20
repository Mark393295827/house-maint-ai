import db from '../config/database.js';
import { aiService } from './ai.js';
import * as Sentry from '@sentry/node';

export class PlanningClawService {
    private interval: NodeJS.Timeout | null = null;
    private isProcessing = false;

    constructor(private pollIntervalMs: number = 30000) { }

    start() {
        if (this.interval) return;
        console.log('🚀 Planning Claw: Reasoning active. Watching for analyzed reports...');
        this.interval = setInterval(() => this.processAnalyzedReports(), this.pollIntervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async processAnalyzedReports() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Find reports that represent 'Analyzed' state
            const { rows: analyzedReports } = await db.query(`
                SELECT * FROM reports 
                WHERE status = 'analyzed' 
                AND (resolution_plan IS NULL OR resolution_plan = '')
                ORDER BY updated_at ASC 
                LIMIT 5
            `);

            if (analyzedReports.length === 0) {
                this.isProcessing = false;
                return;
            }

            console.log(`🧠 Planning Claw: Found ${analyzedReports.length} reports to plan.`);

            for (const report of analyzedReports) {
                await this.createRepairPlan(report);
            }
        } catch (error) {
            console.error('❌ Planning Claw Error:', error);
            Sentry.captureException(error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async createRepairPlan(report: any) {
        try {
            console.log(`🤔 Creating repair plan for report #${report.id}: ${report.title}`);

            // Parse diagnosis result
            let diagnosis;
            try {
                diagnosis = typeof report.diagnosis_result === 'string'
                    ? JSON.parse(report.diagnosis_result)
                    : report.diagnosis_result;
            } catch (e) {
                console.warn(`Report #${report.id}: Invalid diagnosis JSON`, e);
            }

            // Call DeepSeek via AI Service (or fallback)
            const planString = await aiService.generateRepairPlan(
                report.title,
                report.description,
                diagnosis
            );

            let plan: any = {};
            try {
                plan = typeof planString === 'string' ? JSON.parse(planString) : planString;
            } catch (e) {
                // Fallback if parsing fails
                plan = { steps: [], priority_protocol: 'batch' };
            }

            // Extract priority protocol (default to batch)
            const priorityProtocol = plan.priority_protocol || 'batch';

            // Update report
            await db.query(`
                UPDATE reports 
                SET resolution_plan = $1,
                    priority_protocol = $2,
                    status = 'planned',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [
                JSON.stringify(plan),
                priorityProtocol,
                report.id
            ]);

            console.log(`✅ Report #${report.id} planned. Protocol: ${priorityProtocol}`);

        } catch (error) {
            console.error(`❌ Failed to plan report #${report.id}:`, error);

            // Mark as failed_planning to avoid loop
            await db.query(`
                UPDATE reports SET status = 'failed_planning', updated_at = CURRENT_TIMESTAMP WHERE id = $1
            `, [report.id]);

            Sentry.captureException(error);
        }
    }
}

export const planningClaw = new PlanningClawService();
