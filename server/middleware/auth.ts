import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'house-maint-ai-secret-key-2024';

/**
 * JWT Authentication Middleware
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Optional Authentication - doesn't fail if no token
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        // Ignore invalid token in optional auth
    }

    next();
}

/**
 * Role-based Authorization
 */
export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        next();
    };
}

/**
 * Generate JWT Token
 */
export function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export { JWT_SECRET };
