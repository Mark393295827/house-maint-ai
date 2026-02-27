/**
 * React Query Client Configuration
 * Centralized query client with sensible defaults for caching and retries.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,  // 5 minutes before data is considered stale
            retry: 1,                   // Retry failed queries once
            refetchOnWindowFocus: false, // Don't refetch when user returns to tab
        },
        mutations: {
            retry: 0,                   // Don't retry mutations
        },
    },
});
