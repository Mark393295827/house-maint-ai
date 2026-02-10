import redis from '../config/redis.js';
import * as db from '../config/database.js';
import * as Sentry from '@sentry/node';

// Interface matching cached_pattern schema in tree-of-thoughts.md
export interface Pattern {
    problem_type: string;
    context_signature: string;
    solution: any; // JSON object containing best_path
    success_rate?: number;
    usage_count?: number;
    last_used?: string;
    created_at?: string;
}

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week

class PatternCache {
    /**
     * Generate cache key
     */
    private getCacheKey(problemType: string, contextSignature: string): string {
        return `pattern:${problemType}:${contextSignature}`;
    }

    /**
     * Save a pattern to cache and database
     */
    async savePattern(pattern: Pattern): Promise<void> {
        const key = this.getCacheKey(pattern.problem_type, pattern.context_signature);
        const serialized = JSON.stringify(pattern);

        try {
            // 1. Write to Redis
            await redis.setex(key, CACHE_TTL_SECONDS, serialized);

            // 2. Write to DB (Upsert)
            const sql = `
                INSERT INTO patterns (problem_type, context_signature, solution, success_rate, usage_count, last_used)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                ON CONFLICT (problem_type, context_signature) 
                DO UPDATE SET 
                    solution = EXCLUDED.solution,
                    success_rate = EXCLUDED.success_rate,
                    usage_count = patterns.usage_count + 1,
                    last_used = CURRENT_TIMESTAMP
            `;

            // Adjust query for SQLite if needed (ON CONFLICT syntax is standard, but CURRENT_TIMESTAMP needs care)
            // The SQLiteFallback class handles $1 -> ? conversion and basic compatibility.
            // However, better-sqlite3 uses INSERT OR REPLACE or ON CONFLICT, which aligns with Postgres.

            await db.query(sql, [
                pattern.problem_type,
                pattern.context_signature,
                JSON.stringify(pattern.solution),
                pattern.success_rate || 1.0,
                pattern.usage_count || 1
            ]);

        } catch (error) {
            console.error('Failed to save pattern:', error);
            Sentry.captureException(error);
            // Don't throw, just log. System should be resilient.
        }
    }

    /**
     * Retrieve a pattern
     */
    async getPattern(problemType: string, contextSignature: string): Promise<Pattern | null> {
        const key = this.getCacheKey(problemType, contextSignature);

        try {
            // 1. Try Redis
            const cached = await redis.get(key);
            if (cached) {
                // Update stats async
                this.recordHit(problemType, contextSignature);
                return JSON.parse(cached);
            }

            // 2. Try DB
            const result = await db.query(
                'SELECT * FROM patterns WHERE problem_type = $1 AND context_signature = $2',
                [problemType, contextSignature]
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                const pattern: Pattern = {
                    problem_type: row.problem_type,
                    context_signature: row.context_signature,
                    solution: typeof row.solution === 'string' ? JSON.parse(row.solution) : row.solution,
                    success_rate: row.success_rate,
                    usage_count: row.usage_count,
                    last_used: row.last_used,
                    created_at: row.created_at
                };

                // Populate Redis
                await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(pattern));

                return pattern;
            }

        } catch (error) {
            console.error('Failed to get pattern:', error);
            Sentry.captureException(error);
        }

        return null;
    }

    /**
     * Async update of usage stats
     */
    private async recordHit(problemType: string, contextSignature: string): Promise<void> {
        try {
            const key = this.getCacheKey(problemType, contextSignature);
            // Extend TTL
            await redis.expire(key, CACHE_TTL_SECONDS);

            // Update DB asynchronously
            await db.query(
                'UPDATE patterns SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP WHERE problem_type = $1 AND context_signature = $2',
                [problemType, contextSignature]
            );
        } catch (error) {
            // Ignore errors for stats updates
        }
    }
}

export const patternCache = new PatternCache();
export default patternCache;
