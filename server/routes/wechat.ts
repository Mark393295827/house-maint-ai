import { Router } from 'express';
import db from '../config/database.js';
import { users, refreshTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAuthCookieOptions, getRefreshCookieOptions } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/secrets.js';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

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
    code: z.string().min(1, "WeChat login code is required")
});

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
            const wechatRes = await fetch(
                `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`
            );
            const wechatData = (await wechatRes.json()) as WeChatAuthResponse;

            if (wechatData.errcode) {
                return res.status(401).json({ error: `WeChat login failed: ${wechatData.errmsg}` });
            }

            openid = wechatData.openid || '';
            session_key = wechatData.session_key || '';
        }

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
            `, [openid, session_key, phone, 'wechat_oauth_no_password', name]);

            user = inserted[0];
        } else {
            // Update session key
            await db.query(`
                UPDATE users SET wechat_session_key = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [session_key, user.id]);
        }

        // 6. Issue JWT standard payload
        const payload = { id: user.id, phone: user.phone || '', name: user.name, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
            [user.id, refreshToken, expiresAt]
        );

        res.cookie('auth_token', token, getAuthCookieOptions());
        res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());

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

export default router;
