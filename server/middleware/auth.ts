import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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
 * Reads token from httpOnly cookie first, falls back to Authorization header
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    // Try cookie first (accessToken or legacy token), then Authorization header
    const token = req.cookies?.accessToken || req.cookies?.token || extractBearerToken(req);

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
    const token = req.cookies?.token || extractBearerToken(req);

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
 * Generate JWT Token
 */
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
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Cookie configuration for Access Token
 */
export function getAuthCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
} {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
    };
}

/**
 * Cookie configuration for Refresh Token
 */
export function getRefreshCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
} {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth', // Restricted path
    };
}

/**
 * Extract Bearer token from Authorization header (backward compatibility)
 */
function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}

export { JWT_SECRET };
