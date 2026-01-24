import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
    phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['user', 'worker']).optional().default('user')
});

const loginSchema = z.object({
    phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
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
 *                 token:
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

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'Registration successful',
            user,
            token
        });
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
 *                 token:
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

        // Generate token
        const token = generateToken(user);

        // Remove sensitive data
        delete user.password_hash;

        res.json({
            message: 'Login successful',
            user,
            token
        });
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

    res.json({ user });
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

        res.json({ message: 'Profile updated', user });
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

export default router;
