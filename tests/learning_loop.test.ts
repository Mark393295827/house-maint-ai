
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { learningService } from '../server/services/learning';
import db from '../server/config/database';

// Mock Redis
vi.mock('ioredis', () => {
    return {
        default: vi.fn(() => ({
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
            quit: vi.fn(),
            on: vi.fn(),
        })),
    };
});

describe('AI Learning Loop', () => {
    beforeEach(async () => {
        // Clear relevant tables
        await db.query('DELETE FROM reports');
        await db.query('DELETE FROM patterns');
        await db.query('DELETE FROM users');
    });

    it('should process a completed report and create a pattern', async () => {
        // 1. Create User & Worker
        const userRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('learn_user_' || hex(randomblob(4)), 'hash', 'Test User', 'user') 
            RETURNING id
        `);
        const userId = userRes.rows[0].id;

        // 2. Create Completed Report
        const reportRes = await db.query(`
            INSERT INTO reports (user_id, title, description, status, pattern_extracted, resolution_details)
            VALUES ($1, 'Broken Fridge', 'Fridge not cooling', 'completed', 0, $2)
            RETURNING id
        `, [userId, JSON.stringify({ steps: ['Replaced relay'], cost: 50 })]);
        const reportId = reportRes.rows[0].id;

        // 3. Run Learning Loop
        // Note: aiService mock is tricky because it's imported in learning.ts.
        // For integration test, we might rely on the demo fallback of AiService if no API key,
        // OR we can mock the method directly on the imported instance if possible, 
        // OR just assume the "Demo Mode" fallback works which it should.

        const result = await learningService.processCompletedReports();

        expect(result.processed).toBe(1);
        expect(result.patterns_created).toBe(1);

        // 4. Verify Database Updates
        const { rows: patterns } = await db.query('SELECT * FROM patterns');
        expect(patterns).toHaveLength(1);
        expect(patterns[0].usage_count).toBe(1);

        const { rows: updatedReport } = await db.query('SELECT pattern_extracted FROM reports WHERE id = $1', [reportId]);
        expect(updatedReport[0].pattern_extracted).toBe(1);
    });

    it('should deduplicate existing patterns', async () => {
        // 1. Insert an existing pattern
        await db.query(`
            INSERT INTO patterns (problem_type, context_signature, solution, usage_count)
            VALUES ('Demo Pattern: Refrigerator Issue', 'demo, fridge, cooling', '{}', 1)
        `);

        // 2. Create User
        const userRes = await db.query(`
            INSERT INTO users (phone, password_hash, name, role) 
            VALUES ('learn_user_2_' || hex(randomblob(4)), 'hash', 'Test User', 'user') 
            RETURNING id
        `);
        const userId = userRes.rows[0].id;

        // 3. Create Completed Report (that triggers same demo pattern)
        await db.query(`
            INSERT INTO reports (user_id, title, description, status, pattern_extracted, resolution_details)
            VALUES ($1, 'Another Fridge', 'Fridge not cooling', 'completed', 0, $2)
        `, [userId, JSON.stringify({ steps: ['Fix it'] })]);

        // 4. Run Loop
        await learningService.processCompletedReports();

        // 5. Verify Pattern usage incremented
        const { rows: patterns } = await db.query('SELECT * FROM patterns');
        expect(patterns).toHaveLength(1);
        expect(patterns[0].usage_count).toBe(2);
    });
});
