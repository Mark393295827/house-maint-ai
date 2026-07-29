import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { getOrder } from '../services/api';
import PaymentSuccessPage from './PaymentSuccessPage';

vi.mock('../services/api', () => ({
    getOrder: vi.fn(),
}));

const renderPage = (route: string) => render(
    <LanguageProvider>
        <MemoryRouter initialEntries={[route]}>
            <PaymentSuccessPage />
        </MemoryRouter>
    </LanguageProvider>,
);

describe('PaymentSuccessPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('app_locale', 'en');
    });

    it('never asserts success without a trusted order identifier', () => {
        renderPage('/payment/success?session_id=untrusted');

        expect(screen.getByRole('heading', { name: 'Payment not verified' })).toBeInTheDocument();
        expect(getOrder).not.toHaveBeenCalled();
    });

    it('shows a pending state for an unpaid order', async () => {
        vi.mocked(getOrder).mockResolvedValue({
            order: {
                id: 42,
                user_id: 7,
                amount: 9900,
                currency: 'cny',
                status: 'pending',
                created_at: '2026-07-29T00:00:00.000Z',
            },
        });

        renderPage('/payment/success?order_id=42');

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Payment pending' })).toBeInTheDocument();
        });
        expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    });

    it('asserts success only after the owner-scoped order API returns paid', async () => {
        vi.mocked(getOrder).mockResolvedValue({
            order: {
                id: 42,
                user_id: 7,
                amount: 9900,
                currency: 'cny',
                status: 'paid',
                created_at: '2026-07-29T00:00:00.000Z',
            },
        });

        renderPage('/payment/success?order_id=42');

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Payment Successful!' })).toBeInTheDocument();
        });
        expect(screen.getByText(/99\.00/)).toBeInTheDocument();
    });
});
