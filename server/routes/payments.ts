import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';
import db from '../config/database.js';
import { emitToWorkers } from '../socket.js';

const router = express.Router();
// ... (rest of imports remains)

// Initialize Stripe (API Key should be in .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2026-01-28.clover',
});

/**
 * POST /api/payments/checkout
 * Create a Stripe Checkout Session
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

        res.json({ id: session.id, url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ error: error.message || 'Checkout failed' });
    }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe Webhooks
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

        if (reportId) {
            try {
                // 1. Update report status to 'matching'
                const { rows } = await db.query(`
                    UPDATE reports 
                    SET status = 'matching', 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $1 
                    RETURNING *
                `, [reportId]);

                const report = rows[0];

                // 2. Notify all workers about the new available job
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
                // Even if DB update fails, we should respond 200 to Stripe to avoid retries
            }
        }
    }

    res.send({ received: true });
});

/**
 * GET /api/payments/history/:userId
 * Get payment history for a user
 */
router.get('/history/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        // Verify user is requesting their own history or is admin
        if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Mock history for now, implementation would query DB
        const mockHistory = [
            { id: '1', amount: 50.00, status: 'succeeded', date: new Date().toISOString() }
        ];

        res.json({ history: mockHistory });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
