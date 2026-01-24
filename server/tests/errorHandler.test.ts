
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';
import { Request, Response } from 'express';

describe('Error Handler Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: any;
    let json: any;
    let status: any;

    beforeEach(() => {
        req = {};
        json = vi.fn();
        status = vi.fn().mockReturnValue({ json });
        res = {
            status,
            json
        };
        next = vi.fn();
    });

    it('should handle ZodError with 400', () => {
        const error = {
            name: 'ZodError',
            errors: [{ message: 'Invalid field' }]
        };

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            error: 'Validation Error',
            details: error.errors
        });
    });

    it('should handle JsonWebTokenError with 401', () => {
        const error = {
            name: 'JsonWebTokenError'
        };

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            error: 'Invalid token'
        });
    });

    it('should handle TokenExpiredError with 401', () => {
        const error = {
            name: 'TokenExpiredError'
        };

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            error: 'Token expired'
        });
    });

    it('should handle SQLITE_CONSTRAINT with 409', () => {
        const error = {
            code: 'SQLITE_CONSTRAINT'
        };

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(409);
        expect(json).toHaveBeenCalledWith({
            error: 'Duplicate entry'
        });
    });

    it('should handle generic errors with default 500', () => {
        const error = new Error('Something went wrong');

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({
            error: 'Something went wrong'
        });
    });

    it('should handle errors with custom status', () => {
        const error = {
            status: 403,
            message: 'Forbidden'
        };

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({
            error: 'Forbidden'
        });
    });
});
