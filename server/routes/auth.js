import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../config/db.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = Router();

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
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);

        // Check if user exists
        const existing = await db.get('SELECT id FROM users WHERE phone = $1', [data.phone]);
        if (existing) {
            return res.status(409).json({ error: 'Phone number already registered' });
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(data.password, 10);

        // Insert user
        const insertSql = db.isUsingPostgres()
            ? `INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`
            : `INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4)`;

        const result = await db.run(insertSql, [data.phone, passwordHash, data.name, data.role]);
        const userId = db.isUsingPostgres() ? result.lastInsertRowid : result.lastInsertRowid;

        const user = await db.get(
            'SELECT id, phone, name, role, avatar, created_at FROM users WHERE id = $1',
            [userId]
        );

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
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res, next) => {
    try {
        const data = loginSchema.parse(req.body);

        // Find user
        const user = await db.get('SELECT * FROM users WHERE phone = $1', [data.phone]);
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
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await db.get(
            `SELECT id, phone, name, role, avatar, created_at FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const { name, avatar } = req.body;

        const updateSql = db.isUsingPostgres()
            ? `UPDATE users SET name = $1, avatar = $2, updated_at = NOW() WHERE id = $3`
            : `UPDATE users SET name = $1, avatar = $2, updated_at = datetime('now') WHERE id = $3`;

        await db.run(updateSql, [name || req.user.name, avatar, req.user.id]);

        const user = await db.get(
            `SELECT id, phone, name, role, avatar, created_at FROM users WHERE id = $1`,
            [req.user.id]
        );

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        next(error);
    }
});

export default router;
