import { describe, expect, it } from 'vitest';
import { SQLiteFallback } from '../config/database.js';

describe('SQLiteFallback PostgreSQL compatibility', () => {
    it('returns no rows when a guarded UPDATE RETURNING changes nothing', async () => {
        const database = new SQLiteFallback(':memory:');
        const user = await database.query<{ id: number }>(`
            INSERT INTO users (phone, password_hash, name, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, ['adapter-test', 'hash', 'Adapter Test', 'user']);
        const report = await database.query<{ id: number }>(`
            INSERT INTO reports (user_id, title, description, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [user.rows[0].id, 'Terminal report', 'Already completed report', 'completed']);

        const result = await database.query(`
            UPDATE reports
            SET status = 'matching'
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `, [report.rows[0].id]);

        expect(result.rowCount).toBe(0);
        expect(result.rows).toEqual([]);
    });
});

