import 'dotenv/config';
import * as Sentry from '@sentry/node';
import './instrument.js'; // Ensure Sentry is configured
import { diagnosticsClaw } from './services/diagnostics_claw.js';
import { vendorClaw } from './services/vendor_claw.js';

// Setup basic error tracking for the worker process
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
});

const startWorkers = async () => {
    console.log('🚀 Starting House Maint AI Background Workers...');

    try {
        console.log('🤖 Starting Diagnostics Claw...');
        diagnosticsClaw.start();

        console.log('👷 Starting Vendor Claw...');
        vendorClaw.start();

        console.log('✅ All background workers started successfully.');
    } catch (error) {
        console.error('❌ Failed to start background workers:', error);
        Sentry.captureException(error);
        process.exit(1);
    }
};

startWorkers();

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down workers quietly...');
    process.exit(0);
});
