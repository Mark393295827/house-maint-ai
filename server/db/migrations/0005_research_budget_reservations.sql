CREATE TABLE `research_budget_reservations` (
	`period_key` text PRIMARY KEY NOT NULL,
	`budget_cny` real NOT NULL,
	`reserved_cny` real DEFAULT 0 NOT NULL,
	`spent_cny` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now'))
);
