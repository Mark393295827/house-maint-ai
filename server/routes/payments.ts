import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Initialize Stripe (API Key should be in .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-01-27.acacia', // Latest API version
});

/**
 * POST /api/payments/create-intent
 * Create a Payment Intent for a job
 */
router.post('/create-intent', authenticate, async (req, res, next) => {
    try {
        const { amount, currency = 'usd', reportId } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            metadata: {
                reportId,
                userId: req.user.id
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe Webhooks (Payment Success/Failure)
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

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`💰 Payment succeeded for Report: ${paymentIntent.metadata.reportId}`);
            // Logic to update database status to 'paid' would go here
            break;
        default:
        // console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
});

export default router;
