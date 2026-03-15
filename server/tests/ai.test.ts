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
        const response = (await aiService.diagnoseIssue('base64image', 'image/jpeg', 'Help')) as any;
        // Without GEMINI_API_KEY, the service returns demo diagnosis
        expect(response.result.diagnosis.issue_type).toContain('Pipe Joint Leak');
        expect(response.result.diagnosis.urgency_score).toBe(5);
        expect(response.result.diagnosis.category).toBe('Plumbing');
    });

    it('should use mock response for DeepSeek if no key', async () => {
        const response = await aiService.chatWithExpert([{ role: 'user', content: 'Hello' }]);
        expect(response.result).toBeTruthy();
        // Without DEEPSEEK_API_KEY, the service returns its own mock response
        expect(response.result).toContain('Mock DeepSeek Response');
    });
});
