import { Hono } from 'hono';
import { authMiddleware, type JWTPayload } from '../middleware/auth';
import { getDb } from '../lib/db';
import type { Env } from '../index';

export const ordersRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
ordersRouter.use('*', authMiddleware);

// Create a new order
ordersRouter.post('/', async (c) => {
    try {
        const user = c.get('user') as JWTPayload;
        const body = await c.req.json();

        const { report_id, worker_id, scheduled_at, notes } = body;

        if (!report_id || !worker_id) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        const db = getDb(c.env);

        // Verify report belongs to user
        const report = await db.queryOne(
            'SELECT id FROM reports WHERE id = $1 AND user_id = $2',
            [report_id, user.userId]
        );

        if (!report) {
            return c.json({ error: 'Report not found' }, 404);
        }

        // Verify worker exists and is available
        const worker = await db.queryOne(
            'SELECT id, available FROM workers WHERE id = $1',
            [worker_id]
        );

        if (!worker) {
            return c.json({ error: 'Worker not found' }, 404);
        }

        // Create order
        const result = await db.queryOne<{ id: string }>(
            `INSERT INTO orders (report_id, user_id, worker_id, scheduled_at, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING id`,
            [report_id, user.userId, worker_id, scheduled_at || null, notes || null]
        );

        // Update report status
        await db.execute(
            'UPDATE reports SET status = $1, assigned_worker_id = $2, assigned_at = NOW() WHERE id = $3',
            ['assigned', worker_id, report_id]
        );

        return c.json({
            id: result?.id,
            message: 'Order created successfully',
        }, 201);
    } catch (error) {
        console.error('Create order error:', error);
        return c.json({ error: 'Failed to create order' }, 500);
    }
});

// Get user's orders
ordersRouter.get('/', async (c) => {
    try {
        const user = c.get('user') as JWTPayload;
        const db = getDb(c.env);

        const orders = await db.query(
            `SELECT 
        o.id, o.status, o.scheduled_at, o.created_at,
        r.description, r.address,
        w.name as worker_name, w.phone as worker_phone
       FROM orders o
       JOIN reports r ON o.report_id = r.id
       JOIN workers w ON o.worker_id = w.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
            [user.userId]
        );

        return c.json({ orders });
    } catch (error) {
        console.error('Get orders error:', error);
        return c.json({ error: 'Failed to fetch orders' }, 500);
    }
});

// Get single order
ordersRouter.get('/:id', async (c) => {
    try {
        const user = c.get('user') as JWTPayload;
        const orderId = c.req.param('id');
        const db = getDb(c.env);

        const order = await db.queryOne(
            `SELECT 
        o.*,
        r.description, r.address, r.images, r.ai_diagnosis,
        w.name as worker_name, w.phone as worker_phone, w.rating
       FROM orders o
       JOIN reports r ON o.report_id = r.id
       JOIN workers w ON o.worker_id = w.id
       WHERE o.id = $1 AND o.user_id = $2`,
            [orderId, user.userId]
        );

        if (!order) {
            return c.json({ error: 'Order not found' }, 404);
        }

        return c.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        return c.json({ error: 'Failed to fetch order' }, 500);
    }
});

// Update order status
ordersRouter.patch('/:id/status', async (c) => {
    try {
        const user = c.get('user') as JWTPayload;
        const orderId = c.req.param('id');
        const { status } = await c.req.json();

        const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return c.json({ error: 'Invalid status' }, 400);
        }

        const db = getDb(c.env);

        // Verify order belongs to user
        const order = await db.queryOne(
            'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
            [orderId, user.userId]
        );

        if (!order) {
            return c.json({ error: 'Order not found' }, 404);
        }

        // Update status
        await db.execute(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, orderId]
        );

        return c.json({ message: 'Order status updated' });
    } catch (error) {
        console.error('Update order error:', error);
        return c.json({ error: 'Failed to update order' }, 500);
    }
});

