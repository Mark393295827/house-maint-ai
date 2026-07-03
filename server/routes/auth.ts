import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../config/database.js';
import {
    authenticate,
    generateAccessToken,
    generateRefreshToken,
    generateCsrfToken,
    getAuthCookieOptions,
    getRefreshCookieOptions,
    hashRefreshToken,
    verifyRefreshToken
} from '../middleware/auth.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

const clearAuthCookies = (res: express.Response) => {
    const refreshPath = getRefreshCookieOptions().path || '/api/v1/auth';
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('token', { path: '/' }); // legacy fallback
    res.clearCookie('refreshToken', { path: refreshPath });
    // Backward compatibility: clear previously mis-scoped refresh cookie if present.
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('_csrf', { path: '/' });
};

// ... (Validation schemas remain the same, omitting for brevity in replacement if possible, but I need to replace the endpoints)

// Validation schemas
const registerSchema = z.object({
    phone: z.string().regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['user', 'worker']).optional().default('user')
});

const loginSchema = z.object({
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be at most 15 digits'),
    password: z.string().min(1, 'Password is required')
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *               - name
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: ^1[3-9]\d{9}$
 *                 description: Mobile phone number
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Display name
 *               role:
 *                 type: string
 *                 enum: [user, worker]
 *                 default: user
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *       409:
 *         description: Phone number already registered
 *       400:
 *         description: Validation error
 */
router.post('/register', async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);

        // Check if user exists
        const { rows: existing } = await db.query('SELECT id FROM users WHERE phone = $1', [data.phone]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Phone number already registered' });
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(data.password, 10);

        // Insert user
        const { rows: users } = await db.query(`
            INSERT INTO users (phone, password_hash, name, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, phone, name, role, avatar, created_at
        `, [data.phone, passwordHash, data.name, data.role]);

        const user = users[0];

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token
        // Calculate expiry: 7 days from now
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await db.query(`
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, hashRefreshToken(refreshToken), expiresAt]);

        // Set cookies
        res.cookie('accessToken', accessToken, getAuthCookieOptions());
        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

        res.status(201).json(ApiResponse.success({ user }, 'Registration successful'));
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Registered phone number
 *               password:
 *                 type: string
 *                 description: User password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res, next) => {
    try {
        const data = loginSchema.parse(req.body);

        // Find user
        const { rows: users } = await db.query('SELECT * FROM users WHERE phone = $1', [data.phone]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const valid = bcrypt.compareSync(data.password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await db.query(`
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, hashRefreshToken(refreshToken), expiresAt]);

        // Set cookies
        res.cookie('accessToken', accessToken, getAuthCookieOptions());
        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

        // Remove sensitive data before sending
        const { password_hash: _, ...safeUser } = user;

        res.json(ApiResponse.success({ user: safeUser }, 'Login successful'));
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
        }

        // Verify JWT signature
        let payload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (e) {
            return res.status(401).json({ error: 'Invalid refresh token signature' });
        }

        // Check DB for token validity and revocation
        const tokenHash = hashRefreshToken(refreshToken);
        const { rows } = await db.query(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND (revoked = 0 OR revoked IS NULL)',
            [tokenHash]
        );
        let storedToken = rows[0];

        if (!storedToken) {
            const { rows: legacyRows } = await db.query(
                'SELECT * FROM refresh_tokens WHERE token = $1 AND (revoked = 0 OR revoked IS NULL)',
                [refreshToken]
            );
            storedToken = legacyRows[0];
        }

        if (!storedToken) {
            // Token not found or revoked - potentially reused revoked token!
            // Security: In a full system, verify if it was *revoked* and alert.
            clearAuthCookies(res);
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Check expiry (DB) - helpful if DB constraint differs from JWT
        if (new Date(storedToken.expires_at) < new Date()) {
            clearAuthCookies(res);
            return res.status(401).json({ error: 'Refresh token expired' });
        }

        if (payload.id !== storedToken.user_id) {
            await db.query('UPDATE refresh_tokens SET revoked = 1 WHERE id = $1', [storedToken.id]);
            clearAuthCookies(res);
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Fetch user data for new access token
        const { rows: users } = await db.query('SELECT * FROM users WHERE id = $1', [storedToken.user_id]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Revoke old token (Rotation)
        await db.query('UPDATE refresh_tokens SET revoked = 1 WHERE id = $1', [storedToken.id]);

        // Generate NEW tokens (Rotation)
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // Store new refresh token
        await db.query(`
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, hashRefreshToken(newRefreshToken), newExpiresAt]);

        // Set cookies
        res.cookie('accessToken', newAccessToken, getAuthCookieOptions());
        res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

        // Remove sensitive data
        const { password_hash: _, ...safeUser } = user;

        res.json(ApiResponse.success({ user: safeUser }, 'Token refreshed'));

    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (revoke token and clear cookies)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            // Revoke in DB
            await db.query('UPDATE refresh_tokens SET revoked = 1 WHERE token = $1', [hashRefreshToken(refreshToken)]);
            await db.query('UPDATE refresh_tokens SET revoked = 1 WHERE token = $1', [refreshToken]);
        }

        clearAuthCookies(res);

        res.json(ApiResponse.success(null, 'Logged out successfully'));
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', authenticate, async (req, res) => {
    const { rows } = await db.query(`
        SELECT id, phone, name, role, avatar, created_at 
        FROM users WHERE id = $1
    `, [req.user.id]);

    const user = rows[0];

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(ApiResponse.success({ user }));
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const { name, avatar } = req.body;

        const { rows } = await db.query(`
            UPDATE users SET name = $1, avatar = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, phone, name, role, avatar, created_at
        `, [name || req.user.name, avatar, req.user.id]);

        const user = rows[0];

        res.json(ApiResponse.success({ user }, 'Profile updated'));
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         phone:
 *           type: string
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, worker]
 *         avatar:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * GET /api/v1/auth/csrf-token
 * Issue a CSRF token for the double-submit cookie pattern.
 * Frontend calls this on page load, stores the token, and attaches it
 * as the X-CSRF-Token header on all mutation requests.
 */
router.get('/csrf-token', generateCsrfToken);

export default router;
