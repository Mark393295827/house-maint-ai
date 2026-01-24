/**
 * API Client for House Maint AI Backend
 */

const API_BASE = 'http://localhost:3001/api';

// Token storage
let authToken = localStorage.getItem('authToken');

/**
 * Set the auth token
 */
export function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

/**
 * Get the current auth token
 */
export function getAuthToken() {
    return authToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    return !!authToken;
}

/**
 * Fetch wrapper with auth headers
 */
async function fetchAPI(endpoint: string, options: any = {}) {
    const url = `${API_BASE}${endpoint}`;

    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API Error');
    }

    return data;
}

// ============ Auth API ============

/**
 * Register a new user
 */
export async function register(phone, password, name, role = 'user') {
    const data = await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, password, name, role }),
    });
    setAuthToken(data.token);
    return data;
}

/**
 * Login user
 */
export async function login(phone, password) {
    const data = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
    });
    setAuthToken(data.token);
    return data;
}

/**
 * Logout user
 */
export function logout() {
    setAuthToken(null);
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    return fetchAPI('/auth/me');
}

/**
 * Update user profile
 */
export async function updateProfile(name, avatar) {
    return fetchAPI('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar }),
    });
}

// ============ Reports API ============

/**
 * Create a new report
 */
export async function createReport(reportData) {
    return fetchAPI('/reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
    });
}

/**
 * Get all reports for current user
 */
export async function getReports(status, limit = 20, offset = 0) {
    let url = `/reports?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    return fetchAPI(url);
}

/**
 * Get a specific report
 */
export async function getReport(id) {
    return fetchAPI(`/reports/${id}`);
}

/**
 * Update report status
 */
export async function updateReport(id, data) {
    return fetchAPI(`/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Delete a report
 */
export async function deleteReport(id) {
    return fetchAPI(`/reports/${id}`, {
        method: 'DELETE',
    });
}

// ============ Workers API ============

/**
 * Get all available workers
 */
export async function getWorkers(skill) {
    let url = '/workers';
    if (skill) url += `?skill=${skill}`;
    return fetchAPI(url);
}

/**
 * Get matched workers for a report
 */
export async function getMatchedWorkers(reportId: any, { latitude, longitude, category, limit = 5 }: any = {}) {
    let url = '/workers/match?';
    if (reportId) url += `report_id=${reportId}&`;
    if (latitude) url += `latitude=${latitude}&`;
    if (longitude) url += `longitude=${longitude}&`;
    if (category) url += `category=${category}&`;
    url += `limit=${limit}`;
    return fetchAPI(url);
}

/**
 * Get worker details
 */
export async function getWorker(id) {
    return fetchAPI(`/workers/${id}`);
}

// ============ Upload API ============

/**
 * Upload a file
 */
async function uploadFile(type, file) {
    const formData = new FormData();
    formData.append(type, file);

    const url = `${API_BASE}/uploads/${type}`;

    const headers = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
    }

    return data;
}

/**
 * Upload voice recording
 */
export function uploadVoice(file) {
    return uploadFile('voice', file);
}

/**
 * Upload video
 */
export function uploadVideo(file) {
    return uploadFile('video', file);
}

/**
 * Upload image
 */
export function uploadImage(file) {
    return uploadFile('image', file);
}

// ============ Community API ============

/**
 * Get community posts
 */
export async function getPosts(limit = 20, offset = 0) {
    return fetchAPI(`/community/posts?limit=${limit}&offset=${offset}`);
}

/**
 * Create a post
 */
export async function createPost(postData) {
    return fetchAPI('/community/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
    });
}

/**
 * Like a post
 */
export async function likePost(id) {
    return fetchAPI(`/community/posts/${id}/like`, {
        method: 'POST',
    });
}

// ============ Health Check ============

/**
 * Check API health
 */
export async function healthCheck() {
    return fetchAPI('/health');
}

export default {
    setAuthToken,
    getAuthToken,
    isAuthenticated,
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
};
