import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IMAGES } from '../constants/images';
import Header from '../components/Header';

describe('Header', () => {
    it('renders location and greeting text', () => {
        render(<Header />);
        expect(screen.getByText(/Good morning/i)).toBeInTheDocument();
        expect(screen.getByText(/San Francisco, CA/i)).toBeInTheDocument();
    });

    it('renders user avatar', () => {
        const { container } = render(<Header />);
        const avatar = container.querySelector(`[style*="${IMAGES.USER_AVATAR}"]`);
        expect(avatar).toBeInTheDocument();
    });

    it('has ARIA label for avatar', () => {
        const { container } = render(<Header />);
        const avatar = container.querySelector('[aria-label="User profile portrait smiling"]');
        expect(avatar).toBeInTheDocument();
    });
});
