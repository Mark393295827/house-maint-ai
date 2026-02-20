import 'dotenv/config';
import './instrument.js'; // Sentry initialization must be first
import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import workerRoutes from './routes/workers.js';
import uploadRoutes from './routes/uploads.js';
import communityRoutes from './routes/community.js';
import aiRoutes from './routes/ai.js';
import metricsRoutes from './routes/metrics.js';
import analyticsRoutes from './routes/analytics.js';
import assetsRoutes from './routes/assets.js';
import paymentRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import { diagnosticsClaw } from './services/diagnostics_claw.js';
import { vendorClaw } from './services/vendor_claw.js';
import { csrfGuard } from './middleware/auth.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';
import { standardLimiter, strictLimiter } from './middleware/rateLimiter.js';
import { metricsCollector } from './middleware/metricsCollector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - supports multiple environments
const getAllowedOrigins = (): (string | RegExp)[] => {
    const origins: (string | RegExp)[] = [];

    // Add configured origins from environment variable (comma-separated)
    if (process.env.CORS_ORIGINS) {
        origins.push(...process.env.CORS_ORIGINS.split(',').map(o => o.trim()));
    }

    // Default development origins - allow localhost and common local IP patterns
    if (process.env.NODE_ENV !== 'production') {
        origins.push(/http:\/\/localhost:\d+/);
        origins.push(/http:\/\/127\.0\.0\.1:\d+/);
        origins.push(/http:\/\/192\.168\.\d+\.\d+:\d+/);
        origins.push(/http:\/\/10\.\d+\.\d+\.\d+:\d+/);
        origins.push(/http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+/);
    }

    // Production origins pattern (if set)
    if (process.env.CORS_PATTERN) {
        origins.push(new RegExp(process.env.CORS_PATTERN));
    }

    return origins.length > 0 ? origins : ['http://localhost:5173'];
};

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // In development, allow any origin (reflect it)
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        const allowedOrigins = getAllowedOrigins();

        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(o => {
            if (o instanceof RegExp) return o.test(origin);
            return o === origin;
        });

        if (isAllowed) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:", "https:"],
        },
    },
}));

// Prevent HTTP Parameter Pollution
app.use(hpp());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(csrfGuard);
app.use(express.static('public'));

// Debug request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Apply standard rate limiting to all requests
app.use(standardLimiter);

// Metrics collection — auto-track request count, success/error, and response times
app.use(metricsCollector);

// Swagger
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';

// Static files for uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API Routes
app.use('/api/auth', strictLimiter, authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai', strictLimiter, aiRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

// Sentry Error Handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});


import { createServer } from 'http';
import { initSocket } from './socket.js';

const httpServer = createServer(app);
initSocket(httpServer);

const server = process.argv[1] === fileURLToPath(import.meta.url)
    ? httpServer.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 House Maint API running at http://0.0.0.0:${PORT}`);
        console.log(`📚 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`🔌 Socket.io ready`);

        // Start autonomous background agents
        diagnosticsClaw.start();
        vendorClaw.start();
    })
    : null;

export { server };
export default app;
