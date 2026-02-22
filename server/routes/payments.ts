import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';
import db from '../config/database.js';
import { emitToWorkers } from '../socket.js';

const router = express.Router();

// Initialize Stripe (API Key should be in .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2026-01-28.clover',
});

/**
 * POST /api/payments/checkout
 * Create a Stripe Checkout Session and a pending order
 */
router.post('/checkout', authenticate, async (req, res) => {
    try {
        const { amount, currency = 'usd', reportId } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: `Maintenance Job #${reportId}`,
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
            metadata: {
                reportId,
                userId: req.user.id.toString(),
            },
        });

        // Create a pending order in the database
        await db.query(
            `INSERT INTO orders (user_id, report_id, stripe_session_id, amount, currency, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, reportId || null, session.id, amount, currency, 'pending']
        );

        res.json({ id: session.id, url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ error: error.message || 'Checkout failed' });
    }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe Webhooks — update order status
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (endpointSecret && sig) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            event = req.body;
        }
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const reportId = session.metadata?.reportId;

        console.log(`💰 Payment succeeded for Session: ${session.id} (Report: ${reportId})`);

        // Update order status to 'paid'
        try {
            await db.query(
                `UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP
                 WHERE stripe_session_id = $1`,
                [session.id]
            );
        } catch (err) {
            console.error('Failed to update order status:', err);
        }

        if (reportId) {
            try {
                const { rows } = await db.query(`
                    UPDATE reports 
                    SET status = 'matching', 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $1 
                    RETURNING *
                `, [reportId]);

                const report = rows[0];

                if (report) {
                    emitToWorkers('new_job_available', {
                        reportId: report.id,
                        category: report.category,
                        title: report.title,
                        description: report.description
                    });
                }
            } catch (dbError) {
                console.error('Database update failed after payment:', dbError);
            }
        }
    }

    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
        const session = event.data.object as any;
        try {
            await db.query(
                `UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP
                 WHERE stripe_session_id = $1`,
                [session.id]
            );
        } catch (err) {
            console.error('Failed to update order failure status:', err);
        }
    }

    res.send({ received: true });
});

/**
 * GET /api/payments/orders
 * Get the current user's payment orders
 */
router.get('/orders', authenticate, async (req, res) => {
    try {
        const { rows: orders } = await db.query(`
            SELECT o.*, r.title as report_title
            FROM orders o
            LEFT JOIN reports r ON o.report_id = r.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        res.json({ orders });
    } catch (error: any) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * GET /api/payments/orders/:id
 * Get a specific order by ID
 */
router.get('/orders/:id', authenticate, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT o.*, r.title as report_title, r.description as report_description, r.category
            FROM orders o
            LEFT JOIN reports r ON o.report_id = r.id
            WHERE o.id = $1 AND o.user_id = $2
        `, [req.params.id, req.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ order: rows[0] });
    } catch (error: any) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

export default router;
