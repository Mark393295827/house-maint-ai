CREATE TABLE `agent_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`channel` text NOT NULL,
	`external_id` text NOT NULL,
	`context` text,
	`last_active` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`report_id` integer,
	`diagnosis_data` text,
	`is_helpful` integer,
	`rating` integer,
	`type` text,
	`comment` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `ai_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `ai_usage_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`model_name` text NOT NULL,
	`input_tokens` integer DEFAULT 0,
	`output_tokens` integer DEFAULT 0,
	`total_tokens` integer DEFAULT 0,
	`cost_usd` real DEFAULT 0,
	`endpoint` text,
	`duration_ms` integer,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`title` text NOT NULL,
	`title_en` text NOT NULL,
	`status` text DEFAULT 'active',
	`step` integer DEFAULT 1,
	`severity` text DEFAULT 'moderate',
	`date` text NOT NULL,
	`category` text,
	`root_cause` text,
	`solution` text,
	`full_data` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `device_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'offline',
	`metadata` text,
	`last_seen` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fault_attributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer,
	`attribution` text NOT NULL,
	`confidence_score` real NOT NULL,
	`evidence` text NOT NULL,
	`reasoning` text NOT NULL,
	`legal_reference` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` integer NOT NULL,
	`receiver_id` integer NOT NULL,
	`report_id` integer,
	`content` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`data` text,
	`read_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`report_id` integer,
	`worker_id` integer,
	`stripe_session_id` text,
	`wechat_out_trade_no` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'cny',
	`status` text DEFAULT 'pending',
	`receipt_url` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_wechat_out_trade_no_unique` ON `orders` (`wechat_out_trade_no`);--> statement-breakpoint
CREATE TABLE `turnover_inspections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` text,
	`property_name` text,
	`inspection_type` text NOT NULL,
	`overall_condition` text,
	`damage_report` text,
	`before_image_urls` text,
	`after_image_urls` text,
	`cleanliness_score` integer,
	`estimated_damage_cost` real,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
-- Drizzle runs SQLite migrations in a transaction, where foreign_keys cannot be disabled.
-- Preserve rows that could otherwise be cascaded by the generated users table rebuild.
CREATE TEMP TABLE `__backup_workers` AS SELECT * FROM `workers`;--> statement-breakpoint
CREATE TEMP TABLE `__backup_reports` AS SELECT * FROM `reports`;--> statement-breakpoint
CREATE TEMP TABLE `__backup_matches` AS SELECT * FROM `matches`;--> statement-breakpoint
CREATE TEMP TABLE `__backup_reviews` AS SELECT * FROM `reviews`;--> statement-breakpoint
CREATE TEMP TABLE `__backup_posts` AS SELECT * FROM `posts`;--> statement-breakpoint
CREATE TEMP TABLE `__backup_refresh_tokens` AS SELECT * FROM `refresh_tokens`;--> statement-breakpoint
CREATE TEMP TABLE `__backup_user_assets` AS SELECT * FROM `user_assets`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text,
	`wechat_openid` text,
	`wechat_unionid` text,
	`wechat_session_key` text,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`role` text DEFAULT 'user',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "phone", "password_hash", "name", "avatar", "role", "created_at", "updated_at") SELECT "id", "phone", "password_hash", "name", "avatar", "role", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_wechat_openid_unique` ON `users` (`wechat_openid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_wechat_unionid_unique` ON `users` (`wechat_unionid`);--> statement-breakpoint
INSERT OR IGNORE INTO `workers` SELECT * FROM `__backup_workers`;--> statement-breakpoint
INSERT OR IGNORE INTO `reports` SELECT * FROM `__backup_reports`;--> statement-breakpoint
INSERT OR IGNORE INTO `matches` SELECT * FROM `__backup_matches`;--> statement-breakpoint
INSERT OR IGNORE INTO `reviews` SELECT * FROM `__backup_reviews`;--> statement-breakpoint
INSERT OR IGNORE INTO `posts` SELECT * FROM `__backup_posts`;--> statement-breakpoint
INSERT OR IGNORE INTO `refresh_tokens` SELECT * FROM `__backup_refresh_tokens`;--> statement-breakpoint
INSERT OR IGNORE INTO `user_assets` SELECT * FROM `__backup_user_assets`;--> statement-breakpoint
DROP TABLE `__backup_workers`;--> statement-breakpoint
DROP TABLE `__backup_reports`;--> statement-breakpoint
DROP TABLE `__backup_matches`;--> statement-breakpoint
DROP TABLE `__backup_reviews`;--> statement-breakpoint
DROP TABLE `__backup_posts`;--> statement-breakpoint
DROP TABLE `__backup_refresh_tokens`;--> statement-breakpoint
DROP TABLE `__backup_user_assets`;--> statement-breakpoint
ALTER TABLE `patterns` ADD `performance_score` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `patterns` ADD `consecutive_high_ratings` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `patterns` ADD `status` text DEFAULT 'experimental';--> statement-breakpoint
ALTER TABLE `patterns` ADD `is_variant` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `patterns` ADD `generation_version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `reports` ADD `diagnosis_result` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `issue_type` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `severity` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `diagnosis_summary` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `confidence_score` real;--> statement-breakpoint
ALTER TABLE `reports` ADD `priority_protocol` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `estimated_arrival` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `resolution_plan` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `pattern_id` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `urgency_score` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `reports` ADD `match_score` real;--> statement-breakpoint
ALTER TABLE `reports` ADD `severity_tag` text DEFAULT '48h';--> statement-breakpoint
ALTER TABLE `reports` ADD `diagnosis_correct` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `first_time_fix` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `pattern_extracted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `reviews` ADD `photos` text;--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_report_id_unique` ON `reviews` (`report_id`);--> statement-breakpoint
ALTER TABLE `workers` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `workers` ADD `hourly_rate` real;
