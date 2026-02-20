import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/secrets.js';

/** JWT payload shape */
interface JwtPayload {
    id: number;
    phone: string;
    name: string;
    role: string;
}

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
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = decoded;
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
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = decoded;
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

    // Skip in test environment to simplify integration testing
    if (process.env.NODE_ENV === 'test') {
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
export function verifyToken(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Cookie configuration for Access Token
 */
export function getAuthCookieOptions(): any {
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
export function getRefreshCookieOptions(): any {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth', // Restricted path
    };
}

export { JWT_SECRET };
