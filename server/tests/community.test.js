import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Community API', () => {
    it('should fetch posts', async () => {
        const res = await request(app).get('/api/community/posts');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.posts)).toBe(true);
    });
});
