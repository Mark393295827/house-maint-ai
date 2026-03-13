import app from '../index.js';
import request from 'supertest';

async function test() {
    try {
        console.log('--- Testing /api/v1/worker-portal/dashboard ---');
        // We simulate a request. We don't need a real token for the 404 check, 
        // as authenticate middleware should return 401, not 404.
        const res = await request(app).get('/api/v1/worker-portal/dashboard');
        console.log('Status:', res.status);
        if (res.status === 404) {
            console.log('Body:', res.body);
        } else {
            console.log('Route found! (Status might be 401 if unauthorized)');
        }
        
        console.log('\n--- Testing /api/v1/reports/available ---');
        const res2 = await request(app).get('/api/v1/reports/available');
        console.log('Status:', res2.status);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

test();
