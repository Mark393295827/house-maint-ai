import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MatchScoreCard from './MatchScoreCard';

// Mock matchScore utility
vi.mock('../utils/matchScore', () => ({
    calculateMatchScore: vi.fn(() => 85),
    getMatchLevel: vi.fn(() => ({
        level: 'good',
        label: '良好',
        color: '#007AFF'
    })),
}));

import * as matchScoreUtils from '../utils/matchScore';

describe('MatchScoreCard', () => {
    const mockWorker = {
        name: '张师傅',
        avatar: 'https://example.com/avatar.jpg',
        distance: 2.5,
        rating: 4.8,
        skills: ['plumbing', 'electrical'],
        distanceScore: 75,
        technicalScore: 90,
    };

    const mockReport = {
        description: '水管漏水',
        requiredSkills: ['plumbing'],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render worker name', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(screen.getByText('张师傅')).toBeInTheDocument();
    });

    it('should render worker distance and rating', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(screen.getByText('2.5km · ⭐ 4.8')).toBeInTheDocument();
    });

    it('should render match score', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('should render match level label', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(screen.getByText('良好')).toBeInTheDocument();
    });

    it('should call calculateMatchScore with worker and report', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(matchScoreUtils.calculateMatchScore).toHaveBeenCalledWith(mockWorker, mockReport);
    });

    it('should call getMatchLevel with score', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(matchScoreUtils.getMatchLevel).toHaveBeenCalledWith(85);
    });

    it('should render score details when showDetails is true (default)', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(screen.getByText('距离')).toBeInTheDocument();
        expect(screen.getByText('评价')).toBeInTheDocument();
        expect(screen.getByText('技能')).toBeInTheDocument();
    });

    it('should hide score details when showDetails is false', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} showDetails={false} />);

        expect(screen.queryByText('距离')).not.toBeInTheDocument();
        expect(screen.queryByText('评价')).not.toBeInTheDocument();
        expect(screen.queryByText('技能')).not.toBeInTheDocument();
    });

    it('should display correct distance score', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        // distanceScore from mockWorker
        expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should calculate distance score when distanceScore not provided', () => {
        const workerWithoutDistanceScore = {
            ...mockWorker,
            distanceScore: undefined,
        };
        render(<MatchScoreCard worker={workerWithoutDistanceScore} report={mockReport} />);

        // Fallback: Math.round((1 - 2.5 / 10) * 100) = 75
        expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should display calculated rating score', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        // Math.round((4.8 / 5) * 100) = 96
        expect(screen.getByText('96')).toBeInTheDocument();
    });

    it('should display technical score', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        // technicalScore from mockWorker
        expect(screen.getByText('90')).toBeInTheDocument();
    });

    it('should use default technical score when not provided', () => {
        const workerWithoutTechnicalScore = {
            ...mockWorker,
            technicalScore: undefined,
        };
        render(<MatchScoreCard worker={workerWithoutTechnicalScore} report={mockReport} />);

        // Default: 80
        expect(screen.getByText('80')).toBeInTheDocument();
    });

    it('should apply color from match level', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        const scoreElement = screen.getByText('85');
        expect(scoreElement).toHaveStyle({ color: '#007AFF' });
    });

    it('should render with different match levels', () => {
        // Mock excellent level
        vi.mocked(matchScoreUtils.calculateMatchScore).mockReturnValue(95);
        vi.mocked(matchScoreUtils.getMatchLevel).mockReturnValue({
            level: 'excellent',
            label: '极佳',
            color: '#34C759'
        });

        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        expect(screen.getByText('95')).toBeInTheDocument();
        expect(screen.getByText('极佳')).toBeInTheDocument();
    });

    it('should render worker avatar when provided', () => {
        render(<MatchScoreCard worker={mockWorker} report={mockReport} />);

        const avatarDiv = document.querySelector('.w-12.h-12.rounded-full');
        expect(avatarDiv).toHaveStyle({
            backgroundImage: 'url(https://example.com/avatar.jpg)'
        });
    });

    it('should render without avatar when not provided', () => {
        const workerWithoutAvatar = {
            ...mockWorker,
            avatar: null,
        };
        render(<MatchScoreCard worker={workerWithoutAvatar} report={mockReport} />);

        const avatarDiv = document.querySelector('.w-12.h-12.rounded-full');
        expect(avatarDiv).toBeInTheDocument();
    });
});
