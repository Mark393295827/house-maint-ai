import { Router } from 'express';
import { z } from 'zod';
import db from '../config/database.js';
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
router.get('/posts', (req, res) => {
    const { limit = 20, offset = 0 } = req.query;

    const posts = db.prepare(`
        SELECT p.*, u.name as author_name, u.avatar as author_avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Parse tags
    const formattedPosts = posts.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : []
    }));

    res.json({ posts: formattedPosts });
});

/**
 * POST /api/community/posts
 * Create a new post
 */
router.post('/posts', authenticate, (req, res, next) => {
    try {
        const data = postSchema.parse(req.body);

        const result = db.prepare(`
            INSERT INTO posts (user_id, title, content, tags)
            VALUES (?, ?, ?, ?)
        `).run(
            req.user.id,
            data.title,
            data.content,
            data.tags ? JSON.stringify(data.tags) : '[]'
        );

        const post = db.prepare(`
            SELECT p.*, u.name as author_name, u.avatar as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Post created successfully',
            post: {
                ...post,
                tags: JSON.parse(post.tags)
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
router.post('/posts/:id/like', authenticate, (req, res) => {
    // Ideally we should have a separate likes table to prevent double liking
    // For MVP, just incrementing the counter
    const result = db.prepare(`
        UPDATE posts SET likes = likes + 1 WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post liked' });
});

export default router;
