/**
 * Run All Tests
 * 
 * Execute all test suites for the framework scripts.
 */

import { execSync } from 'child_process';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧪 Running all framework tests...\n');

try {
    execSync('npm run test -- tests/', {
        cwd: projectRoot,
        stdio: 'inherit'
    });
    console.log('\n✅ All tests passed!');
} catch (_error) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
}
