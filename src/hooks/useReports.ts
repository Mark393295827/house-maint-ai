import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Report, ReportsResponse } from '../types';

export const useReports = (status?: string | null, limit: number = 20, offset: number = 0) => {
    return useQuery<ReportsResponse, Error>({
        queryKey: ['reports', status, limit, offset],
        queryFn: () => api.getReports(status, limit, offset),
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

export const useReport = (id: string | number) => {
    return useQuery<{ report: Report }, Error>({
        queryKey: ['report', id],
        queryFn: () => api.getReport(id),
        enabled: !!id,
    });
};

export const useCreateReport = () => {
    const queryClient = useQueryClient();

    return useMutation<{ report: Report }, Error, Partial<Report>>({
        mutationFn: (data) => api.createReport(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
    });
};

export const useUpdateReport = () => {
    const queryClient = useQueryClient();

    return useMutation<{ report: Report }, Error, { id: string | number; data: Partial<Report> }>({
        mutationFn: ({ id, data }) => api.updateReport(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['report', id] });
        },
    });
};
