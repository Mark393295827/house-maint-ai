CREATE TABLE `pheromone_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer,
	`actor` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pheromone_task_id` ON `pheromone_events` (`task_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'new',
	`priority` text DEFAULT 'medium',
	`owner_claw` text,
	`inputs` text,
	`outputs` text,
	`score` real DEFAULT 0,
	`failure_reason` text,
	`retry_count` integer DEFAULT 0,
	`max_retries` integer DEFAULT 3,
	`parent_task_id` integer,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_owner` ON `tasks` (`owner_claw`);