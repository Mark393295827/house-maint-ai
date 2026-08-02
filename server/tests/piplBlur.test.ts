import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anonymizeImagePayload } from '../middleware/piplBlur.js';

describe('image anonymization policy', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalBypass = process.env.PIPL_ANONYMIZER_BYPASS;

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalBypass === undefined) delete process.env.PIPL_ANONYMIZER_BYPASS;
        else process.env.PIPL_ANONYMIZER_BYPASS = originalBypass;
        vi.restoreAllMocks();
    });

    const createApp = () => {
        const app = express();
        app.use(express.json());
        app.post('/image', anonymizeImagePayload, (req, res) => {
            res.json({
                image: req.body.image,
                bypassed: req.body.piplAnonymizationBypassed,
                anonymized: req.body.piplAnonymized,
            });
        });
        return app;
    };

    it('allows an explicit raw-image bypass only in local development', async () => {
        process.env.NODE_ENV = 'development';
        process.env.PIPL_ANONYMIZER_BYPASS = 'true';

        const response = await request(createApp())
            .post('/image')
            .send({ image: 'base64-image', mimeType: 'image/jpeg' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            image: 'base64-image',
            bypassed: true,
            anonymized: false,
        });
    });

    it('remains fail-closed in production even if the bypass flag is present', async () => {
        process.env.NODE_ENV = 'production';
        process.env.PIPL_ANONYMIZER_BYPASS = 'true';

        const response = await request(createApp())
            .post('/image')
            .send({ image: 'base64-image', mimeType: 'image/jpeg' });

        expect(response.status).toBe(503);
        expect(response.body).toEqual({ error: 'Privacy compliance error' });
    });
});
