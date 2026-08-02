import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Analytics from '../services/analytics';
import PageTracker from './PageTracker';

vi.mock('../services/analytics', () => ({
    default: {
        track: vi.fn(),
    },
}));

function NavigationHarness() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <>
            <PageTracker />
            <main id="main-content" tabIndex={-1}>
                <button type="button" onClick={() => navigate('#visualizations')}>
                    Open visualizations
                </button>
                <button type="button" onClick={() => navigate('/other')}>
                    Open other route
                </button>
                <output aria-label="current location">
                    {location.pathname}{location.hash}
                </output>
            </main>
        </>
    );
}

describe('PageTracker', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('does not reset focus or scroll for an in-page hash navigation', async () => {
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');

        render(
            <MemoryRouter initialEntries={['/enterprise/analytics']}>
                <NavigationHarness />
            </MemoryRouter>,
        );

        await waitFor(() => expect(Analytics.track).toHaveBeenCalledTimes(1));
        scrollTo.mockClear();
        focus.mockClear();
        vi.mocked(Analytics.track).mockClear();

        fireEvent.click(screen.getByRole('button', { name: 'Open visualizations' }));

        await screen.findByText('/enterprise/analytics#visualizations');
        expect(scrollTo).not.toHaveBeenCalled();
        expect(focus).not.toHaveBeenCalled();
        expect(Analytics.track).not.toHaveBeenCalled();
    });

    it('still resets focus and scroll when the route path changes', async () => {
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');

        render(
            <MemoryRouter initialEntries={['/enterprise/analytics']}>
                <NavigationHarness />
            </MemoryRouter>,
        );

        await waitFor(() => expect(Analytics.track).toHaveBeenCalledTimes(1));
        scrollTo.mockClear();
        focus.mockClear();
        vi.mocked(Analytics.track).mockClear();

        fireEvent.click(screen.getByRole('button', { name: 'Open other route' }));

        await screen.findByText('/other');
        await waitFor(() => expect(Analytics.track).toHaveBeenCalledTimes(1));
        expect(scrollTo).toHaveBeenCalledWith(0, 0);
        expect(focus).toHaveBeenCalled();
    });
});
