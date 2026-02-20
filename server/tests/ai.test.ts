import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock redis to prevent connection errors
vi.mock('../config/redis.js', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        on: vi.fn()
    }
}));

// Mock database to prevent pg connection errors
vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        on: vi.fn()
    },
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    isSQLite: true
}));

// Mock @google/generative-ai — but since no GEMINI_API_KEY is set,
// the service will use its demo fallback instead of calling the mock
vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            getGenerativeModel() {
                return {
                    generateContent: async () => ({
                        response: { text: () => 'mock' }
                    })
                };
            }
        }
    };
});

import { aiService } from '../services/ai.js';

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should diagnose issue using Gemini (demo mode without API key)', async () => {
        const result = (await aiService.diagnoseIssue('base64image', 'image/jpeg', 'Help')) as any;
        // Without GEMINI_API_KEY, the service returns demo diagnosis
        expect(result.diagnosis.issue_identified).toContain('Ceiling Fan');
        expect(result.diagnosis.severity_score).toBe(2);
        expect(result.diagnosis.category).toBe('Electrical');
    });

    it('should use mock response for DeepSeek if no key', async () => {
        const response = await aiService.chatWithExpert([{ role: 'user', content: 'Hello' }]);
        expect(response).toBeTruthy();
        // Without DEEPSEEK_API_KEY, the service returns its own mock response
        expect(response).toContain('mock response');
    });
});
