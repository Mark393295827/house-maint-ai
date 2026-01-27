import { Hono } from 'hono';
import { getDb } from '../lib/db';
import type { Env } from '../index';

export const workersRouter = new Hono<{ Bindings: Env }>();

// Search for workers (public endpoint)
workersRouter.get('/search', async (c) => {
    try {
        const specialty = c.req.query('specialty');
        const lat = parseFloat(c.req.query('lat') || '0');
        const lng = parseFloat(c.req.query('lng') || '0');
        const radius = parseInt(c.req.query('radius') || '10'); // km

        const db = getDb(c.env);

        // Simple distance-based search (in production, use PostGIS)
        let query = `
      SELECT id, name, phone, specialties, rating, total_jobs, hourly_rate,
             available
      FROM workers
      WHERE available = true
    `;
        const params: any[] = [];

        if (specialty) {
            query += ` AND specialties @> $${params.length + 1}`;
            params.push(JSON.stringify([specialty]));
        }

        query += ' ORDER BY rating DESC, total_jobs DESC LIMIT 20';

        const workers = await db.query(query, params);

        return c.json({ workers });
    } catch (error) {
        console.error('Worker search error:', error);
        return c.json({ error: 'Failed to search workers' }, 500);
    }
});

// Get worker details
workersRouter.get('/:id', async (c) => {
    try {
        const workerId = c.req.param('id');
        const db = getDb(c.env);

        const worker = await db.queryOne(
            'SELECT * FROM workers WHERE id = $1',
            [workerId]
        );

        if (!worker) {
            return c.json({ error: 'Worker not found' }, 404);
        }

        return c.json({ worker });
    } catch (error) {
        console.error('Get worker error:', error);
        return c.json({ error: 'Failed to fetch worker' }, 500);
    }
});

