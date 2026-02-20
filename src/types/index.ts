/**
 * Shared TypeScript types for House Maint AI
 */

// ============ User ============

export type UserRole = 'user' | 'worker' | 'admin' | 'manager' | 'tenant';

export interface User {
    id: number;
    name: string;
    phone: string;
    avatar?: string;
    role: UserRole;
    created_at?: string;
    updated_at?: string;
}

// ============ Worker ============

export interface Worker {
    id: number;
    user_id: number;
    name: string;
    avatar?: string | null;
    skills: string[];
    rating: number;
    total_jobs: number;
    distance: number;
    latitude?: number;
    longitude?: number;
    available: boolean;
    created_at?: string;
    // Computed match scores
    distanceScore?: number;
    technicalScore?: number;
    skillScore?: number;
    score?: number;
}

// ============ Report ============

export type ReportStatus = 'pending' | 'matching' | 'matched' | 'in_progress' | 'completed' | 'cancelled';

export interface Report {
    id: number;
    user_id: number;
    title: string;
    description: string;
    category?: string;
    voice_url?: string;
    video_url?: string;
    image_urls?: string[];
    status: ReportStatus;
    matched_worker_id?: number;
    latitude?: number;
    longitude?: number;
    created_at: string;
    updated_at?: string;
    // Computed / optional join fields
    requiredSkills?: string[];
}

// ============ Post (Community) ============

export interface Post {
    id: number;
    user_id: number;
    title: string;
    content: string;
    tags?: string[];
    likes: number;
    comments?: number;
    author_name?: string;
    author_avatar?: string;
    image?: string;
    created_at: string;
}

// ============ Match ============

export interface Match {
    id: number;
    report_id: number;
    worker_id: number;
    score: number;
    distance_score?: number;
    rating_score?: number;
    skill_score?: number;
    status: 'pending' | 'accepted' | 'rejected';
    created_at?: string;
}

// ============ Review ============

export interface Review {
    id: number;
    report_id: number;
    user_id: number;
    worker_id: number;
    rating: number;
    comment?: string;
    created_at?: string;
}

// ============ Match Level (UI) ============

export interface MatchLevel {
    level: string;
    label: string;
    color: string;
}

// ============ Recording Data ============

export interface RecordingData {
    duration: number;
    timestamp: string;
    maxWidth?: number;
    maxHeight?: number;
}

// ============ Progress Bar Segment ============

export interface Segment {
    name: string;
    progress: number;
}

// ============ Auth ============

export interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (phone: string, password: string) => Promise<AuthResult>;
    register: (phone: string, password: string, name: string) => Promise<AuthResult>;
    logout: () => void;
    updateUser: (data: { name?: string; avatar?: string }) => Promise<AuthResult>;
    clearError: () => void;
}

export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
}

// ============ API Responses ============

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    message?: string;
}

export interface UserAsset {
    id: number;
    user_id: number;
    type: string;
    name: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    purchase_date?: string;
    warranty_expiry?: string;
    specs?: string; // JSON string
    created_at: string;
}

export interface LoginResponse {
    message: string;
    user: User;
}

export interface ReportsResponse {
    reports: Report[];
    total?: number;
}

export interface PostsResponse {
    posts: Post[];
    total?: number;
}

export interface WorkersResponse {
    workers: Worker[];
}

export interface MatchesResponse {
    matches: Worker[];
    total: number;
}

export interface HealthResponse {
    status: string;
    timestamp: string;
    version: string;
}

// ============ AI / Diagnosis ============

export interface DiagnosisResult {
    diagnosis: {
        issue_identified: string;
        description: string;
        category: string;
        severity_score: number;
        safety_warning: string | null;
    };
    repair_steps: {
        step: number;
        action: string;
        detail: string;
        estimated_time: string;
    }[];
    estimated_price: string;
    tools_needed: string[];
    worker_matching_criteria: {
        required_skill: string;
        urgency: string;
        estimated_man_hours: string;
    };
}

export interface AnalysisResult {
    detected: boolean;
    issue_name?: string;
    issue_name_en?: string;
    description?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    confidence?: number;
}
