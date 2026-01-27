import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../lib/db';
import type { Env } from '../index';

export const authRouter = new Hono<{ Bindings: Env }>();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(10, 'Password must be at least 10 characters')
        .regex(/[A-Z]/, 'Password must contain uppercase')
        .regex(/[a-z]/, 'Password must contain lowercase')
        .regex(/[0-9]/, 'Password must contain number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
    name: z.string().min(2),
    role: z.enum(['user', 'worker']).default('user'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

authRouter.post('/register', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password, name, role } = registerSchema.parse(body);

        const db = getDb(c.env);

        // Check if user exists
        const existing = await db.queryOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existing) {
            return c.json({ error: 'Email already registered' }, 400);
        }

        // Hash password with strong salt
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const result = await db.queryOne<{ id: string }>(
            `INSERT INTO users (email, password_hash, name, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
            [email, passwordHash, name, role]
        );

        if (!result) {
            throw new Error('Failed to create user');
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: result.id, email, role },
            c.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return c.json({
            token,
            user: { id: result.id, email, name, role },
        }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ error: error.errors[0].message }, 400);
        }
        console.error('Registration error:', error);
        return c.json({ error: 'Registration failed' }, 500);
    }
});

authRouter.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password } = loginSchema.parse(body);

        const db = getDb(c.env);

        // Find user
        const user = await db.queryOne<{
            id: string;
            email: string;
            password_hash: string;
            name: string;
            role: string;
        }>('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email]);

        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            c.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return c.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ error: error.errors[0].message }, 400);
        }
        console.error('Login error:', error);
        return c.json({ error: 'Login failed' }, 500);
    }
});
