import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VoiceRecordButton from './VoiceRecordButton';
import * as haptics from '../utils/haptics';

// Mock haptics module
vi.mock('../utils/haptics', () => ({
    hapticButtonPress: vi.fn(),
    hapticWarning: vi.fn(),
    triggerHaptic: vi.fn(),
}));

describe('VoiceRecordButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render with initial state', () => {
        render(<VoiceRecordButton onRecordComplete={() => { }} />);

        expect(screen.getByText('点击开始录音')).toBeInTheDocument();
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
    });

    it('should trigger haptic on start recording', () => {
        render(<VoiceRecordButton onRecordComplete={() => { }} />);

        fireEvent.click(screen.getByTestId('voice-record-button'));

        expect(haptics.hapticButtonPress).toHaveBeenCalledTimes(1);
    });

    it('should show recording state when clicked', () => {
        render(<VoiceRecordButton onRecordComplete={() => { }} />);

        fireEvent.click(screen.getByTestId('voice-record-button'));

        expect(screen.getByText('点击停止录音')).toBeInTheDocument();
    });

    it('should trigger haptic warning on stop recording', () => {
        const onRecordComplete = vi.fn();
        render(<VoiceRecordButton onRecordComplete={onRecordComplete} />);

        // Start recording
        fireEvent.click(screen.getByTestId('voice-record-button'));

        // Stop recording
        fireEvent.click(screen.getByTestId('voice-record-button'));

        expect(haptics.hapticWarning).toHaveBeenCalledTimes(1);
    });

    it('should call onRecordComplete with duration', () => {
        const onRecordComplete = vi.fn();
        render(<VoiceRecordButton onRecordComplete={onRecordComplete} />);

        // Start recording
        fireEvent.click(screen.getByTestId('voice-record-button'));

        // Advance timer by 3 seconds
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        // Stop recording
        fireEvent.click(screen.getByTestId('voice-record-button'));

        expect(onRecordComplete).toHaveBeenCalledWith(
            expect.objectContaining({
                duration: expect.any(Number),
                timestamp: expect.any(String)
            })
        );
    });

    it('should apply recording-pulse class when recording', () => {
        render(<VoiceRecordButton onRecordComplete={() => { }} />);

        const button = screen.getByTestId('voice-record-button');

        // Before recording
        expect(button).not.toHaveClass('recording-pulse');

        // Start recording
        fireEvent.click(button);

        // After recording starts
        expect(button).toHaveClass('recording-pulse');
    });
});
