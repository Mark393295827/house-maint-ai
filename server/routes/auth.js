import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../config/database.js';
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
        const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(data.phone);
        if (existing) {
            return res.status(409).json({ error: 'Phone number already registered' });
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(data.password, 10);

        // Insert user
        const result = db.prepare(`
            INSERT INTO users (phone, password_hash, name, role)
            VALUES (?, ?, ?, ?)
        `).run(data.phone, passwordHash, data.name, data.role);

        const user = db.prepare('SELECT id, phone, name, role, avatar, created_at FROM users WHERE id = ?')
            .get(result.lastInsertRowid);

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
        const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(data.phone);
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
router.get('/me', authenticate, (req, res) => {
    const user = db.prepare(`
        SELECT id, phone, name, role, avatar, created_at 
        FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, (req, res, next) => {
    try {
        const { name, avatar } = req.body;

        db.prepare(`
            UPDATE users SET name = ?, avatar = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(name || req.user.name, avatar, req.user.id);

        const user = db.prepare(`
            SELECT id, phone, name, role, avatar, created_at 
            FROM users WHERE id = ?
        `).get(req.user.id);

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        next(error);
    }
});

export default router;
