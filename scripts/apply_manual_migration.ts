import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve('server/data/dev.db');
console.log('Opening database at:', dbPath);

const db = new Database(dbPath);

const migrationSql = `
CREATE TABLE IF NOT EXISTS \`price_guide\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`category\` text NOT NULL,
	\`task_name\` text NOT NULL,
	\`description\` text,
	\`base_price_low\` real NOT NULL,
	\`base_price_high\` real NOT NULL,
	\`unit\` text NOT NULL,
	\`created_at\` text DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS \`user_assets\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` integer NOT NULL,
	\`type\` text NOT NULL,
	\`name\` text NOT NULL,
	\`brand\` text,
	\`model\` text,
	\`serial_number\` text,
	\`purchase_date\` text,
	\`warranty_expiry\` text,
	\`specs\` text,
	\`created_at\` text DEFAULT (datetime('now')),
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);

-- Check if columns exist before adding them to avoid errors on re-run
PRAGMA table_info(reports);
`;

try {
    console.log('Running migration...');
    // Create new tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS \`price_guide\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`category\` text NOT NULL,
            \`task_name\` text NOT NULL,
            \`description\` text,
            \`base_price_low\` real NOT NULL,
            \`base_price_high\` real NOT NULL,
            \`unit\` text NOT NULL,
            \`created_at\` text DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS \`user_assets\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`user_id\` integer NOT NULL,
            \`type\` text NOT NULL,
            \`name\` text NOT NULL,
            \`brand\` text,
            \`model\` text,
            \`serial_number\` text,
            \`purchase_date\` text,
            \`warranty_expiry\` text,
            \`specs\` text,
            \`created_at\` text DEFAULT (datetime('now')),
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
        );
    `);
    console.log('Tables created.');

    // Add columns to reports if they don't exist
    const columns = db.prepare('PRAGMA table_info(reports)').all() as any[];
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('matched_at')) {
        db.exec("ALTER TABLE `reports` ADD `matched_at` text;");
        console.log('Added matched_at');
    }
    if (!columnNames.includes('completed_at')) {
        db.exec("ALTER TABLE `reports` ADD `completed_at` text;");
        console.log('Added completed_at');
    }
    if (!columnNames.includes('resolution_details')) {
        db.exec("ALTER TABLE `reports` ADD `resolution_details` text;");
        console.log('Added resolution_details');
    }

    console.log('Migration completed successfully.');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
