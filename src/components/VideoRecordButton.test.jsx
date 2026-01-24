import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VideoRecordButton from './VideoRecordButton';
import * as haptics from '../utils/haptics';

// Mock haptics module
vi.mock('../utils/haptics', () => ({
    hapticButtonPress: vi.fn(),
    hapticSuccess: vi.fn(),
    VIDEO_CONSTRAINTS: {
        maxDuration: 15,
        maxWidth: 1280,
        maxHeight: 720,
    },
}));

describe('VideoRecordButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render with initial state', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        expect(screen.getByText('最长 15 秒')).toBeInTheDocument();
        expect(screen.getByTestId('video-record-button')).toBeInTheDocument();
    });

    it('should trigger haptic on start recording', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        fireEvent.click(screen.getByTestId('video-record-button'));

        expect(haptics.hapticButtonPress).toHaveBeenCalledTimes(1);
    });

    it('should show recording state when clicked', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        fireEvent.click(screen.getByTestId('video-record-button'));

        expect(screen.getByText('点击停止录制')).toBeInTheDocument();
    });

    it('should display duration counter while recording', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        fireEvent.click(screen.getByTestId('video-record-button'));

        // Initial state
        expect(screen.getByTestId('video-duration')).toHaveTextContent('0s / 15s');

        // Advance 3 seconds
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(screen.getByTestId('video-duration')).toHaveTextContent('3s / 15s');
    });

    it('should display progress ring while recording', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        // Progress ring should not exist before recording
        expect(screen.queryByRole('graphics-symbol')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('video-record-button'));

        // SVG for progress ring should be present
        const button = screen.getByTestId('video-record-button');
        const container = button.closest('.relative');
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should trigger haptic success on stop recording', () => {
        const onRecordComplete = vi.fn();
        render(<VideoRecordButton onRecordComplete={onRecordComplete} />);

        // Start recording
        fireEvent.click(screen.getByTestId('video-record-button'));

        // Advance timer
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        // Stop recording
        fireEvent.click(screen.getByTestId('video-record-button'));

        expect(haptics.hapticSuccess).toHaveBeenCalledTimes(1);
    });

    it('should call onRecordComplete with metadata', () => {
        const onRecordComplete = vi.fn();
        render(<VideoRecordButton onRecordComplete={onRecordComplete} />);

        // Start recording
        fireEvent.click(screen.getByTestId('video-record-button'));

        // Advance timer by 5 seconds
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        // Stop recording
        fireEvent.click(screen.getByTestId('video-record-button'));

        expect(onRecordComplete).toHaveBeenCalledWith(
            expect.objectContaining({
                duration: expect.any(Number),
                maxWidth: 1280,
                maxHeight: 720,
                timestamp: expect.any(String)
            })
        );
    });

    it('should auto-stop at max duration', () => {
        const onRecordComplete = vi.fn();
        render(<VideoRecordButton onRecordComplete={onRecordComplete} maxDuration={5} />);

        // Start recording
        fireEvent.click(screen.getByTestId('video-record-button'));

        // Advance timer to max duration
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        // Should have auto-stopped and called onRecordComplete
        expect(haptics.hapticSuccess).toHaveBeenCalled();
        expect(onRecordComplete).toHaveBeenCalled();
    });

    it('should apply custom max duration', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} maxDuration={30} />);

        expect(screen.getByText('最长 30 秒')).toBeInTheDocument();
    });

    it('should toggle icon between videocam and stop', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        const button = screen.getByTestId('video-record-button');

        // Initial icon
        expect(button.querySelector('.material-symbols-outlined')).toHaveTextContent('videocam');

        // Click to start
        fireEvent.click(button);

        // Recording icon
        expect(button.querySelector('.material-symbols-outlined')).toHaveTextContent('stop');
    });

    it('should have correct aria-label for accessibility', () => {
        render(<VideoRecordButton onRecordComplete={() => { }} />);

        const button = screen.getByTestId('video-record-button');

        expect(button).toHaveAttribute('aria-label', '开始录制');

        fireEvent.click(button);

        expect(button).toHaveAttribute('aria-label', '停止录制');
    });
});
