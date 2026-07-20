import express, { Request } from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../config/database.js';
import { emitToWorkers } from '../socket.js';
import crypto from 'crypto';

const router = express.Router();

// Mock WeChat Pay Credentials
const DEFAULT_MCH_ID = '1234567890';
const DEFAULT_APP_ID = 'wx_test_app_id';
const DEFAULT_API_V3_KEY = 'test_api_v3_key_1234567890123456';
const MCH_ID = process.env.WECHAT_MCH_ID || DEFAULT_MCH_ID;
const APP_ID = process.env.WECHAT_APP_ID || DEFAULT_APP_ID;
const API_V3_KEY = process.env.WECHAT_API_V3_KEY || DEFAULT_API_V3_KEY;
const WEBHOOK_VERIFY_REQUIRED = process.env.WECHAT_WEBHOOK_VERIFY !== 'false';
const WEBHOOK_SECRET = process.env.WECHAT_WEBHOOK_SECRET || API_V3_KEY;
const CHECKOUT_AMOUNT_CENTS = Number(process.env.REPAIR_CHECKOUT_AMOUNT_CENTS || 9900);

function assertProductionCredentials() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const unsafeConfiguration = [
        MCH_ID === DEFAULT_MCH_ID ? 'WECHAT_MCH_ID' : null,
        APP_ID === DEFAULT_APP_ID ? 'WECHAT_APP_ID' : null,
        API_V3_KEY === DEFAULT_API_V3_KEY ? 'WECHAT_API_V3_KEY' : null,
        !WEBHOOK_VERIFY_REQUIRED ? 'WECHAT_WEBHOOK_VERIFY' : null
    ].filter((name): name is string => name !== null);

    if (unsafeConfiguration.length > 0) {
        throw new Error(
            `FATAL: Unsafe WeChat production configuration: ${unsafeConfiguration.join(', ')}`
        );
    }
}

assertProductionCredentials();

interface WeChatPaymentNotification {
    out_trade_no?: string;
    trade_state?: string;
    attach?: string;
}

function buildCheckoutResponse(
    outTradeNo: string,
    orderId?: number,
    paymentParams?: {
        timeStamp: string;
        nonceStr: string;
        package: string;
        signType: 'RSA';
        paySign: string;
    },
    extras: Record<string, unknown> = {}
) {
    return {
        id: outTradeNo,
        // Mini Program JSAPI payments use payment params, not a browser redirect.
        // Keep the frontend's URL contract present without sending it to a fake external page.
        url: '',
        provider: 'wechat',
        outTradeNo,
        orderId,
        ...(paymentParams ? { paymentParams, ...paymentParams } : {}),
        ...extras
    };
}

/**
 * Helper to generate WeChat Pay JSAPI Signature (Mocked for localized dev)
 */
function generateWeChatPaySignature(appId: string, timeStamp: string, nonceStr: string, packageStr: string, privateKey: string) {
    const message = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    // In production, this uses RSA signature with the merchant's API certificate
    return crypto.createHmac('sha256', privateKey).update(message).digest('base64');
}

function getRawBodyString(body: unknown): string {
    if (Buffer.isBuffer(body)) {
        return body.toString('utf8');
    }
    if (typeof body === 'string') {
        return body;
    }
    if (body && typeof body === 'object') {
        return JSON.stringify(body);
    }
    return '';
}

function verifyWebhookSignature(req: Request, rawBody: string): { ok: boolean; reason?: string } {
    if (!WEBHOOK_VERIFY_REQUIRED) {
        return { ok: true };
    }

    const signatureHeader = req.header('wechatpay-signature') || '';
    const timestamp = req.header('wechatpay-timestamp') || '';
    const nonce = req.header('wechatpay-nonce') || '';

    if (!signatureHeader || !timestamp || !nonce) {
        return { ok: false, reason: 'Missing webhook signature headers' };
    }

    const timestampNum = Number(timestamp);
    if (!Number.isFinite(timestampNum)) {
        return { ok: false, reason: 'Invalid webhook timestamp' };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    // Reject stale/replayed requests outside a 5-minute window.
    if (Math.abs(nowSeconds - timestampNum) > 300) {
        return { ok: false, reason: 'Webhook timestamp outside allowable window' };
    }

    const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const expectedSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('base64');

    const providedBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (providedBuffer.length !== expectedBuffer.length) {
        return { ok: false, reason: 'Invalid webhook signature length' };
    }

    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        return { ok: false, reason: 'Webhook signature verification failed' };
    }

    return { ok: true };
}

function parseJsonValue(value: unknown): any {
    if (typeof value !== 'string') {
        return value;
    }
    return JSON.parse(value);
}

function decryptWeChatResource(resource: any): WeChatPaymentNotification {
    if (!resource?.ciphertext || !resource?.nonce) {
        throw new Error('Encrypted WeChat resource is missing ciphertext or nonce');
    }

    const key = Buffer.from(API_V3_KEY, 'utf8');
    if (key.length !== 32) {
        throw new Error('WECHAT_API_V3_KEY must be 32 bytes to decrypt WeChat Pay resources');
    }

    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    if (ciphertext.length <= 16) {
        throw new Error('Encrypted WeChat resource is too short');
    }

    const encryptedPayload = ciphertext.subarray(0, ciphertext.length - 16);
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'));

    if (resource.associated_data) {
        decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    }

    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
        decipher.update(encryptedPayload),
        decipher.final()
    ]).toString('utf8');

    return JSON.parse(plaintext);
}

function extractPaymentNotification(event: any): WeChatPaymentNotification | null {
    if (event?.resource_type === 'encrypt-resource') {
        return decryptWeChatResource(event.resource);
    }

    if (event?.resource?.plaintext) {
        return parseJsonValue(event.resource.plaintext);
    }

    if (event?.resource?.out_trade_no || event?.resource?.trade_state) {
        return event.resource;
    }

    if (event?.out_trade_no || event?.trade_state) {
        return event;
    }

    return null;
}

