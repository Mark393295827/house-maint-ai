import db from '../config/database.js';
import { matchingService } from './matching.js';
import * as Sentry from '@sentry/node';
import { emitToUser, emitToWorkers } from '../socket.js';

export class VendorSourcingClawService {
    private interval: NodeJS.Timeout | null = null;
    private isProcessing = false;

    constructor(private pollIntervalMs: number = 30000) { }

    start() {
        if (this.interval) return;
        console.log('🚀 Vendor Sourcing Claw: Execution active. Matching reports to workers...');
        this.interval = setInterval(() => this.processMatchingReports(), this.pollIntervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async processMatchingReports() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Find reports in 'matching' status
            const { rows: matchingReports } = await db.query(`
                SELECT * FROM reports 
                WHERE status = 'planned' 
                ORDER BY created_at ASC 
                LIMIT 5
            `);

            if (matchingReports.length === 0) {
                this.isProcessing = false;
                return;
            }

            console.log(`🤝 Vendor Sourcing Claw: Found ${matchingReports.length} reports to match.`);

            for (const report of matchingReports) {
                await this.matchReport(report);
            }
        } catch (error) {
            console.error('❌ Vendor Sourcing Claw Error:', error);
            Sentry.captureException(error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async matchReport(report: any) {
        try {
            console.log(`🔗 Matching workers for report #${report.id}: ${report.title}`);

            const topMatches = await matchingService.findTopMatches(report, 5);

            if (topMatches.length === 0) {
                console.log(`⚠️ No workers found for report #${report.id}.`);
                return;
            }

            // High Urgency -> Broadcast (urgency_score >= 8)
            if (report.urgency_score >= 8) {
                console.log(`🔥 High Urgency Detected (${report.urgency_score}). Broadcasting to ${topMatches.length} workers...`);

                for (const match of topMatches) {
                    await db.query(`
                        INSERT INTO matches (report_id, worker_id, score, distance_score, rating_score, skill_score)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        report.id,
                        match.id,
                        match.score,
                        match.distanceScore,
                        match.ratingScore,
                        match.skillScore
                    ]);

                    // Real-time Notify Worker
                    emitToUser(match.user_id, 'job:available', {
                        reportId: report.id,
                        title: report.title,
                        urgency: report.urgency_score
                    });
                }

                await db.query(`
                    UPDATE reports 
                    SET status = 'broadcasted', 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $1
                `, [report.id]);

                console.log(`✅ Report #${report.id} broadcasted.`);

                // Notify Owner
                emitToUser(report.user_id, 'report:update', {
                    reportId: report.id,
                    status: 'broadcasted',
                    message: `High urgency! Broadcasted to ${topMatches.length} nearby workers.`
                });

            } else {
                const bestWorker = topMatches[0];
                const matchScore = bestWorker.score;

                // OpenClaw v1.0 Constraint: If match_score < 65 (0.65), mandatory human review
                if (matchScore < 65) {
                    console.warn(`🛑 Match Score ${matchScore} < 65. Stopping auto-assignment.`);
                    await db.query(`
                        UPDATE reports 
                        SET status = 'flagged_for_review', 
                            match_score = $1,
                            updated_at = CURRENT_TIMESTAMP 
                        WHERE id = $2
                    `, [matchScore, report.id]);
                } else {
                    console.log(`📍 Assigning top worker #${bestWorker.id} (${bestWorker.name}) Score: ${matchScore}`);

                    await db.query(`
                        UPDATE reports 
                        SET matched_worker_id = $1, 
                            status = 'matched', 
                            match_score = $2,
                            matched_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP 
                        WHERE id = $3
                    `, [bestWorker.id, matchScore, report.id]);

                    console.log(`✅ Report #${report.id} matched.`);

                    // Real-time Notify Worker
                    emitToUser(bestWorker.user_id, 'job:assigned', {
                        reportId: report.id,
                        title: report.title,
                        address: '123 Main St (Placeholder)' // In real app, fetch address
                    });

                    // Real-time Notify Owner
                    emitToUser(report.user_id, 'report:matched', {
                        reportId: report.id,
                        workerName: bestWorker.name,
                        matchScore: Math.round(matchScore)
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Failed to match report #${report.id}:`, error);
            Sentry.captureException(error);
        }
    }
}

export const vendorClaw = new VendorSourcingClawService();
