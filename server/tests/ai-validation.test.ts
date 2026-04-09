import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aiServiceMock } = vi.hoisted(() => ({
    aiServiceMock: {
        diagnoseIssue: vi.fn(),
        continueDiagnosis: vi.fn(),
        inquiryConversation: vi.fn(),
        meceAnalysis: vi.fn(),
        hypothesisGeneration: vi.fn(),
        checklistGeneration: vi.fn(),
        fiveWhyAnalysis: vi.fn(),
        solutionGeneration: vi.fn(),
        chatWithExpert: vi.fn(),
        generateRepairPlan: vi.fn(),
        generateMaterialBOM: vi.fn(),
        assessFault: vi.fn(),
        compareTurnover: vi.fn(),
        runResearch: vi.fn(),
    }
}));

vi.mock('@sentry/node', () => ({
    captureException: vi.fn(),
}));

vi.mock('../services/ai.js', () => ({
    aiService: aiServiceMock,
}));

vi.mock('../middleware/aiCostTracker.js', () => ({
    trackAiCost: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/inferenceValue.js', () => ({
    trackInferenceValue: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/piplBlur.js', () => ({
    anonymizeImagePayload: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import aiRouter from '../routes/ai.js';

function createApp() {
    const app = express();
    app.use(express.json({ limit: '20mb' }));
    app.use('/api/v1/ai', aiRouter);
    return app;
}

describe('AI route validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        aiServiceMock.diagnoseIssue.mockResolvedValue({
            result: { diagnosis: 'ok' },
            usage: { totalTokens: 10 },
        });
    });

    it('rejects oversized base64 image payloads before invoking the AI service', async () => {
        const app = createApp();
        const oversizedImage = Buffer.alloc(5 * 1024 * 1024 + 32, 1).toString('base64');

        const response = await request(app)
            .post('/api/v1/ai/diagnose')
            .send({
                image: oversizedImage,
                mimeType: 'image/png',
                text: 'Pipe is leaking under the sink.',
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
        expect(aiServiceMock.diagnoseIssue).not.toHaveBeenCalled();
    });

    it('accepts bounded text input and forwards valid requests to the AI service', async () => {
        const app = createApp();

        const response = await request(app)
            .post('/api/v1/ai/diagnose')
            .send({
                text: 'The washing machine is vibrating loudly during spin cycle.',
            });

        expect(response.status).toBe(200);
        expect(aiServiceMock.diagnoseIssue).toHaveBeenCalledWith(
            undefined,
            undefined,
            'The washing machine is vibrating loudly during spin cycle.'
        );
    });
});
