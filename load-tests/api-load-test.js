/**
 * k6 Load Test for House Maint AI API
 *
 * Usage:
 *   k6 run load-tests/api-load-test.js
 *   k6 run --env BASE_URL=http://api.example.com load-tests/api-load-test.js
 *   k6 run --env SCENARIO=stress load-tests/api-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, STAGES, randomPhone, randomName } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');
const authDuration = new Trend('auth_duration');
const workersDuration = new Trend('workers_duration');

// Select scenario based on environment variable
const scenario = __ENV.SCENARIO || 'load';

export const options = {
    stages: STAGES[scenario] || STAGES.load,
    thresholds: {
        ...THRESHOLDS,
        errors: ['rate<0.05'],
    },
    // Tag all requests with scenario name
    tags: {
        scenario: scenario,
    },
};

// Setup: Create test user and get auth token
export function setup() {
    const phone = randomPhone();
    const password = 'loadtest123';
    const name = randomName();

    // Register a test user
    const registerRes = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({ phone, password, name }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (registerRes.status === 201 || registerRes.status === 200) {
        const data = registerRes.json();
        return {
            token: data.token,
            user: data.user,
            phone,
            password,
        };
    }

    // If registration fails (user exists), try to login
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ phone, password }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status === 200) {
        const data = loginRes.json();
        return {
            token: data.token,
            user: data.user,
            phone,
            password,
        };
    }

    console.warn('Failed to setup test user');
    return { token: null, phone, password };
}

export default function (data) {
    const authHeaders = data.token
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` }
        : { 'Content-Type': 'application/json' };

    // Group 1: Health Check
    group('API Health', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/health`);
        healthCheckDuration.add(Date.now() - start);

        const success = check(res, {
            'health check status is 200': (r) => r.status === 200,
            'health check returns ok': (r) => r.json('status') === 'ok',
        });
        errorRate.add(!success);
    });

    sleep(0.5);

    // Group 2: Workers Listing
    group('Workers API', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/workers`);
        workersDuration.add(Date.now() - start);

        const success = check(res, {
            'workers status is 200': (r) => r.status === 200,
            'workers returns array': (r) => Array.isArray(r.json('workers') || r.json()),
        });
        errorRate.add(!success);
    });

    sleep(0.5);

    // Group 3: Authentication (if token available)
    if (data.token) {
        group('Authenticated Requests', function () {
            const start = Date.now();
            const res = http.get(`${BASE_URL}/auth/me`, { headers: authHeaders });
            authDuration.add(Date.now() - start);

            const success = check(res, {
                'auth me status is 200': (r) => r.status === 200,
                'auth me returns user': (r) => r.json('user') !== undefined,
            });
            errorRate.add(!success);
        });

        sleep(0.5);

        // Group 4: Reports (authenticated)
        group('Reports API', function () {
            const res = http.get(`${BASE_URL}/reports`, { headers: authHeaders });

            check(res, {
                'reports status is 200': (r) => r.status === 200,
            });
        });
    }

    // Group 5: Community Posts (public)
    group('Community API', function () {
        const res = http.get(`${BASE_URL}/community/posts`);

        check(res, {
            'community posts status is 200': (r) => r.status === 200,
        });
    });

    // Random sleep between iterations (1-3 seconds)
    sleep(1 + Math.random() * 2);
}

// Teardown: Log results
export function teardown(data) {
    console.log(`Load test completed for scenario: ${scenario}`);
    if (data.phone) {
        console.log(`Test user phone: ${data.phone}`);
    }
}
