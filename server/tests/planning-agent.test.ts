import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/secrets.js', () => ({
    DEEPSEEK_API_KEY: 'test-deepseek-key',
}));

import { PlanningAgent } from '../agents/planning/agent.js';

describe('PlanningAgent client plan contract', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('requests concise bilingual JSON without exposing chain-of-thought', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            customer_summary: {
                                zh: '关闭供水并维修漏水接头。',
                                en: 'Shut off the water and repair the leaking joint.',
                            },
                            required_skills: [{ zh: '水管工', en: 'Plumber' }],
                            required_tools: [{ zh: '管钳', en: 'Pipe wrench' }],
                            estimated_hours: 1,
                            cost_range: { min: 100, max: 200, currency: 'CNY' },
                            priority_protocol: 'immediate',
                            steps: [{ zh: '关闭供水。', en: 'Shut off the water.' }],
                            safety_notes: [{ zh: '保持地面干燥。', en: 'Keep the floor dry.' }],
                        }),
                    },
                }],
                usage: { prompt_tokens: 100, completion_tokens: 80, total_tokens: 180 },
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const agent = new PlanningAgent();
        await agent.generatePlan({
            title: '水管漏水',
            description: '厨房水槽下方的水管漏水，需要维修',
        });

        const request = fetchMock.mock.calls[0][1] as RequestInit;
        const body = JSON.parse(String(request.body));
        const systemPrompt = body.messages[0].content as string;

        expect(systemPrompt).toContain('Simplified Chinese and English');
        expect(systemPrompt).toContain('no more than 5 steps');
        expect(systemPrompt).toContain('Do not expose chain-of-thought');
        expect(systemPrompt).toContain('"customer_summary"');
        expect(systemPrompt).toContain('"currency": "CNY"');
    });
});
