import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import FeedbackCapture from './FeedbackCapture';
import { feedbackTracker } from '../../utils/feedbackTracker';

// Mock feedbackTracker
vi.mock('../../utils/feedbackTracker', () => ({
    feedbackTracker: {
        trackEvent: vi.fn().mockResolvedValue(true)
    }
}));

describe('FeedbackCapture', () => {
    const mockSubmit = vi.fn();

    it('renders thumbs up/down buttons initially', () => {
        render(<FeedbackCapture diagnosisId="test-id" onFeedbackSubmit={mockSubmit} />);

        expect(screen.getByLabelText('Helpful')).toBeInTheDocument();
        expect(screen.getByLabelText('Not helpful')).toBeInTheDocument();
    });

    it('opens comment form when rating is selected', async () => {
        render(<FeedbackCapture diagnosisId="test-id" onFeedbackSubmit={mockSubmit} />);

        fireEvent.click(screen.getByLabelText('Helpful'));

        expect(await screen.findByPlaceholderText('请告诉我们就如何改进...')).toBeInTheDocument();
        expect(feedbackTracker.trackEvent).toHaveBeenCalledWith('rating_explicit', expect.objectContaining({
            rating: 'positive'
        }));
    });

    it('submits feedback and shows success message', async () => {
        render(<FeedbackCapture diagnosisId="test-id" onFeedbackSubmit={mockSubmit} />);

        // Click rating
        fireEvent.click(screen.getByLabelText('Helpful'));

        // Enter comment
        const textarea = await screen.findByPlaceholderText('请告诉我们就如何改进...');
        fireEvent.change(textarea, { target: { value: 'Good work' } });

        // Submit
        const submitBtn = screen.getByText('提交反馈');
        fireEvent.click(submitBtn);

        // Verify success message
        expect(await screen.findByText('感谢您的反馈！')).toBeInTheDocument();
        expect(feedbackTracker.trackEvent).toHaveBeenCalledWith('rating_comment', expect.objectContaining({
            comment: 'Good work'
        }));

        // Wait for callback (takes > 2000ms in real code)
        // Increasing timeout for this specific wait
        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalled();
        }, { timeout: 3000 });
    });
});
