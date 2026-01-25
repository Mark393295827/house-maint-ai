import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';

describe('Feedback API', () => {
    let testSessionId = 'test-session-123';

    beforeAll(() => {
        // Clear feedback events before tests
        db.prepare('DELETE FROM feedback_events').run();
    });

    it('should accept valid feedback event', async () => {
        const response = await request(app)
            .post('/api/feedback')
            .send({
                session_id: testSessionId,
                event_type: 'view',
                data: { diagnosisId: 'test-diagnosis' }
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });

    it('should reject missing required fields', async () => {
        const response = await request(app)
            .post('/api/feedback')
            .send({
                event_type: 'view'
                // missing session_id
            });

        expect(response.status).toBe(400);
    });

    it('should reject invalid event type', async () => {
        const response = await request(app)
            .post('/api/feedback')
            .send({
                session_id: testSessionId,
                event_type: 'invalid_type',
                data: {}
            });

        expect(response.status).toBe(400);
    });

    it('should store and retrieve explicit rating', async () => {
        await request(app)
            .post('/api/feedback')
            .send({
                session_id: testSessionId,
                event_type: 'rating_explicit',
                data: { rating: 'positive', comment: 'Great job!' }
            });

        // Check stats (optional, depends on implementation)
        const statsResponse = await request(app).get('/api/feedback/stats');
        expect(statsResponse.status).toBe(200);

        const ratingStat = statsResponse.body.find(s => s.event_type === 'rating_explicit');
        expect(ratingStat).toBeDefined();
        expect(ratingStat.count).toBeGreaterThanOrEqual(1);
    });
});