async function movePaidReportIntoMatching(reportId: number) {
    const { rows } = await db.query(`
        UPDATE reports
        SET status = 'matching',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status IN ('pending', 'analyzed', 'planned')
        RETURNING *
    `, [reportId]);

    const report = rows[0];
    if (!report) {
        return null;
    }

    emitToWorkers('new_job_available', {
        reportId: report.id,
        category: report.category,
        title: report.title,
        description: report.description
    });

    return report;
}

/**
 * POST /api/v1/payments/checkout
 * Create a WeChat Pay JSAPI order (Native Mini Program Payment)
 * Idempotent: if a pending order already exists for the same user+report, return it.
 */
router.post('/checkout', authenticate, async (req, res, next) => {
    try {
        const { currency = 'cny', reportId } = req.body;

        if (!Number.isInteger(CHECKOUT_AMOUNT_CENTS) || CHECKOUT_AMOUNT_CENTS <= 0) {
            return res.status(500).json({ error: 'Checkout price is not configured' });
        }

        if (currency !== 'cny') {
            return res.status(400).json({ error: 'Unsupported currency' });
        }

        if (!reportId) {
            return res.status(400).json({ error: 'reportId is required' });
        }

        const { rows: reports } = await db.query(
            `SELECT id, status FROM reports WHERE id = $1 AND user_id = $2`,
            [reportId, req.user.id]
        );
        const report = reports[0];
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        if (!['pending', 'analyzed', 'planned', 'matching'].includes(report.status)) {
            return res.status(400).json({ error: `Report is not payable in ${report.status} status` });
        }

        // 1. Idempotency Guard
        if (reportId) {
            const { rows: existing } = await db.query(
                `SELECT * FROM orders WHERE user_id = $1 AND report_id = $2 AND status = 'pending'`,
                [req.user.id, reportId]
            );

            if (existing.length > 0) {
                const existingOrder = existing[0];
                return res.json(buildCheckoutResponse(existingOrder.wechat_out_trade_no, existingOrder.id, undefined, {
                    message: 'Existing pending order found',
                    deduplicated: true
                }));
            }
        }

        // 2. Generate unique OutTradeNo for WeChat
        const outTradeNo = `HM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // 3. Create a pending order in our database BEFORE calling WeChat
        const { rows: orders } = await db.query(
            `INSERT INTO orders (user_id, report_id, wechat_out_trade_no, amount, currency, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [req.user.id, reportId, outTradeNo, CHECKOUT_AMOUNT_CENTS, currency, 'pending']
        );

        // 4. Call WeChat Pay API v3 (Mocked for localized development)
        // In reality: POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi

        const mockPrepayId = `wx${Date.now()}${Math.floor(Math.random() * 1000000)}`;
        const timeStamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const packageStr = `prepay_id=${mockPrepayId}`;

        // Use a dummy key for local dev signature
        const paySign = generateWeChatPaySignature(APP_ID, timeStamp, nonceStr, packageStr, API_V3_KEY);

        const paymentParams = {
            timeStamp,
            nonceStr,
            package: packageStr,
            signType: 'RSA' as const,
            paySign,
        };

        // 5. Return the frontend checkout contract and JSAPI params.
        res.json(buildCheckoutResponse(outTradeNo, orders[0]?.id, paymentParams));

    } catch (error) {
        console.error('WeChat Pay Checkout Error:', error);
        next(error);
    }
});


/**
 * POST /api/v1/payments/webhook
 * Handle WeChat Pay V3 Webhooks
 */
router.post('/webhook', async (req, res) => {
    // WeChat Pay V3 Webhooks send an encrypted payload
    /* 
    const wechatSignature = req.headers['wechatpay-signature'];
    const wechatSerial = req.headers['wechatpay-serial'];
    const wechatTimestamp = req.headers['wechatpay-timestamp'];
    const wechatNonce = req.headers['wechatpay-nonce'];
    */

    try {
        const bodyStr = getRawBodyString(req.body);
        const verification = verifyWebhookSignature(req, bodyStr);
        if (!verification.ok) {
            return res.status(401).json({ code: 'FAIL', message: verification.reason || 'Invalid webhook signature' });
        }

        // Parse the body only after signature validation
        const event = JSON.parse(bodyStr);

        if (process.env.NODE_ENV === 'production' && event.resource_type !== 'encrypt-resource') {
            return res.status(400).json({ code: 'FAIL', message: 'Plaintext payment events are not accepted in production' });
        }

        const notification = extractPaymentNotification(event);

        if ((event.event_type === 'TRANSACTION.SUCCESS' || notification?.trade_state === 'SUCCESS') && notification?.out_trade_no) {
            const outTradeNo = notification.out_trade_no;

            console.log(`💰 WeChat Payment succeeded for TradeNo: ${outTradeNo}`);

            // Deduplication Guard
            const { rows: orderRows } = await db.query(
                `SELECT id, status, report_id FROM orders WHERE wechat_out_trade_no = $1`,
                [outTradeNo]
            );

            if (orderRows.length > 0) {
                const order = orderRows[0];

                if (order.status === 'paid') {
                    console.log(`Order already paid for TradeNo ${outTradeNo}; reconciling its report.`);
                } else {
                    // Mark order as paid
                    await db.query(
                        `UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE wechat_out_trade_no = $1`,
                        [outTradeNo]
                    );
                }

                // State Machine Guard
                if (order.report_id) {
                    await movePaidReportIntoMatching(order.report_id);
                }
            } else {
                console.warn(`Ignoring WeChat payment for unknown TradeNo: ${outTradeNo}`);
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
