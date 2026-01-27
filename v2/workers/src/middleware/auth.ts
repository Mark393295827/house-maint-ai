import jwt from 'jsonwebtoken';
import type { Context, Next } from 'hono';
import type { Env } from '../index';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: No token provided' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        const payload = jwt.verify(token, c.env.JWT_SECRET) as JWTPayload;
        c.set('user', payload);
        await next();
    } catch (error) {
        return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
}

export function requireRole(allowedRoles: string[]) {
    return async (c: Context<{ Bindings: Env }>, next: Next) => {
        const user = c.get('user') as JWTPayload;

        if (!user || !allowedRoles.includes(user.role)) {
            return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
        }

        await next();
    };
}
