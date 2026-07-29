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
interface FetchRetryState {
    authRefreshAttempted: boolean;
}

async function fetchAPI<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    retryState: FetchRetryState = { authRefreshAttempted: false }
): Promise<T> {
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

        if (retryState.authRefreshAttempted) {
            const data = await response.json().catch(() => ({ error: 'Session expired' }));
            throw new Error(data.error || 'Session expired');
        }

        if (isRefreshing) {
            // Queue this request
            return new Promise<T>((resolve, reject) => {
                refreshSubscribers.push((success) => {
                    if (success) {
                        resolve(fetchAPI<T>(endpoint, options, { authRefreshAttempted: true }));
                    } else {
                        reject(new Error('Session expired'));
                    }
                });
            });
        }

        isRefreshing = true;
        try {
            // Attempt to refresh
            await fetchAPI('/auth/refresh', { method: 'POST' }, { authRefreshAttempted: true });
            isRefreshing = false;
            onRefreshed(true);
            // Retry original request
            return fetchAPI<T>(endpoint, options, { authRefreshAttempted: true });
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
 * Bootstrap browser auth without treating an anonymous visitor as an error.
 */
export async function getSession(): Promise<{ user: User | null }> {
    return fetchAPI<{ user: User | null }>('/auth/session');
}

export async function refreshSession(): Promise<void> {
    await fetchAPI('/auth/refresh', { method: 'POST' }, { authRefreshAttempted: true });
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

export type AiEconomicsRange = '7d' | '30d' | '90d';

export interface AiEconomicsBreakdown {
    key: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    output_share_pct: number;
    total_to_output_ratio: number | null;
    cost_usd: number;
    cost_cny: number;
    estimated_business_value_cny: number;
    avg_duration_ms: number;
}

export interface AiEconomicsMetrics {
    period: {
        range: AiEconomicsRange;
        since: string;
        generated_at: string;
    };
    totals: AiEconomicsBreakdown & {
        return_on_inference: number | null;
        inference_to_value_pct: number | null;
        tier: 'excellent' | 'good' | 'marginal' | 'negative' | 'no_data';
        zero_cost_usage: boolean;
    };
    by_model: AiEconomicsBreakdown[];
    by_endpoint: AiEconomicsBreakdown[];
    daily: Array<{
        date: string;
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        cost_usd: number;
    }>;
}

export type CompanyAnalyticsRange = AiEconomicsRange;
export type CompanyAnalyticsMeasurement = 'measured' | 'estimated' | 'unavailable';
export type CompanyAnalyticsStage =
    | 'intake'
    | 'diagnosis'
    | 'deflection'
    | 'dispatch'
    | 'verification'
    | 'reporting';

export interface CompanyAnalyticsMetric {
    value: number | null;
    unit:
        | 'count'
        | 'percent'
        | 'score_10'
        | 'milliseconds'
        | 'hours'
        | 'cny'
        | 'cny_per_minute'
        | 'requests_per_minute'
        | 'ratio';
    measurement: CompanyAnalyticsMeasurement;
    sample_size: number;
    source: string;
    reason: string | null;
}

export interface CompanyAnalyticsOverview {
    meta: {
        range: CompanyAnalyticsRange;
        since: string;
        until: string;
        generated_at: string;
        formula_version: 'company-analytics-v1';
        freshness: 'live' | 'partial';
        access_issues: Array<{
            source: string;
            message: string;
        }>;
    };
    pulse: {
        active_work_orders: CompanyAnalyticsMetric;
        available_workers: CompanyAnalyticsMetric;
        satisfaction: CompanyAnalyticsMetric;
        sla_attainment_pct: CompanyAnalyticsMetric;
        deflection_rate_pct: CompanyAnalyticsMetric;
        first_time_fix_rate_pct: CompanyAnalyticsMetric;
        diagnosis_accuracy_pct: CompanyAnalyticsMetric;
        revenue_cny: CompanyAnalyticsMetric;
        gross_margin_pct: CompanyAnalyticsMetric;
    };
    operating_loop: Array<{
        stage: CompanyAnalyticsStage;
        order: 1 | 2 | 3 | 4 | 5 | 6;
        current_volume: CompanyAnalyticsMetric;
        conversion_to_next_pct: CompanyAnalyticsMetric;
        median_cycle_hours: CompanyAnalyticsMetric;
        exception_count: CompanyAnalyticsMetric;
    }>;
    strategic_dimensions: Array<{
        id: 'tam' | 'ten_x' | 'team' | 'financials';
        score: CompanyAnalyticsMetric;
        confidence: 'high' | 'medium' | 'low' | 'unavailable';
        formula_version: string;
        evidence_metric_ids: string[];
    }>;
    alerts: Array<{
        id: string;
        severity: 'critical' | 'warning' | 'info';
        owner: 'operations' | 'finance' | 'workforce' | 'quality';
        stage: CompanyAnalyticsStage | null;
        metric_id: string;
        metric: CompanyAnalyticsMetric;
        threshold: number;
        comparator: 'gt' | 'gte' | 'lt' | 'lte';
        recommendation_code: string;
        requires_human_approval: boolean;
        generated_at: string;
    }>;
    agent_operations: Array<{
        id: string;
        display_code: string;
        workflow_stage: CompanyAnalyticsStage | 'cross_stage';
        status: 'online' | 'idle' | 'offline';
        models: string[];
        calls: CompanyAnalyticsMetric;
        input_tokens: CompanyAnalyticsMetric;
        output_tokens: CompanyAnalyticsMetric;
        total_tokens: CompanyAnalyticsMetric;
        cost_cny: CompanyAnalyticsMetric;
        average_latency_ms: CompanyAnalyticsMetric;
        p95_latency_ms: CompanyAnalyticsMetric;
        success_rate_pct: CompanyAnalyticsMetric;
        last_active_at: string | null;
    }>;
    system_load: {
        observation_started_at: string;
        throughput_per_minute: CompanyAnalyticsMetric;
        success_rate_pct: CompanyAnalyticsMetric;
        average_latency_ms: CompanyAnalyticsMetric;
        p95_latency_ms: CompanyAnalyticsMetric;
        active_agents: CompanyAnalyticsMetric;
        utilization_pct: CompanyAnalyticsMetric;
        samples: Array<{
            timestamp: string;
            throughput_per_minute: number;
            success_rate_pct: number | null;
            average_latency_ms: number | null;
        }>;
    };
    efficiency: {
        ai_compute_share_pct: CompanyAnalyticsMetric;
        coordination_share_pct: CompanyAnalyticsMetric;
        idle_share_pct: CompanyAnalyticsMetric;
        cost_optimization_pct: CompanyAnalyticsMetric;
    };
    intelligence: {
        latest: null;
        measurement: 'unavailable';
        reason: string;
    };
}

export interface MarketResearchRequest {
    sector: string;
    focusArea?: string;
    currentTAM?: number;
    locale?: string;
}

export interface MarketResearchPreflight {
    state: 'available' | 'blocked' | 'unavailable';
    allowed: boolean;
    measurement: 'measured' | 'unavailable';
    period: string;
    budget_cny: number | null;
    reserved_cny: number | null;
    spent_cny: number | null;
    remaining_cny: number | null;
    estimated_run_cost_cny: number | null;
    reason_code:
        | 'research_budget_settings_missing'
        | 'research_budget_exhausted'
        | null;
}

export interface MarketResearchReport {
    sector: string;
    generated_at: string;
    pain_points: {
        sector: string;
        top_complaints: Array<{
            keyword: string;
            frequency_score: number;
            source: string;
            implication: string;
        }>;
        pain_density_score: number;
        primary_bottleneck: 'communication' | 'scheduling' | 'pricing' | 'quality' | 'trust';
        ai_intervention_point: string;
    };
    digital_vacuum: {
        sector: string;
        manual_hours_per_day: number;
        total_operational_hours: number;
        vacuum_ratio: number;
        vacuum_grade: 'A' | 'B' | 'C' | 'D';
        key_manual_processes: string[];
        automation_feasibility: number;
    };
    tam_expansion: {
        sector: string;
        current_tam_cny: number;
        ai_cost_reduction_pct: number;
        suppressed_demand_multiplier: number;
        expanded_tam_cny: number;
        long_tail_segments: string[];
        timeline_to_capture: string;
    };
    go_no_go: {
        incremental_demand: { pass: boolean; evidence: string };
        tenx_possibility: { pass: boolean; evidence: string };
        competitive_moat: { pass: boolean; evidence: string };
        overall_verdict: 'GO' | 'NO_GO' | 'NEEDS_MORE_DATA';
    };
    executive_summary: string;
    confidence_score: number;
}

/**
 * Get system metrics (admin only)
 */
export async function getMetrics(): Promise<unknown> {
    return fetchAPI('/metrics');
}

/**
 * Get measured token usage and estimated inference economics (manager/admin).
 */
export async function getAiEconomics(range: AiEconomicsRange = '30d'): Promise<AiEconomicsMetrics> {
    return fetchAPI<AiEconomicsMetrics>(`/metrics/ai-economics?range=${range}`);
}

/**
 * Get the company-wide operations and agent overview (manager/admin only).
 */
export async function getCompanyAnalyticsOverview(
    range: CompanyAnalyticsRange = '30d',
): Promise<CompanyAnalyticsOverview> {
    return fetchAPI<CompanyAnalyticsOverview>(`/analytics/company-overview?range=${range}`);
}

export async function getMarketResearchPreflight(): Promise<MarketResearchPreflight> {
    return fetchAPI<MarketResearchPreflight>('/ai/research-market/preflight');
}

/**
 * Explicitly execute the market-research swarm. This is never called on page load.
 */
export async function runMarketResearch(
    request: MarketResearchRequest,
): Promise<MarketResearchReport> {
    return fetchAPI<MarketResearchReport>('/ai/research-market', {
        method: 'POST',
        body: JSON.stringify(request),
    });
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
export async function generateRepairPlan(id: number | string): Promise<{ plan: unknown; provider: string }> {
    return fetchAPI<{ plan: unknown; provider: string }>(`/reports/${id}/plan`, {
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
    user?: User;
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

export interface Order {
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
    getSession,
    refreshSession,
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
    getAiEconomics,
    getCompanyAnalyticsOverview,
    getMarketResearchPreflight,
    runMarketResearch,
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
