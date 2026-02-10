import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../services/ai.js';

// Mock GoogleGenerativeAI and fetch
vi.mock('@google/generative-ai', () => {
    const generateContentMock = vi.fn().mockResolvedValue({
        response: {
            text: () => JSON.stringify({
                diagnosis: {
                    issue_identified: "Test Issue",
                    description: "Test Description",
                    category: "Plumbing",
                    severity_score: 3,
                    safety_warning: null
                },
                solution: {
                    can_diy: true,
                    steps: ["Step 1"],
                    required_parts: [],
                    tools_needed: []
                },
                worker_matching_criteria: {
                    required_skill: "Plumber",
                    urgency: "flexible",
                    estimated_man_hours: "1"
                }
            })
        }
    });

    const getGenerativeModelMock = vi.fn().mockReturnValue({
        generateContent: generateContentMock
    });

    return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
            getGenerativeModel: getGenerativeModelMock
        }))
    };
});

// Mock fetch for DeepSeek
global.fetch = vi.fn();

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should diagnose issue using Gemini', async () => {
        const result = await aiService.diagnoseIssue('base64image', 'image/jpeg', 'Help');
        expect(result.diagnosis.issue_identified).toBe('Test Issue');
        expect(result.diagnosis.severity_score).toBe(3);
    });

    it('should use mock response for DeepSeek if no key', async () => {
        // We haven't set the key in the test env, so it should fallback
        const response = await aiService.chatWithExpert([{ role: 'user', content: 'Hello' }]);
        expect(response).toBeTruthy();
        expect(response).toContain('mock response');
    });
});
