import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnoverAgent } from './agent.js';

describe('TurnoverAgent (S3)', () => {
    const originalApiKey = process.env.GEMINI_API_KEY;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        if (originalApiKey !== undefined) {
            process.env.GEMINI_API_KEY = originalApiKey;
        } else {
            delete process.env.GEMINI_API_KEY;
        }
    });

    it('has agent name set to Turnover-S3', () => {
        const agent = new TurnoverAgent();
        expect(agent.name).toBe('Turnover-S3');
    });

    it('mockReport returns valid TurnoverReport structure', () => {
        const agent = new TurnoverAgent();
        const report = agent.mockReport();

        expect(report).toBeDefined();
        expect(['excellent', 'good', 'fair', 'damaged']).toContain(report.overall_condition);
        expect(Array.isArray(report.damage_items)).toBe(true);
        expect(report.damage_items[0]).toHaveProperty('location');
        expect(report.damage_items[0]).toHaveProperty('description');
        expect(report.damage_items[0]).toHaveProperty('severity');
        expect(report.damage_items[0]).toHaveProperty('estimated_repair_cost');
        expect(report.damage_items[0]).toHaveProperty('is_new_damage');
        expect(Array.isArray(report.missing_items)).toBe(true);
        expect(typeof report.cleanliness_score).toBe('number');
        expect(typeof report.summary).toBe('string');
        expect(typeof report.evidence_timestamps).toBe('string');
    });

    it('returns mockReport when GEMINI_API_KEY is not set', async () => {
        delete process.env.GEMINI_API_KEY;
        const agent = new TurnoverAgent();
        const response = await agent.compareTurnover([], [], 'Sanya Bay Villa', 'zh');

        expect(response.usage.model_name).toBe('gemini-mock');
        expect(response.result.overall_condition).toBe('fair');
        expect(response.result.damage_items.length).toBeGreaterThan(0);
    });

    it('calls Gemini API with before and after images and parses response when API key is present', async () => {
        process.env.GEMINI_API_KEY = 'mock-key';

        const mockText = JSON.stringify({
            overall_condition: 'damaged',
            damage_items: [
                {
                    location: 'Balcony glass table',
                    description: 'Shattered glass top',
                    severity: 'major',
                    estimated_repair_cost: 800,
                    is_new_damage: true
                }
            ],
            missing_items: ['Remote control'],
            cleanliness_score: 5,
            summary: 'Balcony table shattered during stay. Remote missing.',
            evidence_timestamps: '2026-03-08T12:00:00Z'
        });

        const mockGenerateContent = vi.fn().mockResolvedValue({
            response: {
                text: () => mockText,
                usageMetadata: {
                    promptTokenCount: 300,
                    candidatesTokenCount: 150,
                    totalTokenCount: 450
                }
            }
        });

        const agent = new TurnoverAgent();
        (agent as any).model = { generateContent: mockGenerateContent };

        const beforeImages = [{ data: 'beforeBase64', mimeType: 'image/png' }];
        const afterImages = [{ data: 'afterBase64', mimeType: 'image/png' }];

        const response = await agent.compareTurnover(
            beforeImages,
            afterImages,
            'Ocean View Suite',
            'en'
        );

        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        expect(response.result.overall_condition).toBe('damaged');
        expect(response.result.damage_items[0].estimated_repair_cost).toBe(800);
        expect(response.usage.total_tokens).toBe(450);
    });

    it('falls back to mockReport when Gemini API throws an error', async () => {
        process.env.GEMINI_API_KEY = 'mock-key';

        const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Gemini API unreachable'));

        const agent = new TurnoverAgent();
        (agent as any).model = { generateContent: mockGenerateContent };

        const response = await agent.compareTurnover([], []);

        expect(response.usage.model_name).toBe('gemini-mock');
        expect(response.result.overall_condition).toBe('fair');
    });
});
