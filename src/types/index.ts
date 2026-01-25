/**
 * Shared TypeScript types for House Maint AI
 */

// User types
export interface User {
    id: string | number;
    name: string;
    phone: string;
    avatar?: string;
    role: 'user' | 'worker' | 'admin';
}

// Worker types
export interface Worker {
    id?: string | number;
    name: string;
    avatar?: string | null;
    distance: number;
    rating: number;
    skills?: string[];
    distanceScore?: number;
    technicalScore?: number;
}

// Report types
export interface Report {
    id?: string | number;
    requiredSkills?: string[];
    category?: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed';
}

// Match level types
export interface MatchLevel {
    level: string;
    label: string;
    color: string;
}

// Recording data
export interface RecordingData {
    duration: number;
    timestamp: string;
    maxWidth?: number;
    maxHeight?: number;
}

// Segment for progress bar
export interface Segment {
    name: string;
    progress: number;
}

// Auth context types
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

// API response types
export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    message?: string;
}

// Analysis result from AI
export interface AnalysisResult {
    detected: boolean;
    issue_name?: string;
    issue_name_en?: string;
    description?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    confidence?: number;
}
