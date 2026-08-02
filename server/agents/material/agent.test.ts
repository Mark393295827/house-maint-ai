import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialAgent } from './agent.js';

describe('MaterialAgent (S1)', () => {
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

    it('has agent name set to Material-S1', () => {
        const agent = new MaterialAgent();
        expect(agent.name).toBe('Material-S1');
    });

    it('mockBOM returns valid Bill of Materials structure', () => {
        const agent = new MaterialAgent();
        const bom = agent.mockBOM();

        expect(bom).toBeDefined();
        expect(Array.isArray(bom.parts)).toBe(true);
        expect(bom.parts.length).toBeGreaterThan(0);
        expect(bom.parts[0]).toHaveProperty('name');
        expect(bom.parts[0]).toHaveProperty('specification');
        expect(bom.parts[0]).toHaveProperty('quantity');
        expect(bom.parts[0]).toHaveProperty('estimated_price_cny');
        expect(bom.parts[0]).toHaveProperty('search_query');
        expect(Array.isArray(bom.tools_needed)).toBe(true);
        expect(bom.total_estimated_cost).toHaveProperty('min');
        expect(bom.total_estimated_cost).toHaveProperty('max');
        expect(typeof bom.confidence_score).toBe('number');
        expect(typeof bom.notes).toBe('string');
    });

    it('returns mockBOM when GEMINI_API_KEY is not set', async () => {
        delete process.env.GEMINI_API_KEY;
        const agent = new MaterialAgent();
        const response = await agent.generateBOM('Pipe leak in bathroom', 'plumbing', 'zh');

        expect(response.usage.model_name).toBe('gemini-mock');
        expect(response.result.parts.length).toBeGreaterThan(0);
        expect(response.result.total_estimated_cost.min).toBe(25);
    });

    it('calls Gemini API and parses JSON response when GEMINI_API_KEY is set', async () => {
        process.env.GEMINI_API_KEY = 'mock-key';

        const mockText = JSON.stringify({
            parts: [
                {
                    name: 'ANGLE VALVE 角阀 (1/2 inch)',
                    specification: '304 Stainless Steel',
                    quantity: 2,
                    estimated_price_cny: 40,
                    search_query: '不锈钢角阀 4分'
                }
            ],
            tools_needed: ['Adjustable Wrench'],
            total_estimated_cost: { min: 40, max: 80 },
            confidence_score: 0.9,
            notes: 'Replaced with corrosion resistant valve.'
        });

        const mockGenerateContent = vi.fn().mockResolvedValue({
            response: {
                text: () => mockText,
                usageMetadata: {
                    promptTokenCount: 120,
                    candidatesTokenCount: 80,
                    totalTokenCount: 200
                }
            }
        });

        const agent = new MaterialAgent();
        (agent as any).model = { generateContent: mockGenerateContent };

        const response = await agent.generateBOM('Angle valve rusted and leaking', 'plumbing', 'en');

        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        expect(response.result.parts[0].name).toBe('ANGLE VALVE 角阀 (1/2 inch)');
        expect(response.result.confidence_score).toBe(0.9);
        expect(response.usage.total_tokens).toBe(200);
        expect(response.usage.model_name).toBe('gemini-2.5-flash');
    });

    it('falls back to mockBOM when Gemini API call fails', async () => {
        process.env.GEMINI_API_KEY = 'mock-key';

        const mockGenerateContent = vi.fn().mockRejectedValue(new Error('API quota exceeded'));

        const agent = new MaterialAgent();
        (agent as any).model = { generateContent: mockGenerateContent };

        const response = await agent.generateBOM('Broken tap', 'plumbing', 'zh');

        expect(response.usage.model_name).toBe('gemini-mock');
        expect(response.result).toBeDefined();
        expect(response.result.parts.length).toBeGreaterThan(0);
    });
});
