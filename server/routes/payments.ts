import express from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../config/database.js';
import { emitToWorkers } from '../socket.js';
import crypto from 'crypto';

const router = express.Router();

// Mock WeChat Pay Credentials
const MCH_ID = process.env.WECHAT_MCH_ID || '1234567890';
const APP_ID = process.env.WECHAT_APP_ID || 'wx_test_app_id';
const API_V3_KEY = process.env.WECHAT_API_V3_KEY || 'test_api_v3_key_1234567890123456';

/**
 * Helper to generate WeChat Pay JSAPI Signature (Mocked for localized dev)
 */
function generateWeChatPaySignature(appId: string, timeStamp: string, nonceStr: string, packageStr: string, privateKey: string) {
    const message = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    // In production, this uses RSA signature with the merchant's API certificate
    return crypto.createHmac('sha256', privateKey).update(message).digest('base64');
}

/**
 * POST /api/v1/payments/checkout
 * Create a WeChat Pay JSAPI order (Native Mini Program Payment)
 * Idempotent: if a pending order already exists for the same user+report, return it.
 */
router.post('/checkout', authenticate, async (req, res, next) => {
    try {
        const { amount, currency = 'cny', reportId, idempotencyKey } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        // 1. Idempotency Guard
        if (reportId) {
            const { rows: existing } = await db.query(
                `SELECT * FROM orders WHERE user_id = $1 AND report_id = $2 AND status = 'pending'`,
                [req.user.id, reportId]
            );

            if (existing.length > 0) {
                const existingOrder = existing[0];
                // Return existing WeChat prepay details if we had stored them
                // For now, we simulate returning the existing OutTradeNo
                return res.json({
                    outTradeNo: existingOrder.wechat_out_trade_no,
                    message: 'Existing pending order found',
                    deduplicated: true
                });
            }
        }

        // 2. Generate unique OutTradeNo for WeChat
        const outTradeNo = `HM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // 3. Create a pending order in our database BEFORE calling WeChat
        await db.query(
            `INSERT INTO orders (user_id, report_id, wechat_out_trade_no, amount, currency, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, reportId || null, outTradeNo, amount, currency, 'pending']
        );

        // 4. Call WeChat Pay API v3 (Mocked for localized development)
        // In reality: POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi

        const mockPrepayId = `wx${Date.now()}${Math.floor(Math.random() * 1000000)}`;
        const timeStamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const packageStr = `prepay_id=${mockPrepayId}`;

        // Use a dummy key for local dev signature
        const paySign = generateWeChatPaySignature(APP_ID, timeStamp, nonceStr, packageStr, API_V3_KEY);

        // 5. Return JSAPI parameters exactly as the Mini Program requires them
        res.json({
            timeStamp,
            nonceStr,
            package: packageStr,
            signType: 'RSA',
            paySign,
            outTradeNo // Keep track for webhook reconciliation
        });

    } catch (error) {
        console.error('WeChat Pay Checkout Error:', error);
        next(error);
    }
});


/**
 * POST /api/v1/payments/webhook
 * Handle WeChat Pay V3 Webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    // WeChat Pay V3 Webhooks send an encrypted payload
    /* 
    const wechatSignature = req.headers['wechatpay-signature'];
    const wechatSerial = req.headers['wechatpay-serial'];
    const wechatTimestamp = req.headers['wechatpay-timestamp'];
    const wechatNonce = req.headers['wechatpay-nonce'];
    */

    try {
        // Parse the body (WeChat sends JSON, but we use raw to verify signature first in prod)
        const bodyStr = req.body.toString('utf8');
        const event = JSON.parse(bodyStr);

        // In production, you MUST decrypt event.resource.ciphertext using API_V3_KEY AEAD_AES_256_GCM
        // For this localized stub, we simulate the decrypted structure
        const decryptedData = event.resource_type === 'encrypt-resource' ?
            { out_trade_no: 'MOCK_OUT_TRADE_NO', trade_state: 'SUCCESS', attach: '' } :
            event;

        if (event.event_type === 'TRANSACTION.SUCCESS' || decryptedData.trade_state === 'SUCCESS') {
            const outTradeNo = decryptedData.out_trade_no;
            const reportIdStr = decryptedData.attach; // We would pass reportId in 'attach' field during JSAPI call

            console.log(`💰 WeChat Payment succeeded for TradeNo: ${outTradeNo}`);

            // Deduplication Guard
            const { rows: orderRows } = await db.query(
                `SELECT id, status, report_id FROM orders WHERE wechat_out_trade_no = $1`,
                [outTradeNo]
            );

            if (orderRows.length > 0) {
                const order = orderRows[0];

                if (order.status === 'paid') {
                    console.log(`⏭️  Order already paid for TradeNo ${outTradeNo}, skipping.`);
                    // MUST return 200 or WeChat will retry for 24 hours
                    return res.status(200).json({ code: 'SUCCESS', message: 'OK' });
                }

                // Mark order as paid
                await db.query(
                    `UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE wechat_out_trade_no = $1`,
                    [outTradeNo]
                );

                // State Machine Guard
                if (order.report_id) {
                    try {
                        const { rows } = await db.query(`
                            UPDATE reports 
                            SET status = 'matching', 
                                updated_at = CURRENT_TIMESTAMP 
                            WHERE id = $1 AND status = 'pending'
                            RETURNING *
                        `, [order.report_id]);

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
                        console.error('Database update failed after WeChat payment:', dbError);
                    }
                }
            }
        }

        // Acknowledge WeChat Webhook
        res.status(200).json({ code: 'SUCCESS', message: 'OK' });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`WeChat Webhook Error: ${message}`);
        // Return 500 to tell WeChat to retry
        return res.status(500).json({ code: 'FAIL', message: 'Internal Server Error' });
    }
});

/**
 * GET /api/v1/payments/orders
 * Get the current user's payment orders
 */
router.get('/orders', authenticate, async (req, res, next) => {
    try {
        const { rows: orders } = await db.query(`
            SELECT o.*, r.title as report_title
            FROM orders o
            LEFT JOIN reports r ON o.report_id = r.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        res.json({ orders });
    } catch (error) {
        console.error('Get orders error:', error);
        next(error);
    }
});

/**
 * GET /api/v1/payments/orders/:id
 * Get a specific order
 */
router.get('/orders/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rows: orders } = await db.query(
            `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ order: orders[0] });
    } catch (error) {
        console.error('Get order detail error:', error);
        next(error);
    }
});

export default router;
