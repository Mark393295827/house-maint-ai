/**
 * Typed model interfaces derived from the Drizzle schema (server/db/schema.ts).
 * Use these everywhere instead of `any` to get compile-time safety.
 */

// ─── Users ──────────────────────────────────────────────────────────
export interface UserRow {
    id: number;
    phone: string | null;
    wechat_openid: string | null;
    wechat_unionid: string | null;
    wechat_session_key: string | null;
    password_hash: string;
    name: string;
    avatar: string | null;
    role: 'user' | 'worker' | 'admin' | 'manager' | 'tenant';
    created_at: string;
    updated_at: string;
}

// ─── Workers ────────────────────────────────────────────────────────
export interface WorkerRow {
    id: number;
    user_id: number;
    skills: string;          // JSON array stored as text
    rating: number;
    total_jobs: number;
    latitude: number | null;
    longitude: number | null;
    available: number;       // SQLite boolean (0 | 1)
    created_at: string;
}

/** WorkerRow joined with user fields (common in queries) */
export interface WorkerWithUser extends WorkerRow {
    name: string;
    phone: string | null;
    avatar: string | null;
}

// ─── Reports ────────────────────────────────────────────────────────
export type ReportStatus = 'pending' | 'matching' | 'broadcasted' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'failed_analysis';
export type SeverityTag = 'diy' | '48h' | 'emergency';
export type ReportCategory = 'plumbing' | 'electrical' | 'appliance' | 'carpentry' | 'painting' | 'other';

export interface ReportRow {
    id: number;
    user_id: number;
    title: string;
    description: string;
    category: ReportCategory | null;
    voice_url: string | null;
    video_url: string | null;
    image_urls: string | null;     // JSON array stored as text
    status: ReportStatus;
    matched_worker_id: number | null;
    latitude: number | null;
    longitude: number | null;
    matched_at: string | null;
    completed_at: string | null;
    resolution_details: string | null; // JSON stored as text
    severity_tag: SeverityTag;
    urgency_score?: number;
    diagnosis_correct: boolean | null;
    first_time_fix: boolean | null;
    created_at: string;
    updated_at: string;
}

// ─── Matches ────────────────────────────────────────────────────────
export interface MatchRow {
    id: number;
    report_id: number;
    worker_id: number;
    score: number;
    distance_score: number | null;
    rating_score: number | null;
    skill_score: number | null;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

// ─── Reviews ────────────────────────────────────────────────────────
export interface ReviewRow {
    id: number;
    report_id: number;
    user_id: number;
    worker_id: number;
    rating: number;
    comment: string | null;
    photos: string | null;    // JSON array stored as text
    created_at: string;
}

// ─── User Assets ────────────────────────────────────────────────────
export interface UserAssetRow {
    id: number;
    user_id: number;
    type: string;
    name: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    purchase_date: string | null;
    warranty_expiry: string | null;
    specs: string | null;
    created_at: string;
}

// ─── Messages ───────────────────────────────────────────────────────
export interface MessageRow {
    id: number;
    sender_id: number;
    receiver_id: number;
    report_id: number | null;
    content: string;
    read_at: string | null;
    created_at: string;
}

// ─── Notifications ──────────────────────────────────────────────────
export type NotificationType = 'job_update' | 'message' | 'payment' | 'system';

export interface NotificationRow {
    id: number;
    user_id: number;
    type: NotificationType;
    title: string;
    body: string | null;
    data: string | null;     // JSON stored as text
    read_at: string | null;
    created_at: string;
}

// ─── Orders ─────────────────────────────────────────────────────────
export interface OrderRow {
    id: number;
    user_id: number;
    report_id: number | null;
    stripe_session_id: string | null;
    wechat_out_trade_no: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    receipt_url: string | null;
    created_at: string;
    updated_at: string;
}

// ─── AI Tables ──────────────────────────────────────────────────────
export interface AiUsageLogRow {
    id: number;
    user_id: number | null;
    model_name: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
    endpoint: string | null;
    duration_ms: number | null;
    created_at: string;
}

// ─── Patterns (AI Learning) ─────────────────────────────────────────
export interface PatternRow {
    id: number;
    problem_type: string;
    context_signature: string;
    solution: string;          // JSON stored as text
    success_rate: number;
    usage_count: number;
    last_used: string;
    created_at: string;
}
