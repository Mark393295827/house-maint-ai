import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders without crashing', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getByRole('status', { hidden: true });
        expect(spinner).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
        const { container } = render(<LoadingSpinner />);
        const wrapper = container.firstChild;
        expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'h-screen');
    });

    it('contains animated spinner element', () => {
        const { container } = render(<LoadingSpinner />);
        const animatedElement = container.querySelector('.animate-spin');
        expect(animatedElement).toBeInTheDocument();
    });
});
