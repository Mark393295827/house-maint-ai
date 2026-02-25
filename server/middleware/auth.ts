import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/secrets.js';

import { z } from 'zod';

/** JWT payload schema for strict runtime validation */
export const jwtPayloadSchema = z.object({
    id: z.number(),
    phone: z.string().nullish().transform(val => val ?? ''),
    name: z.string().nullish().transform(val => val ?? ''),
    role: z.string().nullish().transform(val => val ?? 'user'),
    type: z.enum(['access', 'refresh']).optional(),
    jti: z.string().optional(),
    nonce: z.string().optional(),
    iat: z.number().optional(),
    exp: z.number().optional()
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

/** Extended Request with typed user */
export interface AuthRequest extends Request {
    user?: JwtPayload;
}

/**
 * JWT Authentication Middleware
 * Strictly reads token from httpOnly cookie for security.
 * Bearer token fallback is removed to prevent XSS-driven usage.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = req.cookies?.accessToken || req.cookies?.token;

    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = jwtPayloadSchema.parse(decoded);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Optional Authentication - doesn't fail if no token
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = req.cookies?.accessToken || req.cookies?.token;

    if (!token) {
        next();
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = jwtPayloadSchema.parse(decoded);
    } catch (error) {
        // Ignore invalid token in optional auth
    }

    next();
}

/**
 * Role-based Authorization
 */
export function authorize(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }

        next();
    };
}

/**
 * CSRF Guard Middleware
 * Protects mutation routes from Cross-Site Request Forgery.
 * Requires X-CSRF-Token header for non-safe methods.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Check custom header
    // The presence of the header itself is a strong defense as browsers don't allow
    // cross-site requests to set custom headers without CORS preflight approval.

    // Skip in non-production environments to simplify development and demo
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    const csrfToken = req.headers['x-csrf-token'];

    if (!csrfToken) {
        res.status(403).json({ error: 'CSRF token missing' });
        return;
    }

    next();
}

/**
 * Generate Access Token (Short-lived: 15m)
 */
export function generateAccessToken(user: { id: number; phone: string; name: string; role: string }): string {
    return jwt.sign(
        {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            type: 'access',
            nonce: Math.random().toString(36).substring(2)
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
}

/**
 * Generate Refresh Token (Long-lived: 7d)
 */
export function generateRefreshToken(user: { id: number }): string {
    return jwt.sign(
        {
            id: user.id,
            type: 'refresh',
            jti: Math.random().toString(36).substring(2) + Date.now().toString(36)
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * Verify Access Token (for Socket.io)
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return jwtPayloadSchema.parse(decoded);
    } catch (err) {
        return null;
    }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, JWT_SECRET);
    return jwtPayloadSchema.parse(decoded);
}

/**
 * Cookie configuration for Access Token
 */
export function getAuthCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
    };
}

/**
 * Cookie configuration for Refresh Token
 */
export function getRefreshCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth', // Restricted path
    };
}

export { JWT_SECRET };
