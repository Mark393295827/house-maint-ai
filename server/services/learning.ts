
import db from '../config/database';
import { aiService, RepairPattern } from './ai';

export const learningService = {
    /**
     * Process all completed reports that haven't been analyzed yet.
     */
    async processCompletedReports() {
        console.log('Starting learning loop...');

        // 0. Cold Start Guardrail (OpenClaw v1.0)
        const { rows: stats } = await db.query(`SELECT count(*) as count FROM reports WHERE status = 'completed'`);
        const totalJobs = parseInt(stats[0].count);

        if (totalJobs < 500) {
            console.log(`❄️ Cold Start Mode (Jobs: ${totalJobs}/500). Evaluation skipped to gather baseline.`);
            return;
        }

        // 1. Fetch unprocessed completed reports
        const { rows: reports } = await db.query(`
            SELECT * FROM reports 
            WHERE status = 'completed' 
            AND (pattern_extracted = 0 OR pattern_extracted IS NULL)
            LIMIT 10
        `);

        console.log(`Found ${reports.length} reports to process.`);
        const results = {
            processed: 0,
            failed: 0,
            patterns_created: 0,
            patterns_updated: 0
        };

        for (const report of reports) {
            try {
                // Parse resolution details
                let resolution;
                try {
                    resolution = typeof report.resolution_details === 'string'
                        ? JSON.parse(report.resolution_details)
                        : report.resolution_details;
                } catch (e) {
                    console.warn(`Report ${report.id}: Invalid resolution details JSON`);
                    resolution = { note: report.resolution_details };
                }

                if (!resolution) {
                    // Mark as processed anyway to avoid infinite loop on bad data
                    await this.markAsProcessed(report.id);
                    continue;
                }

                // 2. Extract Pattern via AI
                const pattern: RepairPattern = await aiService.extractRepairPattern(
                    report.title,
                    report.description,
                    resolution
                );

                // 3. Update Knowledge Base (Patterns Table)
                const patternId = await this.upsertPattern(pattern);

                // 4. Mark report as processed and link to pattern
                await this.markAsProcessed(report.id, patternId);

                results.processed++;
                results.patterns_created++;

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`Failed to process report ${report.id}:`, error);
                results.failed++;
            }
        }

        // Run Evaluation Loop
        await this.evaluatePerformance();

        return results;
    },

    async markAsProcessed(reportId: number, patternId?: number) {
        await db.query(`
            UPDATE reports 
            SET pattern_extracted = 1,
                pattern_id = $2
            WHERE id = $1
        `, [reportId, patternId || null]);
    },

    async upsertPattern(pattern: RepairPattern): Promise<number> {
        const { rows: existing } = await db.query(`
            SELECT id FROM patterns 
            WHERE problem_type = $1 AND context_signature = $2
        `, [pattern.problem_type, pattern.context_signature]);

        if (existing.length > 0) {
            await db.query(`
                UPDATE patterns 
                SET usage_count = usage_count + 1, 
                    last_used = datetime('now')
                WHERE id = $1
            `, [existing[0].id]);
            return existing[0].id;
        } else {
            const { rows } = await db.query(`
                INSERT INTO patterns (problem_type, context_signature, solution, success_rate, usage_count, performance_score)
                VALUES ($1, $2, $3, 1.0, 1, 0)
                RETURNING id
            `, [
                pattern.problem_type,
                pattern.context_signature,
                JSON.stringify(pattern.solution)
            ]);
            // For SQLite fallback that might not return ID in all drivers, assume logic handles it or use select
            // But db adapter should handle RETURNING.
            return rows[0]?.id || 0;
        }
    },

    /**
     * The Talent Engine: Evaluate patterns based on real-world ratings.
     * "Fire" bad patterns (score < -5), "Promote" good ones.
     */
    async evaluatePerformance() {
        console.log('🎓 Talent Engine: Evaluating performance...');

        // Find reviews for reports that have an extracted pattern
        const { rows: reviews } = await db.query(`
            SELECT r.rating, rep.pattern_id 
            FROM reviews r
            JOIN reports rep ON r.report_id = rep.id
            WHERE rep.pattern_id IS NOT NULL
            -- In a real system we would flag reviewed items to avoid double counting
            -- For MVP we'll just recount or assume the score reflects aggregate
            limit 20
        `);

        if (reviews.length > 0) {
            console.log(`Analyzing ${reviews.length} reviews for pattern optimization.`);

            for (const review of reviews) {
                const patternId = review.pattern_id;
                const rating = review.rating;

                let scoreChange = 0;
                let consecutiveChange = 0;

                if (rating >= 4.5) {
                    scoreChange = 1.0;
                    consecutiveChange = 1; // Increment consecutive count
                } else if (rating >= 4) {
                    scoreChange = 0.2;
                    consecutiveChange = -999; // Reset (hacky way, or read value first) -> Better to use SQL case
                } else if (rating <= 2) {
                    scoreChange = -2.0;
                } else {
                    scoreChange = -0.5;
                }

                // Update pattern score & consecutive ratings
                // Logic: 
                // If rating >= 4.5: consecutive = consecutive + 1
                // Else: consecutive = 0
                // Note: We use distinct params ($2, $3) for rating to support SQLite fallback which doesn't handle reused params well
                await db.query(`
                UPDATE patterns 
                SET performance_score = performance_score + $1,
                    consecutive_high_ratings = CASE WHEN $2 >= 4.5 THEN consecutive_high_ratings + 1 ELSE 0 END,
                    status = CASE 
                        WHEN (consecutive_high_ratings + 1) >= 3 AND $3 >= 4.5 THEN 'production' 
                        ELSE status 
                    END
                WHERE id = $4
            `, [scoreChange, rating, rating, patternId]);
            }
        }

        // "Fire" Logic: Deprecate patterns with very low scores
        const { rows: fired } = await db.query(`
            SELECT id, problem_type FROM patterns WHERE performance_score < -5
        `);

        for (const pattern of fired) {
            console.warn(`🔥 FIRING Pattern #${pattern.id} (${pattern.problem_type}) due to poor performance.`);
            await db.query(`UPDATE patterns SET usage_count = -1 WHERE id = $1`, [pattern.id]);
        }

        // Variant Generation (If rating < 3.0, maybe fork?)
        // Currently handled in evaluate loop? No, let's do independent check for low performing but not fired patterns.
        const { rows: needsVariant } = await db.query(`
            SELECT * FROM patterns 
            WHERE performance_score < -2 AND performance_score > -5 
            AND is_variant = 0
            AND usage_count > 5
        `);


        for (const pattern of needsVariant) {
            console.log(`🧬 Generating Variant for Pattern #${pattern.id}...`);
            // In full implementation: aiService.generateVariant(pattern)
            // For MVP: Just mark it so we don't spam
            await db.query(`UPDATE patterns SET is_variant = 1 WHERE id = $1`, [pattern.id]); // Prevent infinite forking for now
        }
    }
};
