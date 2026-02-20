import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { WorkersResponse, MatchesResponse } from '../types';

interface MatchOptions {
    reportId?: number | string;
    latitude?: number;
    longitude?: number;
    category?: string;
    limit?: number;
}

export const useWorkers = (skill?: string) => {
    return useQuery<WorkersResponse, Error>({
        queryKey: ['workers', skill],
        queryFn: () => api.getWorkers(skill),
    });
};

export const useMatchedWorkers = (options: MatchOptions) => {
    return useQuery<MatchesResponse, Error>({
        queryKey: ['matchedWorkers', options],
        queryFn: () => api.getMatchedWorkers(options.reportId, options),
        enabled: !!options.category || !!options.reportId, // Only fetch if we have enough info
        staleTime: 5 * 60 * 1000, // Cache matches for 5 minutes
    });
};

export const useWorker = (id: number | string) => {
    return useQuery({
        queryKey: ['worker', id],
        queryFn: () => api.getWorker(id),
        enabled: !!id,
    });
};
