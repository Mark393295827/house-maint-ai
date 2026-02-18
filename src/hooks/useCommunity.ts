import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Post, PostsResponse } from '../types';

export const usePosts = (limit: number = 20, offset: number = 0) => {
    return useQuery<PostsResponse, Error>({
        queryKey: ['posts', limit, offset],
        queryFn: () => api.getPosts(limit, offset),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useCreatePost = () => {
    const queryClient = useQueryClient();

    return useMutation<{ post: Post }, Error, { title: string; content: string; tags?: string[] }>({
        mutationFn: (newPost) => api.createPost(newPost),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
};

export const useLikePost = () => {
    const queryClient = useQueryClient();

    return useMutation<{ likes: number }, Error, number | string>({
        mutationFn: (id) => api.likePost(id),
        onSuccess: () => {
            // Optimistic update could be implemented here, but invalidating is safer for now
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
};
