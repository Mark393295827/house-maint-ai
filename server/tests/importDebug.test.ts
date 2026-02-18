import { test, expect } from 'vitest';
import authRoutes from '../routes/auth.js';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

test('import auth routes', () => {
    const app = express();
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    expect(authRoutes).toBeDefined();
    expect(request).toBeDefined();
    expect(express).toBeDefined();
});
