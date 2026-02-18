import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SuggestionList from './SuggestionList';
import ActivityCard from './ActivityCard';
import { LanguageProvider } from '../i18n/LanguageContext';

// Mock the hooks
const mockUsePosts = vi.fn();
const mockUseReports = vi.fn();

vi.mock('../hooks/useCommunity', () => ({
    usePosts: () => mockUsePosts(),
}));

vi.mock('../hooks/useReports', () => ({
    useReports: () => mockUseReports(),
}));

// Mock i18n
vi.mock('../i18n/LanguageContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../i18n/LanguageContext')>();
    return {
        ...actual,
        useLanguage: () => ({
            t: (key: string) => key,
            locale: 'en',
        }),
        LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

const createTestClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={createTestClient()}>
        <LanguageProvider>
            <MemoryRouter>
                {children}
            </MemoryRouter>
        </LanguageProvider>
    </QueryClientProvider>
);

describe('React Query Integration', () => {
    describe('SuggestionList', () => {
        it('renders loading state', () => {
            mockUsePosts.mockReturnValue({
                isLoading: true,
                data: null,
            });

            render(<SuggestionList />, { wrapper });
            // Look for loading skeletons (pulse animation classes)
            const skeletons = document.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('renders posts when data is available', () => {
            mockUsePosts.mockReturnValue({
                isLoading: false,
                data: {
                    posts: [
                        { id: 1, title: 'Test Post 1', image: 'test.jpg' },
                        { id: 2, title: 'Test Post 2' }
                    ]
                },
            });

            render(<SuggestionList />, { wrapper });
            expect(screen.getByText('Test Post 1')).toBeInTheDocument();
            expect(screen.getByText('Test Post 2')).toBeInTheDocument();
        });
    });

    describe('ActivityCard', () => {
        it('renders empty state when no reports', () => {
            mockUseReports.mockReturnValue({
                isLoading: false,
                data: { reports: [] },
            });

            render(<ActivityCard />, { wrapper });
            expect(screen.getByText('activity.title')).toBeInTheDocument();
            // Should show start new check button
            expect(screen.queryByText('activity.leakingPipe')).not.toBeInTheDocument();
        });

        it('renders active report when available', () => {
            mockUseReports.mockReturnValue({
                isLoading: false,
                data: {
                    reports: [
                        { id: 101, title: 'Broken Window', status: 'pending', image_urls: ['window.jpg'] }
                    ]
                },
            });

            render(<ActivityCard />, { wrapper });
            expect(screen.getByText('Broken Window')).toBeInTheDocument();
            expect(screen.getByText('pending')).toBeInTheDocument();
        });

        it('renders loading state', () => {
            mockUseReports.mockReturnValue({
                isLoading: true,
                data: null,
            });

            render(<ActivityCard />, { wrapper });
            const skeletons = document.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });
});
