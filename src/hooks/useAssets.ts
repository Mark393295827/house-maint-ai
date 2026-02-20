import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { UserAsset } from '../types';

export const useAssets = () => {
    return useQuery<{ assets: UserAsset[] }, Error>({
        queryKey: ['assets'],
        queryFn: () => api.getAssets(),
    });
};

export const useAddAsset = () => {
    const queryClient = useQueryClient();

    return useMutation<{ asset: UserAsset }, Error, Partial<UserAsset>>({
        mutationFn: (data) => api.addAsset(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
};

export const useDeleteAsset = () => {
    const queryClient = useQueryClient();

    return useMutation<{ message: string }, Error, number | string>({
        mutationFn: (id) => api.deleteAsset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
};
