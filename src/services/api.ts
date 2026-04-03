/**
 * API Client for House Maint AI Backend
 * Fully typed with generics and response interfaces
 */
import type {
    User,
    UserAsset,
    Report,
    Worker,
    Post,
    LoginResponse,
    ReportsResponse,
    PostsResponse,
    WorkersResponse,
    MatchesResponse,
    HealthResponse,
} from '../types';

// API Base URL - using relative path to work with Vite proxy
const API_BASE = '/api/v1';

// ─── CSRF Token Management ──────────────────────────────────────────
// Lazily fetched on first mutation and cached for the session.
let csrfToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;

    // Deduplicate concurrent fetches
    if (csrfFetchPromise) return csrfFetchPromise;

    csrfFetchPromise = fetch(`${API_BASE}/auth/csrf-token`, {
        credentials: 'include',
    })
        .then(res => res.json())
        .then(data => {
            csrfToken = data.csrfToken;
            csrfFetchPromise = null;
            return csrfToken!;
        })
        .catch(() => {
            csrfFetchPromise = null;
            // Fallback: return empty string so requests don't break in dev
            return '';
        });

    return csrfFetchPromise;
}

/** Call this after login/register to pre-warm the CSRF cache */
export async function refreshCsrfToken(): Promise<void> {
    csrfToken = null;
    await getCsrfToken();
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

    const token = await getCsrfToken();

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
        'X-CSRF-Token': token,
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

    // Handle 403 CSRF token expired — auto-refresh and retry once
    if (response.status === 403) {
        const errorBody = await response.json().catch(() => ({ error: 'Forbidden' }));
        if (errorBody.error?.includes('CSRF')) {
            // Clear cached token and re-fetch
            csrfToken = null;
            csrfFetchPromise = null;
            const newToken = await getCsrfToken();
            const retryHeaders = { ...headers, 'X-CSRF-Token': newToken };
            const retryResponse = await fetch(url, {
                ...options,
                headers: retryHeaders,
                credentials: 'include',
            });
            const retryResult = await retryResponse.json().catch(() => null);
            if (!retryResponse.ok) {
                throw new Error(retryResult?.error || 'API Error');
            }
            if (retryResult?.status === 'success' && retryResult.data !== undefined) {
                if (retryResult.message && typeof retryResult.data === 'object' && retryResult.data !== null) {
                    return { ...retryResult.data, message: retryResult.message } as T;
                }
                return retryResult.data as T;
            }
            return retryResult as T;
        }
        throw new Error(errorBody.error || 'Forbidden');
    }

    // Handle 401 Unauthorized (Token expired)
    if (response.status === 401) {
        // Don't retry if we're already trying to login or refresh
        if (endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh')) {
            const data = await response.json().catch(() => ({ error: 'Authentication failed' }));
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

    // Parse response — handle non-JSON gracefully
    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error(`Server error (${response.status})`);
    }

    if (!response.ok) {
        throw new Error(result.error || 'API Error');
    }

    // Auto-unwrap standardised ApiResponse.success wrapper
    if (result.status === 'success' && result.data !== undefined) {
        // If there's a message, we might want to attach it or just return the data
        // For backwards compatibility with functions expecting { message, user }, 
        // we merge message into data if data is an object.
        if (result.message && typeof result.data === 'object' && result.data !== null) {
            return { ...result.data, message: result.message } as T;
        }
        return result.data as T;
    }

    return result as T;
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
 * Get all available workers (pass all=true to get unavailable ones if admin)
 */
export async function getWorkers(skill?: string, all?: boolean): Promise<WorkersResponse> {
    const params = new URLSearchParams();
    if (skill) params.set('skill', skill);
    if (all) params.set('all', 'true');
    const qs = params.toString();
    return fetchAPI<WorkersResponse>(`/workers${qs ? `?${qs}` : ''}`);
}

/**
 * Get matched workers for a report
 */
export async function getMatchedWorkers(
    reportId?: number | string,
    options: { latitude?: number; longitude?: number; category?: string; limit?: number } = {}
): Promise<MatchesResponse> {
    const { latitude, longitude, category, limit = 5 } = options;
    let url = '/workers/match?';
    if (reportId) url += `report_id=${reportId}&`;
    if (latitude) url += `latitude=${latitude}&`;
    if (longitude) url += `longitude=${longitude}&`;
    if (category) url += `category=${category}&`;
    url += `limit=${limit}`;
    return fetchAPI<MatchesResponse>(url);
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

    const token = await getCsrfToken();

    const headers: Record<string, string> = {
        'X-CSRF-Token': token,
    };

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

// ============ Assets API ============

/**
 * Get user assets
 */
export async function getAssets(): Promise<{ assets: UserAsset[] }> {
    return fetchAPI<{ assets: UserAsset[] }>('/assets');
}

/**
 * Add a new asset
 */
export async function addAsset(assetData: Partial<UserAsset>): Promise<{ asset: UserAsset }> {
    return fetchAPI<{ asset: UserAsset }>('/assets', {
        method: 'POST',
        body: JSON.stringify(assetData),
    });
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: number | string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/assets/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Complete a report (Worker)
 */
export async function completeReport(id: number | string, resolutionDetails: any): Promise<{ report: Report }> {
    return fetchAPI<{ report: Report }>(`/reports/${id}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ resolution_details: resolutionDetails }),
    });
}

/**
 * Generate AI Repair Plan (DeepSeek)
 */
export async function generateRepairPlan(id: number | string): Promise<{ plan: string; provider: string }> {
    return fetchAPI<{ plan: string; provider: string }>(`/reports/${id}/plan`, {
        method: 'POST',
    });
}

/**
 * Worker accepts a job (matched → in_progress)
 */
export async function acceptJob(id: number | string): Promise<{ report: Report }> {
    return fetchAPI<{ report: Report }>(`/reports/${id}/accept`, {
        method: 'PUT',
    });
}

/**
 * Submit a review for a completed job
 */
export async function submitReview(data: {
    booking_id: number | string;
    rating: number;
    comment?: string;
    photos?: string[];
}): Promise<{ message: string; review: unknown }> {
    return fetchAPI<{ message: string; review: unknown }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Generic POST request
 */

// ============ Worker Dashboard API ============

/** Order available for workers to accept */
export interface AvailableOrder {
    id: number;
    title: string;
    description: string;
    category: string;
    urgency_score: number;
    distance_km: number | null;
    user_name: string;
    created_at: string;
    latitude?: number;
    longitude?: number;
}

/** Job assigned to current worker */
export interface WorkerJob {
    id: number;
    title: string;
    description: string;
    status: string;
    user_name: string;
    client_avatar?: string;
    category?: string;
    created_at: string;
}

/** Worker dashboard statistics */
export interface WorkerDashboardStats {
    earnings: number;
    jobsCompleted: number;
    activeJobs: number;
    rating: number;
}

export interface WorkerDashboardResponse {
    worker: Worker;
    stats: WorkerDashboardStats;
}

export interface WorkerRegistrationResponse {
    worker: { user_id: number; skills: string[]; id?: number };
}

/**
 * Get available orders for workers (with distance from worker's position)
 */
export async function getAvailableOrders(latitude?: number, longitude?: number): Promise<{ orders: AvailableOrder[] }> {
    const params = new URLSearchParams();
    if (latitude) params.set('latitude', String(latitude));
    if (longitude) params.set('longitude', String(longitude));
    const qs = params.toString();
    return fetchAPI<{ orders: AvailableOrder[] }>(`/reports/available${qs ? `?${qs}` : ''}`);
}

/**
 * Get jobs assigned to the current worker
 */
export async function getMyWorkerJobs(): Promise<{ jobs: WorkerJob[] }> {
    return fetchAPI<{ jobs: WorkerJob[] }>('/reports/my-jobs');
}

/**
 * Register as a worker (creates worker profile)
 */
export async function registerWorker(data: { skills: string[]; latitude?: number; longitude?: number }): Promise<WorkerRegistrationResponse> {
    return fetchAPI<WorkerRegistrationResponse>('/worker-portal/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get worker dashboard stats
 */
export async function getWorkerDashboard(): Promise<WorkerDashboardResponse> {
    return fetchAPI<WorkerDashboardResponse>('/worker-portal/dashboard');
}

/**
 * Toggle worker availability
 */
export async function updateWorkerAvailability(workerId: number | string, available: boolean): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/workers/${workerId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ available }),
    });
}

/**
 * Generic POST request
 */
export async function post<T = any>(endpoint: string, body: any): Promise<T> {
    return fetchAPI<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * Payments API
 */
export async function createCheckoutSession(amount: number, reportId: string | number): Promise<{ id: string; url: string }> {
    return post<{ id: string; url: string }>('/payments/checkout', { amount, reportId });
}

/**
 * Submit AI diagnosis feedback
 */
export async function submitAiFeedback(data: { diagnosisData?: any; isHelpful: boolean; comment?: string }): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>('/ai/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// ============ Orders API ============

interface Order {
    id: number;
    user_id: number;
    report_id?: number;
    stripe_session_id?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    receipt_url?: string;
    report_title?: string;
    created_at: string;
    updated_at?: string;
}

/**
 * Get user's payment orders
 */
export async function getOrders(): Promise<{ orders: Order[] }> {
    return fetchAPI<{ orders: Order[] }>('/payments/orders');
}

/**
 * Get a specific order
 */
export async function getOrder(id: number | string): Promise<{ order: Order }> {
    return fetchAPI<{ order: Order }>(`/payments/orders/${id}`);
}

// ============ Messages API ============

export async function getConversations(): Promise<{ conversations: any[] }> {
    return fetchAPI<{ conversations: any[] }>('/messages/conversations');
}

export async function getMessages(partnerId: number | string, before?: string): Promise<{ messages: any[] }> {
    const query = before ? `?before=${before}` : '';
    return fetchAPI<{ messages: any[] }>(`/messages/${partnerId}${query}`);
}

export async function sendMessage(data: { receiverId: number; content: string; reportId?: number }): Promise<{ message: any }> {
    return fetchAPI<{ message: any }>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// ============ Notifications API ============

export async function getNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    return fetchAPI<{ notifications: any[]; unreadCount: number }>('/notifications');
}

export async function markNotificationRead(id: number): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' });
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
    getAssets,
    addAsset,
    deleteAsset,
    completeReport,
    generateRepairPlan,
    post,
    createCheckoutSession,
    submitAiFeedback,
    getOrders,
    getOrder,
    getConversations,
    getMessages,
    sendMessage,
    getNotifications,
    markNotificationRead,
    refreshCsrfToken,
    acceptJob,
    submitReview,
    registerWorker,
    getWorkerDashboard,
    updateWorkerAvailability,
};
