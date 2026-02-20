CREATE TABLE `price_guide` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`task_name` text NOT NULL,
	`description` text,
	`base_price_low` real NOT NULL,
	`base_price_high` real NOT NULL,
	`unit` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `user_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`model` text,
	`serial_number` text,
	`purchase_date` text,
	`warranty_expiry` text,
	`specs` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `reports` ADD `matched_at` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `completed_at` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `resolution_details` text;