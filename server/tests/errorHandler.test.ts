
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Request, Response } from 'express';

vi.mock('@sentry/node', () => ({
    captureException: vi.fn(),
}));

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
        const issues: any[] = [{ code: 'custom', path: ['field'], message: 'Invalid field' }];
        const error = new ZodError(issues);

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation Error'
        }));
    });

    it('should handle JsonWebTokenError with 401', () => {
        const error = new JsonWebTokenError('Invalid token');

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            status: 'fail',
            error: 'Invalid token'
        });
    });

    it('should handle TokenExpiredError with 401', () => {
        const error = new TokenExpiredError('jwt expired', new Date());

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            status: 'fail',
            error: 'Token expired'
        });
    });

    it('should handle SQLITE_CONSTRAINT with 409', () => {
        const error = {
            code: 'SQLITE_CONSTRAINT'
        };

        errorHandler(error as any, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(409);
        expect(json).toHaveBeenCalledWith({
            status: 'fail',
            error: 'Duplicate entry'
        });
    });

    it('should handle AppError with correct status and message', () => {
        const error = new AppError('Custom operational error', 403);

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({
            status: 'fail',
            error: 'Custom operational error'
        });
    });

    it('should handle generic errors by masking them in PRODUCTION', () => {
        vi.stubEnv('NODE_ENV', 'production');

        const error = new Error('Sensitive database failure detail');

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({
            status: 'error',
            error: 'Something went wrong!'
        });

        vi.unstubAllEnvs();
    });

    it('should show error details in DEVELOPMENT', () => {
        vi.stubEnv('NODE_ENV', 'development');

        const error = new Error('Dev failure detail');

        errorHandler(error, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'error',
            error: 'Dev failure detail'
        }));

        vi.unstubAllEnvs();
    });
});
