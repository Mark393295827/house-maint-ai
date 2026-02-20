import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';

describe('Primitive SQL Test', () => {
    it('should perform basic SQLite operations', () => {
        console.log('Starting Primitive Test...');
        const db = new Database(':memory:');
        db.exec('CREATE TABLE test (id INTEGER)');
        db.exec('INSERT INTO test VALUES (100)');
        const result = db.prepare('SELECT id FROM test').get();
        console.log('Primitive Test Result:', result);
        expect((result as any).id).toBe(100);
    });
});
