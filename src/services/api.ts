/**
 * API Client for House Maint AI Backend
 * Fully typed with generics and response interfaces
 */
import type {
    User,
    Report,
    Worker,
    Post,
    LoginResponse,
    ReportsResponse,
    PostsResponse,
    WorkersResponse,
    HealthResponse,
} from '../types';

// API Base URL from environment variable with fallback to localhost
let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Force localhost for local development/testing to ensure stability
if (import.meta.env.DEV && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    API_BASE = 'http://localhost:3001/api';
}

// Refresh token state
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshed(success: boolean) {
    refreshSubscribers.forEach((cb) => cb(success));
    refreshSubscribers = [];
}

/**
 * Fetch wrapper with credentials, type safety, and auto-refresh
 */
async function fetchAPI<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    // Only set JSON Content-Type if body is not FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });

    // Handle 401 Unauthorized (Token expired)
    if (response.status === 401) {
        // Don't retry if we're already trying to login or refresh
        if (endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh')) {
            const data = await response.json();
            throw new Error(data.error || 'Authentication failed');
        }

        if (isRefreshing) {
            // Queue this request
            return new Promise<T>((resolve, reject) => {
                refreshSubscribers.push((success) => {
                    if (success) {
                        resolve(fetchAPI<T>(endpoint, options));
                    } else {
                        reject(new Error('Session expired'));
                    }
                });
            });
        }

        isRefreshing = true;
        try {
            // Attempt to refresh
            await fetchAPI('/auth/refresh', { method: 'POST' });
            isRefreshing = false;
            onRefreshed(true);
            // Retry original request
            return fetchAPI<T>(endpoint, options);
        } catch (error) {
            isRefreshing = false;
            onRefreshed(false);
            throw error; // Refresh failed, propagate error (UI should redirect to login)
        }
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API Error');
    }

    return data as T;
}

// ============ Auth API ============

/**
 * Register a new user
 */
export async function register(phone: string, password: string, name: string, role: string = 'user'): Promise<LoginResponse> {
    return fetchAPI<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, password, name, role }),
    });
}

/**
 * Login user
 */
export async function login(phone: string, password: string): Promise<LoginResponse> {
    return fetchAPI<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
    });
}

/**
 * Logout user (clears httpOnly cookie on server)
 */
export async function logout(): Promise<void> {
    try {
        await fetchAPI<{ message: string }>('/auth/logout', { method: 'POST' });
    } catch {
        // Logout should not throw even if server is unreachable
    }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{ user: User }> {
    return fetchAPI<{ user: User }>('/auth/me');
}

/**
 * Update user profile
 */
export async function updateProfile(name: string, avatar?: string): Promise<{ user: User }> {
    return fetchAPI<{ user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar }),
    });
}

// ============ Reports API ============

/**
 * Create a new report
 */
export async function createReport(reportData: Partial<Report>): Promise<{ report: Report }> {
    return fetchAPI<{ report: Report }>('/reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
    });
}

/**
 * Get all reports for current user
 */
export async function getReports(status?: string | null, limit: number = 20, offset: number = 0): Promise<ReportsResponse> {
    let url = `/reports?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    return fetchAPI<ReportsResponse>(url);
}

/**
 * Get a specific report
 */
export async function getReport(id: number | string): Promise<{ report: Report }> {
    return fetchAPI<{ report: Report }>(`/reports/${id}`);
}

/**
 * Update report status
 */
export async function updateReport(id: number | string, data: Partial<Report>): Promise<{ report: Report }> {
    return fetchAPI<{ report: Report }>(`/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Delete a report
 */
export async function deleteReport(id: number | string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/reports/${id}`, {
        method: 'DELETE',
    });
}

// ============ Workers API ============

/**
 * Get all available workers
 */
export async function getWorkers(skill?: string): Promise<WorkersResponse> {
    let url = '/workers';
    if (skill) url += `?skill=${skill}`;
    return fetchAPI<WorkersResponse>(url);
}

/**
 * Get matched workers for a report
 */
export async function getMatchedWorkers(
    reportId?: number | string,
    options: { latitude?: number; longitude?: number; category?: string; limit?: number } = {}
): Promise<WorkersResponse> {
    const { latitude, longitude, category, limit = 5 } = options;
    let url = '/workers/match?';
    if (reportId) url += `report_id=${reportId}&`;
    if (latitude) url += `latitude=${latitude}&`;
    if (longitude) url += `longitude=${longitude}&`;
    if (category) url += `category=${category}&`;
    url += `limit=${limit}`;
    return fetchAPI<WorkersResponse>(url);
}

/**
 * Get worker details
 */
export async function getWorker(id: number | string): Promise<{ worker: Worker }> {
    return fetchAPI<{ worker: Worker }>(`/workers/${id}`);
}

// ============ Upload API ============

interface UploadResponse {
    url: string;
    filename?: string;
}

/**
 * Upload a file
 */
async function uploadFile(type: string, file: File | Blob): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append(type, file);

    const url = `${API_BASE}/uploads/${type}`;

    const headers: Record<string, string> = {};

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
    }

    return data as UploadResponse;
}

/**
 * Upload voice recording
 */
export function uploadVoice(file: File | Blob): Promise<UploadResponse> {
    return uploadFile('voice', file);
}

/**
 * Upload video
 */
export function uploadVideo(file: File | Blob): Promise<UploadResponse> {
    return uploadFile('video', file);
}

/**
 * Upload image
 */
export function uploadImage(file: File | Blob): Promise<UploadResponse> {
    return uploadFile('image', file);
}

// ============ Community API ============

/**
 * Get community posts
 */
export async function getPosts(limit: number = 20, offset: number = 0): Promise<PostsResponse> {
    return fetchAPI<PostsResponse>(`/community/posts?limit=${limit}&offset=${offset}`);
}

/**
 * Create a post
 */
export async function createPost(postData: { title: string; content: string; tags?: string[] }): Promise<{ post: Post }> {
    return fetchAPI<{ post: Post }>('/community/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
    });
}

/**
 * Like a post
 */
export async function likePost(id: number | string): Promise<{ likes: number }> {
    return fetchAPI<{ likes: number }>(`/community/posts/${id}/like`, {
        method: 'POST',
    });
}

// ============ Metrics API ============

/**
 * Get system metrics (admin only)
 */
export async function getMetrics(): Promise<unknown> {
    return fetchAPI('/metrics');
}

/**
 * Get system health stats (admin only)
 */
export async function getMetricsHealth(): Promise<unknown> {
    return fetchAPI('/metrics/health');
}

// ============ Health Check ============

/**
 * Check API health
 */
export async function healthCheck(): Promise<HealthResponse> {
    return fetchAPI<HealthResponse>('/health');
}

export default {
    register,
    login,
    logout,
    getCurrentUser,
    updateProfile,
    createReport,
    getReports,
    getReport,
    updateReport,
    deleteReport,
    getWorkers,
    getMatchedWorkers,
    getWorker,
    uploadVoice,
    uploadVideo,
    uploadImage,
    getPosts,
    createPost,
    likePost,
    healthCheck,
    getMetrics,
    getMetricsHealth,
};
