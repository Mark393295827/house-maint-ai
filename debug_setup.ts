
process.env.NODE_ENV = 'test';
process.env.DB_USE_SQLITE = 'true';
process.env.SQLITE_DB_PATH = ':memory:';

import { setupTestDb } from './server/tests/integration/setup.js';

console.log('Running debug_setup.ts');

setupTestDb().then(() => {
    console.log('setupTestDb finished successfully');
}).catch((err) => {
    console.error('setupTestDb failed:', err);
});
