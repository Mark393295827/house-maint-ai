import { Router } from 'express';
import db from '../config/database.js';
import crypto from 'crypto';
import {
    generateAccessToken,
    generateRefreshToken,
    getAuthCookieOptions,
    getRefreshCookieOptions,
    authenticate,
} from '../middleware/auth.js';
import { JWT_SECRET } from '../config/secrets.js';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { withRetry } from '../agents/common.js';

interface WeChatAuthResponse {
    openid?: string;
    session_key?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
}

const router = Router();

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || 'wx_test_app_id';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || 'wx_test_app_secret';

const wechatLoginSchema = z.object({
    code: z.string().trim().min(1, "WeChat login code is required").max(2048, 'WeChat login code is too long'),
});

function hashWeChatSessionKey(sessionKey: string): string {
    return crypto.createHmac('sha256', JWT_SECRET).update(sessionKey).digest('hex');
}

/**
 * P0: WeChat Mini Program Login (jscode2session)
 * 
 * Flow:
 * 1. Mini Program calls wx.login() to get a short-lived `code`.
 * 2. It sends this `code` to our backend.
 * 3. We call WeChat's auth.code2Session API.
 * 4. We get `openid` and `session_key`.
 * 5. We create or update the user in our DB using `openid`.
 * 6. We issue our standard JWT cookie so iOS/Android clients can talk to us normally.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = wechatLoginSchema.parse(req.body);

        // In a real app, you would make an HTTP request to:
        // https://api.weixin.qq.com/sns/jscode2session?appid=APPID&secret=SECRET&js_code=JSCODE&grant_type=authorization_code
        //
        // For this localized integration, we simulate the network call to avoid blocking development
        // before the merchant account is fully approved.

        let openid = '';
        let session_key = '';

        if (process.env.NODE_ENV === 'development' && code.startsWith('mock_')) {
            openid = `mock_wx_openid_${Date.now()}`;
            session_key = `mock_session_key_${Date.now()}`;
        } else {
            // Actual API Call (mocked for demo safety)
            const wechatRes = await withRetry(
                () => fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`),
                3,
                1000
            );
            const wechatData = (await wechatRes.json()) as WeChatAuthResponse;

            if (wechatData.errcode) {
                return res.status(401).json({ error: `WeChat login failed: ${wechatData.errmsg}` });
            }

            openid = wechatData.openid || '';
            session_key = wechatData.session_key || '';
        }

        if (!openid || !session_key) {
            return res.status(401).json({ error: 'WeChat login response missing required credentials' });
        }

        const sessionKeyHash = hashWeChatSessionKey(session_key);

        // 5. Upsert User based on WeChat OpenID
        const { rows: existingUsers } = await db.query(
            `SELECT * FROM users WHERE wechat_openid = $1`,
            [openid]
        );
        let user: any = existingUsers.length > 0 ? existingUsers[0] : null;

        if (!user) {
            // Generate a placeholder name
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const phone = `wx_${openid.slice(0, 10)}_${randomSuffix}`; // Needs to be unique
            const name = `WeChat User ${randomSuffix}`;

            const { rows: inserted } = await db.query(`
                INSERT INTO users (wechat_openid, wechat_session_key, phone, password_hash, name, role)
                VALUES ($1, $2, $3, $4, $5, 'user')
                RETURNING *
            `, [openid, sessionKeyHash, phone, 'wechat_oauth_no_password', name]);

            user = inserted[0];
        } else {
            // Update session key
            await db.query(`
                UPDATE users SET wechat_session_key = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [sessionKeyHash, user.id]);
        }

        // 6. Issue JWT standard payload
        const payload = { id: user.id, phone: user.phone || '', name: user.name, role: user.role };
        const token = generateAccessToken(payload);
        const refreshToken = generateRefreshToken({ id: user.id });

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
            [user.id, refreshToken, expiresAt]
        );

        res.cookie('accessToken', token, getAuthCookieOptions());
        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

        res.json({
            message: 'WeChat login successful',
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        next(error);
    }
});
const notifyDispatchSchema = z.object({
    reportId: z.number().int().positive(),
    workerId: z.number().int().positive(),
});

/**
 * P0: Notify Dispatch (WeChat Template Message Mock)
 * 
 * Flow:
 * 1. PM Dashboard triggers dispatch.
 * 2. Backend formats an AI summary payload.
 * 3. Sends a template message to the worker's bound WeChat OpenID.
 * 4. Incorporates a Deeplink with action `[接单]` -> Mini Program Escrow Page.
 */
router.post('/notify-dispatch', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reportId, workerId } = notifyDispatchSchema.parse(req.body);

        // Fetch report and worker info
        const { rows: reports } = await db.query(
            `SELECT * FROM reports WHERE id = $1`,
            [reportId]
        );
        const { rows: workers } = await db.query(
            `SELECT * FROM workers w JOIN users u ON w.user_id = u.id WHERE w.id = $1`,
            [workerId]
        );

        if (!reports.length || !workers.length) {
            return res.status(404).json({ error: 'Report or Worker not found' });
        }

        const report = reports[0];
        const worker = workers[0];

        if (!worker.wechat_openid) {
            return res.status(400).json({ error: 'Worker has no WeChat binding' });
        }

        // Simulating the WeChat template message payload
        const templateMessage = {
            touser: worker.wechat_openid,
            template_id: 'mock_dispatch_template_id_123',
            page: `/pages/escrow/index?reportId=${report.id}`, // Deeplink to Mini Program
            data: {
                ai_summary: { value: `维修单: ${report.title} (${report.category || '综合'})` },
                distance: { value: '3.2km (预计到达时间 15分钟)' },
                estimate: { value: '平台预估价: ¥200 (保证金要求: ¥20)' },
                image: { value: '[脱敏处理缩略图已生成]' },
            }
        };

        // Mock API Call to WeChat to send message
        console.log(`[WeChat API] Sending Template Message to ${worker.name} (OpenID: ${worker.wechat_openid}):`);
        console.dir(templateMessage, { depth: null });

        // Update match status to 'pending' -> 'notified' if matches table is used,
        // but for now we just acknowledge the notification delivery.
        
        res.json({ message: 'Dispatch notification sent successfully' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        next(error);
    }
});

export default router;
