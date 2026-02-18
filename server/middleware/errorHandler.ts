/**
 * Error Handler Middleware
 */
import { Request, Response, NextFunction } from 'express';
import * as Sentry from "@sentry/node";
import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
const { JsonWebTokenError, TokenExpiredError } = jwt;
import fs from 'fs';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    // console.error('Error:', err); // Removed in production, can keep for dev if needed
    Sentry.captureException(err);

    // 1. Handle Trusted Operational Errors (AppError)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: err.status,
            error: err.message
        });
        return;
    }

    // 2. Handle Known Third-Party Errors (Zod, JWT, DB) -> Convert to Operational

    // Zod Validation Errors
    if (err instanceof ZodError) {
        res.status(400).json({
            status: 'fail',
            error: 'Validation Error',
            details: err.errors
        });
        return;
    }

    // JWT Errors
    if (err instanceof TokenExpiredError) {
        res.status(401).json({
            status: 'fail',
            error: 'Token expired'
        });
        return;
    }

    if (err instanceof JsonWebTokenError) {
        res.status(401).json({
            status: 'fail',
            error: 'Invalid token'
        });
        return;
    }

    // SQLite/DB Errors (using loose typing for err as it can be any object)
    const errorCode = (err as any).code;
    if (errorCode === 'SQLITE_CONSTRAINT') {
        res.status(409).json({
            status: 'fail',
            error: 'Duplicate entry'
        });
        return;
    }

    // 3. Handle Unknown/Programming Errors (Don't leak details in production)
    console.error('💥 Unexpected Error:', err);

    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
            status: 'error',
            error: 'Something went wrong!' // Generic message
        });
    } else {
        res.status(500).json({
            status: 'error',
            error: err.message,
            stack: err.stack
        });
    }
}
