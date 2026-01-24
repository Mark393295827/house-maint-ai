import { describe, it, expect } from 'vitest';
import {
    DEFAULT_WEIGHTS,
    calculateDistanceScore,
    calculateRatingScore,
    calculateTechnicalScore,
    calculateMatchScore,
    getMatchLevel,
} from './matchScore';

describe('matchScore utilities', () => {
    describe('DEFAULT_WEIGHTS', () => {
        it('should have correct weight values', () => {
            expect(DEFAULT_WEIGHTS.w1).toBe(0.3);
            expect(DEFAULT_WEIGHTS.w2).toBe(0.4);
            expect(DEFAULT_WEIGHTS.w3).toBe(0.3);
        });

        it('should sum to 1.0', () => {
            const sum = DEFAULT_WEIGHTS.w1 + DEFAULT_WEIGHTS.w2 + DEFAULT_WEIGHTS.w3;
            expect(sum).toBe(1.0);
        });
    });

    describe('calculateDistanceScore', () => {
        it('should return 100 for distance 0', () => {
            expect(calculateDistanceScore(0)).toBe(100);
        });

        it('should return 100 for negative distance', () => {
            expect(calculateDistanceScore(-1)).toBe(100);
        });

        it('should return 0 for distance >= maxDistance', () => {
            expect(calculateDistanceScore(10)).toBe(0);
            expect(calculateDistanceScore(15)).toBe(0);
        });

        it('should return 50 for half maxDistance', () => {
            expect(calculateDistanceScore(5)).toBe(50);
        });

        it('should work with custom maxDistance', () => {
            expect(calculateDistanceScore(10, 20)).toBe(50);
            expect(calculateDistanceScore(20, 20)).toBe(0);
        });

        it('should return rounded value', () => {
            // (1 - 3/10) * 100 = 70
            expect(calculateDistanceScore(3)).toBe(70);
            // (1 - 2.5/10) * 100 = 75
            expect(calculateDistanceScore(2.5)).toBe(75);
        });
    });

    describe('calculateRatingScore', () => {
        it('should return 100 for rating 5', () => {
            expect(calculateRatingScore(5)).toBe(100);
        });

        it('should return 0 for rating 0', () => {
            expect(calculateRatingScore(0)).toBe(0);
        });

        it('should return 50 for rating 2.5', () => {
            expect(calculateRatingScore(2.5)).toBe(50);
        });

        it('should return 80 for rating 4', () => {
            expect(calculateRatingScore(4)).toBe(80);
        });

        it('should round to nearest integer', () => {
            // (4.7 / 5) * 100 = 94
            expect(calculateRatingScore(4.7)).toBe(94);
        });
    });

    describe('calculateTechnicalScore', () => {
        it('should return 100 when no required skills', () => {
            expect(calculateTechnicalScore(['plumbing'], [])).toBe(100);
            expect(calculateTechnicalScore(['plumbing'], undefined)).toBe(100);
        });

        it('should return 0 when worker has no skills', () => {
            expect(calculateTechnicalScore([], ['plumbing'])).toBe(0);
            expect(calculateTechnicalScore(undefined, ['plumbing'])).toBe(0);
        });

        it('should return 100 when all skills match', () => {
            expect(calculateTechnicalScore(
                ['plumbing', 'electrical'],
                ['plumbing', 'electrical']
            )).toBe(100);
        });

        it('should return 50 when half skills match', () => {
            expect(calculateTechnicalScore(
                ['plumbing'],
                ['plumbing', 'electrical']
            )).toBe(50);
        });

        it('should return 0 when no skills match', () => {
            expect(calculateTechnicalScore(
                ['carpentry'],
                ['plumbing', 'electrical']
            )).toBe(0);
        });

        it('should handle partial skill matches', () => {
            expect(calculateTechnicalScore(
                ['plumbing', 'electrical', 'carpentry'],
                ['plumbing', 'electrical', 'painting', 'welding']
            )).toBe(50); // 2 out of 4
        });
    });

    describe('calculateMatchScore', () => {
        const mockWorker = {
            distance: 2,
            rating: 4.5,
            skills: ['plumbing', 'electrical'],
        };

        const mockReport = {
            requiredSkills: ['plumbing'],
        };

        it('should calculate score using formula S = w1*D + w2*R + w3*T', () => {
            // D = (1 - 2/10) * 100 = 80
            // R = (4.5/5) * 100 = 90
            // T = (1/1) * 100 = 100
            // S = 0.3*80 + 0.4*90 + 0.3*100 = 24 + 36 + 30 = 90
            expect(calculateMatchScore(mockWorker, mockReport)).toBe(90);
        });

        it('should use custom weights', () => {
            // D = 80, R = 90, T = 100
            // S = 0.5*80 + 0.3*90 + 0.2*100 = 40 + 27 + 20 = 87
            expect(calculateMatchScore(mockWorker, mockReport, {
                w1: 0.5,
                w2: 0.3,
                w3: 0.2,
            })).toBe(87);
        });

        it('should handle edge case: perfect match', () => {
            const perfectWorker = {
                distance: 0,
                rating: 5,
                skills: ['plumbing'],
            };
            const report = {
                requiredSkills: ['plumbing'],
            };
            // D = 100, R = 100, T = 100
            // S = 0.3*100 + 0.4*100 + 0.3*100 = 100
            expect(calculateMatchScore(perfectWorker, report)).toBe(100);
        });

        it('should handle edge case: poor match', () => {
            const poorWorker = {
                distance: 10,
                rating: 0,
                skills: [],
            };
            const report = {
                requiredSkills: ['plumbing'],
            };
            // D = 0, R = 0, T = 0
            // S = 0
            expect(calculateMatchScore(poorWorker, report)).toBe(0);
        });

        it('should round the final score', () => {
            const worker = {
                distance: 3,
                rating: 4.2,
                skills: ['plumbing'],
            };
            const report = {
                requiredSkills: ['plumbing', 'electrical'],
            };
            // D = 70, R = 84, T = 50
            // S = 0.3*70 + 0.4*84 + 0.3*50 = 21 + 33.6 + 15 = 69.6 -> 70
            expect(calculateMatchScore(worker, report)).toBe(70);
        });
    });

    describe('getMatchLevel', () => {
        it('should return excellent for score >= 90', () => {
            expect(getMatchLevel(90)).toEqual({
                level: 'excellent',
                label: '极佳',
                color: '#34C759',
            });
            expect(getMatchLevel(100)).toEqual({
                level: 'excellent',
                label: '极佳',
                color: '#34C759',
            });
        });

        it('should return good for score >= 70 and < 90', () => {
            expect(getMatchLevel(70)).toEqual({
                level: 'good',
                label: '良好',
                color: '#007AFF',
            });
            expect(getMatchLevel(89)).toEqual({
                level: 'good',
                label: '良好',
                color: '#007AFF',
            });
        });

        it('should return fair for score >= 50 and < 70', () => {
            expect(getMatchLevel(50)).toEqual({
                level: 'fair',
                label: '一般',
                color: '#FF9500',
            });
            expect(getMatchLevel(69)).toEqual({
                level: 'fair',
                label: '一般',
                color: '#FF9500',
            });
        });

        it('should return poor for score < 50', () => {
            expect(getMatchLevel(49)).toEqual({
                level: 'poor',
                label: '较差',
                color: '#FF3B30',
            });
            expect(getMatchLevel(0)).toEqual({
                level: 'poor',
                label: '较差',
                color: '#FF3B30',
            });
        });

        it('should handle boundary values correctly', () => {
            expect(getMatchLevel(90).level).toBe('excellent');
            expect(getMatchLevel(89).level).toBe('good');
            expect(getMatchLevel(70).level).toBe('good');
            expect(getMatchLevel(69).level).toBe('fair');
            expect(getMatchLevel(50).level).toBe('fair');
            expect(getMatchLevel(49).level).toBe('poor');
        });
    });
});
