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
