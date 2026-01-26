import { Router } from 'express';
import { z } from 'zod';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Validation schema
const postSchema = z.object({
    title: z.string().min(2, 'Title is required'),
    content: z.string().min(10, 'Content must be at least 10 characters'),
    tags: z.array(z.string()).optional(),
});

/**
 * GET /api/community/posts
 * Get all community posts
 */
router.get('/posts', async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const posts = await db.all(`
            SELECT p.*, u.name as author_name, u.avatar as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), parseInt(offset)]);

        // Parse tags
        const formattedPosts = posts.map(post => ({
            ...post,
            tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : (post.tags || [])
        }));

        res.json({ posts: formattedPosts });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/community/posts
 * Create a new post
 */
router.post('/posts', authenticate, async (req, res, next) => {
    try {
        const data = postSchema.parse(req.body);

        const insertSql = db.isUsingPostgres()
            ? `INSERT INTO posts (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING id`
            : `INSERT INTO posts (user_id, title, content, tags) VALUES ($1, $2, $3, $4)`;

        const result = await db.run(insertSql, [
            req.user.id,
            data.title,
            data.content,
            data.tags ? JSON.stringify(data.tags) : '[]'
        ]);

        const post = await db.get(`
            SELECT p.*, u.name as author_name, u.avatar as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Post created successfully',
            post: {
                ...post,
                tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : (post.tags || [])
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/community/posts/:id/like
 * Like a post
 */
router.post('/posts/:id/like', authenticate, async (req, res, next) => {
    try {
        // Ideally we should have a separate likes table to prevent double liking
        // For MVP, just incrementing the counter
        const result = await db.run(`UPDATE posts SET likes = likes + 1 WHERE id = $1`, [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ success: true, message: 'Post liked' });
    } catch (error) {
        next(error);
    }
});

export default router;
