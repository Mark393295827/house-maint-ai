import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRouter } from './routes/auth';
import { reportsRouter } from './routes/reports';
import { workersRouter } from './routes/workers';
import { ordersRouter } from './routes/orders';
import { b2bRouter } from './routes/b2b';

export type Env = {
    DATABASE_URL: string;
    JWT_SECRET: string;
    GEMINI_API_KEY: string;
    OLLAMA_URL?: string;
    IMAGES_BUCKET: R2Bucket;
    CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:3000', 'https://house-maint-ai.vercel.app'],
    credentials: true,
}));

// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.route('/auth', authRouter);
app.route('/reports', reportsRouter);
app.route('/workers', workersRouter);
app.route('/orders', ordersRouter);
app.route('/b2b', b2bRouter);

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('API Error:', err);
    return c.json({ error: err.message || 'Internal server error' }, 500);
});

export default app;
