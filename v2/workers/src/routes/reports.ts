import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getDb } from '../lib/db';
import { AIService } from '../lib/ai';
import type { Env } from '../index';

export const reportsRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
reportsRouter.use('*', authMiddleware);

// Create a new report with AI diagnosis
reportsRouter.post('/', async (c) => {
    try {
        const user = c.get('user');
        const formData = await c.req.formData();

        const description = formData.get('description') as string;
        const address = formData.get('address') as string;
        const image = formData.get('image') as File;

        if (!description || !address || !image) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        // Upload image to R2
        const imageKey = `reports/${user.userId}/${Date.now()}-${image.name}`;
        await c.env.IMAGES_BUCKET.put(imageKey, image);
        const imageUrl = `https://your-r2-public-url/${imageKey}`;

        // Get AI diagnosis
        const aiService = new AIService(c.env);
        const diagnosis = await aiService.diagnoseIssue(imageUrl);

        // Save to database
        const db = getDb(c.env);
        const result = await db.queryOne<{ id: string }>(
            `INSERT INTO reports (user_id, description, address, images, ai_diagnosis, ai_confidence, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING id`,
            [
                user.userId,
                description,
                address,
                JSON.stringify([imageUrl]),
                JSON.stringify(diagnosis),
                diagnosis.confidence,
            ]
        );

        return c.json({
            id: result?.id,
            diagnosis,
            imageUrl,
        }, 201);
    } catch (error) {
        console.error('Report creation error:', error);
        return c.json({ error: 'Failed to create report' }, 500);
    }
});

// Get user's reports
reportsRouter.get('/', async (c) => {
    try {
        const user = c.get('user');
        const db = getDb(c.env);

        const reports = await db.query(
            `SELECT id, description, address, images, ai_diagnosis, status, created_at
       FROM reports
       WHERE user_id = $1
       ORDER BY created_at DESC`,
            [user.userId]
        );

        return c.json({ reports });
    } catch (error) {
        console.error('Get reports error:', error);
        return c.json({ error: 'Failed to fetch reports' }, 500);
    }
});

// Get single report
reportsRouter.get('/:id', async (c) => {
    try {
        const user = c.get('user');
        const reportId = c.req.param('id');
        const db = getDb(c.env);

        const report = await db.queryOne(
            `SELECT * FROM reports WHERE id = $1 AND user_id = $2`,
            [reportId, user.userId]
        );

        if (!report) {
            return c.json({ error: 'Report not found' }, 404);
        }

        return c.json({ report });
    } catch (error) {
        console.error('Get report error:', error);
        return c.json({ error: 'Failed to fetch report' }, 500);
    }
});

