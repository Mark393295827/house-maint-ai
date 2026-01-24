/**
 * Tests for session hooks
 */

import { describe, it, expect } from 'vitest';
import { getRelevantPatterns } from '../../scripts/hooks/session-start.js';
import { extractPatterns } from '../../scripts/hooks/evaluate-session.js';
import { analyzeForCompaction } from '../../scripts/hooks/suggest-compact.js';

describe('session-start', () => {
    describe('getRelevantPatterns', () => {
        it('should filter patterns by frequency', () => {
            const patterns = {
                patterns: [
                    { id: 'p1', frequency: 5 },
                    { id: 'p2', frequency: 1 },
                    { id: 'p3', frequency: 3, confidence: 0.9 }
                ]
            };

            const relevant = getRelevantPatterns({}, patterns);
            expect(relevant.length).toBe(2);
        });

        it('should return empty array for null patterns', () => {
            const relevant = getRelevantPatterns({}, null);
            expect(relevant).toEqual([]);
        });
    });
});

describe('evaluate-session', () => {
    describe('extractPatterns', () => {
        it('should extract solution patterns', () => {
            const activity = {
                solutions: [
                    { context: 'React', problem: 'Re-render', solution: 'useMemo' }
                ]
            };

            const patterns = extractPatterns(activity);
            expect(patterns.length).toBe(1);
            expect(patterns[0].type).toBe('solution');
        });

        it('should handle empty activity', () => {
            const patterns = extractPatterns({});
            expect(patterns).toEqual([]);
        });
    });
});

describe('suggest-compact', () => {
    describe('analyzeForCompaction', () => {
        it('should suggest compacting tool outputs', () => {
            const context = {
                toolOutputs: Array(15).fill({})
            };

            const suggestions = analyzeForCompaction(context);
            expect(suggestions.some(s => s.type === 'tool_outputs')).toBe(true);
        });

        it('should return empty for minimal context', () => {
            const suggestions = analyzeForCompaction({});
            expect(suggestions).toEqual([]);
        });
    });
});
