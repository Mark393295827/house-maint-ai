import { SQLiteFallback } from '../config/database.js';

/**
 * Creates an in-memory SQLite database for testing,
 * fully initialized with current schema.
 */
export const createTestDb = async () => {
    const adapter = new SQLiteFallback(':memory:');

    // SQLiteFallback.initSchema() loads schema.sql and blackboard.sql automatically
    await adapter.initSchema();

    return adapter;
};

/**
 * Cleanup helper for test database
 */
export const cleanupTestDb = async (adapter: any) => {
    // SQLite :memory: DBs are automatically cleaned up when the connection is closed
    // or when the process exits.
};
