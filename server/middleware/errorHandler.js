/**
 * Error Handler Middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired'
        });
    }

    // SQLite errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            error: 'Duplicate entry'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
}
