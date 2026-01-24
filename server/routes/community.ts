import express from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';

const router = express.Router();

// Validation schema
const postSchema = z.object({
    title: z.string().min(2, 'Title is required'),
    content: z.string().min(10, 'Content must be at least 10 characters'),
    tags: z.array(z.string()).optional(),
});

/**
 * GET /api/community/posts
 * Get all community posts
 * Cached for 2 minutes
 */
router.get('/posts', cacheMiddleware(120), async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const { rows: posts } = await db.query(`
            SELECT p.*, u.name as author_name, u.avatar as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        // Parse tags
        const formattedPosts = posts.map(post => {
            try {
                return {
                    ...post,
                    tags: post.tags ? JSON.parse(post.tags) : []
                };
            } catch (e) {
                return { ...post, tags: [] };
            }
        });

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

        const { rows } = await db.query(`
            INSERT INTO posts (user_id, title, content, tags)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [
            req.user.id,
            data.title,
            data.content,
            data.tags ? JSON.stringify(data.tags) : '[]'
        ]);

        const newPost = rows[0];

        const { rows: postWithAuthor } = await db.query(`
            SELECT p.*, u.name as author_name, u.avatar as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [newPost.id]);

        const post = postWithAuthor[0];

        // Clear posts cache
        await clearCache('community/posts');

        res.status(201).json({
            message: 'Post created successfully',
            post: {
                ...post,
                tags: JSON.parse(post.tags || '[]')
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
        const { rowCount } = await db.query(`
            UPDATE posts SET likes = likes + 1 WHERE id = $1
        `, [req.params.id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Technically we should clear cache here too if we cache individual post details
        // For the list view, we might tolerate some delay or clear it:
        // await clearCache('community/posts'); 

        res.json({ success: true, message: 'Post liked' });
    } catch (error) {
        next(error);
    }
});

export default router;
