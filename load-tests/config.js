/**
 * k6 Load Testing Configuration
 *
 * Shared configuration and utilities for load tests.
 */

// Base URL for API
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

// Test user credentials
export const TEST_USER = {
    phone: '13800138000',
    password: 'testpass123',
    name: 'Load Test User',
};

// Performance thresholds
export const THRESHOLDS = {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'],
    // 99% of requests should complete within 1s
    'http_req_duration{scenario:api_health}': ['p(99)<1000'],
};

// Standard load test stages
export const STAGES = {
    // Smoke test - minimal load
    smoke: [
        { duration: '1m', target: 5 },
        { duration: '1m', target: 0 },
    ],
    // Load test - normal expected load
    load: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
    ],
    // Stress test - beyond normal capacity
    stress: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
    ],
    // Spike test - sudden traffic spikes
    spike: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 500 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 500 },
        { duration: '1m', target: 0 },
    ],
};

/**
 * Generate random test data
 */
export function randomPhone() {
    return '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

export function randomName() {
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];
    return names[Math.floor(Math.random() * names.length)];
}
