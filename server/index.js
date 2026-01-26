import 'dotenv/config';
import './instrument.js'; // Sentry initialization must be first
import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import workerRoutes from './routes/workers.js';
import uploadRoutes from './routes/uploads.js';
import communityRoutes from './routes/community.js';
import aiRoutes from './routes/ai.js';
import feedbackRoutes from './routes/feedback.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';
import { standardLimiter, strictLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow loading uploads from different origin
}));

// Request logging
app.use(morgan('combined'));

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply standard rate limiting to all requests
app.use(standardLimiter);

// Static files for uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// API v1 Routes
app.use('/api/v1/auth', strictLimiter, authRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/ai', strictLimiter, aiRoutes);
app.use('/api/v1/feedback', feedbackRoutes);

// Backward compatibility: redirect /api/* to /api/v1/*
app.use('/api/auth', strictLimiter, authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai', strictLimiter, aiRoutes);
app.use('/api/feedback', feedbackRoutes);

// Sentry Error Handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Health check (available at both /api/health and /api/v1/health)
app.get(['/api/health', '/api/v1/health'], (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        apiVersion: 'v1'
    });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(PORT, () => {
        console.log(`🚀 House Maint API running at http://localhost:${PORT}`);
        console.log(`📚 API Docs: http://localhost:${PORT}/api/health`);
    });
}

export default app;
