import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentCheckout from './PaymentCheckout';

const { createCheckoutSessionMock } = vi.hoisted(() => ({
    createCheckoutSessionMock: vi.fn(),
}));

vi.mock('../services/api', () => ({
    default: {
        createCheckoutSession: createCheckoutSessionMock,
    },
}));

vi.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            if (key === 'payment.processing') return 'Processing...';
            if (key === 'payment.payNow') return 'Pay now';
            return key;
        },
    }),
}));

describe('PaymentCheckout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createCheckoutSessionMock.mockResolvedValue({
            id: 'order_123',
            url: 'https://example.com/payment/success?session_id=order_123',
        });
        vi.spyOn(window.location, 'assign').mockImplementation(() => {});
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('renders the payment CTA with the requested amount', () => {
        render(<PaymentCheckout amount={88} reportId={42} />);

        expect(screen.getByRole('button', { name: 'Pay now $88' })).toBeInTheDocument();
    });

    it('redirects to the checkout URL returned by the backend', async () => {
        render(<PaymentCheckout amount={88} reportId={42} />);

        fireEvent.click(screen.getByRole('button', { name: 'Pay now $88' }));

        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByRole('button')).toHaveTextContent('Processing...');

        await waitFor(() => {
            expect(createCheckoutSessionMock).toHaveBeenCalledWith(88, 42);
            expect(window.location.assign).toHaveBeenCalledWith('https://example.com/payment/success?session_id=order_123');
        });
    });

    it('alerts the user when the payment provider does not return a redirect URL', async () => {
        createCheckoutSessionMock.mockResolvedValueOnce({ id: 'order_123' });
        render(<PaymentCheckout amount={88} reportId={42} />);

        fireEvent.click(screen.getByRole('button', { name: 'Pay now $88' }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to initialize payment.');
        });

        expect(window.location.assign).not.toHaveBeenCalled();
        expect(screen.getByRole('button')).not.toBeDisabled();
    });
});
