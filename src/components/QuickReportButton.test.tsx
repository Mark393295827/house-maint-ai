import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickReportButton from './QuickReportButton';
import * as haptics from '../utils/haptics';

// Mock haptics module
vi.mock('../utils/haptics', () => ({
    hapticButtonPress: vi.fn(),
    triggerHaptic: vi.fn(),
}));

describe('QuickReportButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render with default label', () => {
        render(<QuickReportButton onPress={() => { }} />);

        expect(screen.getByText('极速报修')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
        render(<QuickReportButton onPress={() => { }} label="紧急报修" />);

        expect(screen.getByText('紧急报修')).toBeInTheDocument();
    });

    it('should trigger haptic feedback on press', () => {
        const onPress = vi.fn();
        render(<QuickReportButton onPress={onPress} />);

        fireEvent.click(screen.getByTestId('quick-report-button'));

        expect(haptics.hapticButtonPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPress callback', () => {
        const onPress = vi.fn();
        render(<QuickReportButton onPress={onPress} />);

        fireEvent.click(screen.getByTestId('quick-report-button'));

        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should have correct accessibility attributes', () => {
        render(<QuickReportButton onPress={() => { }} />);

        const button = screen.getByTestId('quick-report-button');
        expect(button).toHaveClass('btn-action-primary');
    });

    it('should apply warning variant', () => {
        render(<QuickReportButton onPress={() => { }} variant="warning" />);

        const button = screen.getByTestId('quick-report-button');
        expect(button).toHaveClass('btn-action-warning');
    });
});
