import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaultAgent } from './agent.js';

describe('FaultAgent (S2)', () => {
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

    it('has agent name set to Fault-S2', () => {
        const agent = new FaultAgent();
        expect(agent.name).toBe('Fault-S2');
    });

    it('mockAttribution returns valid FaultAttribution structure', () => {
        const agent = new FaultAgent();
        const attribution = agent.mockAttribution();

        expect(attribution).toBeDefined();
        expect(['landlord', 'tenant', 'shared', 'undetermined']).toContain(attribution.attribution);
        expect(typeof attribution.confidence_score).toBe('number');
        expect(Array.isArray(attribution.evidence)).toBe(true);
        expect(typeof attribution.reasoning).toBe('string');
        expect(Array.isArray(attribution.wear_indicators)).toBe(true);
        expect(Array.isArray(attribution.sanya_climate_factors)).toBe(true);
        expect(typeof attribution.legal_reference).toBe('string');
    });

    it('returns mockAttribution when GEMINI_API_KEY is missing', async () => {
        delete process.env.GEMINI_API_KEY;
        const agent = new FaultAgent();
        const response = await agent.assessFault(
            undefined,
            undefined,
            'Water stain on ceiling',
            5,
            12,
            'zh'
        );

        expect(response.usage.model_name).toBe('gemini-mock');
        expect(response.result.attribution).toBe('landlord');
        expect(response.result.evidence.length).toBeGreaterThan(0);
    });

    it('calls Gemini API with text and image payload and parses output when GEMINI_API_KEY is present', async () => {
        process.env.GEMINI_API_KEY = 'mock-key';

        const mockText = JSON.stringify({
            attribution: 'tenant',
            confidence_score: 0.92,
            evidence: ['Deep dent from heavy blunt object impact', 'Cracked tiles near entrance'],
            reasoning: 'Impact damage caused by heavy item dropped by occupant.',
            wear_indicators: [],
            sanya_climate_factors: [],
            legal_reference: '《民法典》第七百一十一条'
        });

        const mockGenerateContent = vi.fn().mockResolvedValue({
            response: {
                text: () => mockText,
                usageMetadata: {
                    promptTokenCount: 150,
                    candidatesTokenCount: 100,
                    totalTokenCount: 250
                }
            }
        });

        const agent = new FaultAgent();
        (agent as any).model = { generateContent: mockGenerateContent };

        const response = await agent.assessFault(
            'base64imageData',
            'image/jpeg',
            'Cracked floor tiles',
            2,
            6,
            'en'
        );

        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        const callArgs = mockGenerateContent.mock.calls[0][0];
        expect(callArgs.contents[0].parts[0]).toEqual({
            inlineData: { data: 'base64imageData', mimeType: 'image/jpeg' }
        });
        expect(response.result.attribution).toBe('tenant');
        expect(response.result.confidence_score).toBe(0.92);
        expect(response.usage.total_tokens).toBe(250);
    });

    it('handles API errors gracefully by returning fallback attribution', async () => {
        process.env.GEMINI_API_KEY = 'mock-key';

        const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Network error'));

        const agent = new FaultAgent();
        (agent as any).model = { generateContent: mockGenerateContent };

        const response = await agent.assessFault(undefined, undefined, 'Mold on wall');

        expect(response.usage.model_name).toBe('gemini-mock');
        expect(response.result.attribution).toBe('landlord');
    });
});
