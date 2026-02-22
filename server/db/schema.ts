import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    phone: text('phone').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    avatar: text('avatar'),
    role: text('role', { enum: ['user', 'worker', 'admin', 'manager', 'tenant'] }).default('user'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Workers Table
export const workers = sqliteTable('workers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skills: text('skills').notNull(), // JSON array
    rating: real('rating').default(5.0),
    totalJobs: integer('total_jobs').default(0),
    latitude: real('latitude'),
    longitude: real('longitude'),
    available: integer('available').default(1),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Reports Table
export const reports = sqliteTable('reports', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category'),
    voiceUrl: text('voice_url'),
    videoUrl: text('video_url'),
    imageUrls: text('image_urls'), // JSON array
    status: text('status', { enum: ['pending', 'matching', 'matched', 'in_progress', 'completed', 'cancelled'] }).default('pending'),
    matchedWorkerId: integer('matched_worker_id').references(() => workers.id, { onDelete: 'set null' }),
    latitude: real('latitude'),
    longitude: real('longitude'),
    matchedAt: text('matched_at'),
    completedAt: text('completed_at'),
    resolutionDetails: text('resolution_details'), // JSON: { steps, parts, cost, photos }
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Matches Table
export const matches = sqliteTable('matches', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    workerId: integer('worker_id').notNull().references(() => workers.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    distanceScore: real('distance_score'),
    ratingScore: real('rating_score'),
    skillScore: real('skill_score'),
    status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Reviews Table
export const reviews = sqliteTable('reviews', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workerId: integer('worker_id').notNull().references(() => workers.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    photos: text('photos'), // JSON array of photo URLs
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Posts Table
export const posts = sqliteTable('posts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    tags: text('tags'), // JSON array
    likes: integer('likes').default(0),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Patterns Table (AI Learning)
export const patterns = sqliteTable('patterns', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    problemType: text('problem_type').notNull(),
    contextSignature: text('context_signature').notNull(),
    solution: text('solution').notNull(), // JSON
    successRate: real('success_rate').default(1.0),
    usageCount: integer('usage_count').default(1),
    lastUsed: text('last_used').default(sql`(datetime('now'))`),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Refresh Tokens Table
export const refreshTokens = sqliteTable('refresh_tokens', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    revoked: integer('revoked', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// User Assets Table (Phase 1.1)
export const userAssets = sqliteTable('user_assets', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'appliance', 'system', 'structure'
    name: text('name').notNull(), // 'Samsung Refrigerator'
    brand: text('brand'),
    model: text('model'),
    serialNumber: text('serial_number'),
    purchaseDate: text('purchase_date'),
    warrantyExpiry: text('warranty_expiry'),
    specs: text('specs'), // JSON string for technical details
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Price Guide Table (Phase 1.2)
export const priceGuide = sqliteTable('price_guide', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category').notNull(), // 'plumbing'
    taskName: text('task_name').notNull(), // 'Faucet Replacement'
    description: text('description'),
    basePriceLow: real('base_price_low').notNull(),
    basePriceHigh: real('base_price_high').notNull(),
    unit: text('unit').notNull(), // 'per_item', 'per_hour', 'fixed'
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// AI Usage Logs Table (Phase 13)
export const aiUsageLogs = sqliteTable('ai_usage_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    modelName: text('model_name').notNull(),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    totalTokens: integer('total_tokens').default(0),
    costUsd: real('cost_usd').default(0.0),
    endpoint: text('endpoint'),
    durationMs: integer('duration_ms'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// AI Settings Table (Phase 13)
export const aiSettings = sqliteTable('ai_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// AI Feedback Table (Product Improvement: Trust Loop)
export const aiFeedback = sqliteTable('ai_feedback', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    diagnosisData: text('diagnosis_data'), // JSON string of the diagnosis result
    isHelpful: integer('is_helpful', { mode: 'boolean' }).notNull(),
    comment: text('comment'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Orders Table (Product Improvement: Payment Lifecycle)
export const orders = sqliteTable('orders', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
    stripeSessionId: text('stripe_session_id').unique(),
    amount: real('amount').notNull(),
    currency: text('currency').default('usd'),
    status: text('status', { enum: ['pending', 'paid', 'refunded', 'failed'] }).default('pending'),
    receiptUrl: text('receipt_url'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Messages Table (P1: User-Worker Messaging)
export const messages = sqliteTable('messages', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    receiverId: integer('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    readAt: text('read_at'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Notifications Table (P1: In-App Notifications)
export const notifications = sqliteTable('notifications', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['job_update', 'message', 'payment', 'system'] }).notNull(),
    title: text('title').notNull(),
    body: text('body'),
    data: text('data'), // JSON
    readAt: text('read_at'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});
