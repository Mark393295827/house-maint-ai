import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('server/data/dev.db');
console.log('Opening database at:', dbPath);

const db = new Database(dbPath);

const migrationSql = `
CREATE TABLE IF NOT EXISTS \`cases\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`user_id\` integer,
    \`title\` text NOT NULL,
    \`title_en\` text NOT NULL,
    \`status\` text DEFAULT 'active',
    \`step\` integer DEFAULT 1,
    \`severity\` text DEFAULT 'moderate',
    \`date\` text NOT NULL,
    \`category\` text,
    \`root_cause\` text,
    \`solution\` text,
    \`full_data\` text,
    \`created_at\` text DEFAULT (datetime('now')),
    \`updated_at\` text DEFAULT (datetime('now')),
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`agent_sessions\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`user_id\` integer,
    \`channel\` text NOT NULL,
    \`external_id\` text NOT NULL,
    \`context\` text,
    \`last_active\` text DEFAULT (datetime('now')),
    \`created_at\` text DEFAULT (datetime('now')),
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS \`device_nodes\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`user_id\` integer,
    \`name\` text NOT NULL,
    \`type\` text NOT NULL,
    \`status\` text DEFAULT 'offline',
    \`metadata\` text,
    \`last_seen\` text DEFAULT (datetime('now')),
    \`created_at\` text DEFAULT (datetime('now')),
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
`;

try {
    console.log('Running agentic migration...');
    db.exec(migrationSql);
    console.log('Migration completed successfully.');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
