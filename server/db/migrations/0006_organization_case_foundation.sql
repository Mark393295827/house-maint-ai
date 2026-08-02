CREATE TABLE `case_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`case_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`event_type` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`reducer_version` integer DEFAULT 1 NOT NULL,
	`actor_type` text NOT NULL,
	`actor_membership_id` integer,
	`idempotency_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`payload_hash` text NOT NULL,
	`projection_patch_json` text NOT NULL,
	`payload_json` text NOT NULL,
	`correlation_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`case_id`) REFERENCES `maintenance_cases`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`actor_membership_id`) REFERENCES `organization_memberships`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "case_events_ids_positive" CHECK("case_events"."id" > 0 and "case_events"."organization_id" > 0 and "case_events"."case_id" > 0 and ("case_events"."actor_membership_id" is null or "case_events"."actor_membership_id" > 0)),
	CONSTRAINT "case_events_versions_check" CHECK("case_events"."sequence" > 0 and "case_events"."schema_version" > 0 and "case_events"."reducer_version" = 1),
	CONSTRAINT "case_events_type_check" CHECK("case_events"."event_type" in ('case_opened', 'legacy_imported', 'case_updated', 'case_stage_changed', 'case_resolved', 'case_closed', 'case_cancelled', 'case_reopened')),
	CONSTRAINT "case_events_actor_check" CHECK("case_events"."actor_type" in ('member', 'system', 'agent', 'integration')),
	CONSTRAINT "case_events_member_actor_check" CHECK("case_events"."actor_type" <> 'member' or "case_events"."actor_membership_id" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_case_events_org_case_sequence` ON `case_events` (`organization_id`,`case_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_case_events_correlation` ON `case_events` (`correlation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `case_events_case_sequence_unique` ON `case_events` (`case_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `case_events_case_idempotency_unique` ON `case_events` (`case_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `maintenance_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`property_id` integer,
	`unit_id` integer,
	`opened_by_membership_id` integer,
	`legacy_report_id` integer,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`stage` text DEFAULT 'intake' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`closed_at` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`legacy_report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`,`property_id`) REFERENCES `properties`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`property_id`,`unit_id`) REFERENCES `units`(`organization_id`,`property_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`opened_by_membership_id`) REFERENCES `organization_memberships`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "maintenance_cases_ids_positive" CHECK("maintenance_cases"."id" > 0 and "maintenance_cases"."organization_id" > 0 and ("maintenance_cases"."property_id" is null or "maintenance_cases"."property_id" > 0) and ("maintenance_cases"."unit_id" is null or "maintenance_cases"."unit_id" > 0) and ("maintenance_cases"."opened_by_membership_id" is null or "maintenance_cases"."opened_by_membership_id" > 0) and ("maintenance_cases"."legacy_report_id" is null or "maintenance_cases"."legacy_report_id" > 0)),
	CONSTRAINT "maintenance_cases_status_check" CHECK("maintenance_cases"."status" in ('open', 'resolved', 'closed', 'cancelled')),
	CONSTRAINT "maintenance_cases_stage_check" CHECK("maintenance_cases"."stage" in ('intake', 'diagnosis', 'resolution', 'dispatch', 'repair', 'verification', 'closed')),
	CONSTRAINT "maintenance_cases_priority_check" CHECK("maintenance_cases"."priority" in ('low', 'normal', 'urgent', 'emergency')),
	CONSTRAINT "maintenance_cases_version_check" CHECK("maintenance_cases"."version" >= 0),
	CONSTRAINT "maintenance_cases_unit_property_check" CHECK("maintenance_cases"."unit_id" is null or "maintenance_cases"."property_id" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_maintenance_cases_org_status_updated` ON `maintenance_cases` (`organization_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_maintenance_cases_org_property_unit` ON `maintenance_cases` (`organization_id`,`property_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_maintenance_cases_legacy_report` ON `maintenance_cases` (`legacy_report_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_cases_org_id_unique` ON `maintenance_cases` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_cases_legacy_report_unique` ON `maintenance_cases` (`legacy_report_id`);--> statement-breakpoint
CREATE TABLE `organization_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "organization_memberships_ids_positive" CHECK("organization_memberships"."id" > 0 and "organization_memberships"."organization_id" > 0 and "organization_memberships"."user_id" > 0),
	CONSTRAINT "organization_memberships_role_check" CHECK("organization_memberships"."role" in ('owner', 'admin', 'manager', 'resident', 'worker', 'auditor')),
	CONSTRAINT "organization_memberships_status_check" CHECK("organization_memberships"."status" in ('active', 'invited', 'suspended', 'revoked'))
);
--> statement-breakpoint
CREATE INDEX `idx_organization_memberships_user_status` ON `organization_memberships` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_organization_memberships_org_role_status` ON `organization_memberships` (`organization_id`,`role`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_memberships_org_user_unique` ON `organization_memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_memberships_org_id_unique` ON `organization_memberships` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`default_timezone` text DEFAULT 'UTC' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "organizations_id_positive" CHECK("organizations"."id" > 0),
	CONSTRAINT "organizations_status_check" CHECK("organizations"."status" in ('active', 'suspended', 'closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`name` text NOT NULL,
	`external_ref` text,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "properties_ids_positive" CHECK("properties"."id" > 0 and "properties"."organization_id" > 0),
	CONSTRAINT "properties_status_check" CHECK("properties"."status" in ('active', 'inactive', 'archived'))
);
--> statement-breakpoint
CREATE INDEX `idx_properties_org_status` ON `properties` (`organization_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `properties_org_id_unique` ON `properties` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `properties_org_external_ref_unique` ON `properties` (`organization_id`,`external_ref`);--> statement-breakpoint
CREATE TABLE `resource_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`membership_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`capability` text NOT NULL,
	`granted_by_membership_id` integer,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`membership_id`) REFERENCES `organization_memberships`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`granted_by_membership_id`) REFERENCES `organization_memberships`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "resource_grants_ids_positive" CHECK("resource_grants"."id" > 0 and "resource_grants"."organization_id" > 0 and "resource_grants"."membership_id" > 0 and "resource_grants"."resource_id" > 0 and ("resource_grants"."granted_by_membership_id" is null or "resource_grants"."granted_by_membership_id" > 0)),
	CONSTRAINT "resource_grants_type_check" CHECK("resource_grants"."resource_type" in ('organization', 'property', 'unit', 'case')),
	CONSTRAINT "resource_grants_capability_check" CHECK("resource_grants"."capability" in ('read', 'contribute', 'manage', 'message', 'media', 'dispatch', 'verify', 'report')),
	CONSTRAINT "resource_grants_organization_scope_check" CHECK("resource_grants"."resource_type" <> 'organization' or "resource_grants"."resource_id" = "resource_grants"."organization_id")
);
--> statement-breakpoint
CREATE INDEX `idx_resource_grants_target` ON `resource_grants` (`organization_id`,`resource_type`,`resource_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resource_grants_scope_unique` ON `resource_grants` (`membership_id`,`resource_type`,`resource_id`,`capability`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`property_id` integer NOT NULL,
	`label` text NOT NULL,
	`external_ref` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`property_id`) REFERENCES `properties`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "units_ids_positive" CHECK("units"."id" > 0 and "units"."organization_id" > 0 and "units"."property_id" > 0),
	CONSTRAINT "units_status_check" CHECK("units"."status" in ('active', 'inactive', 'archived'))
);
--> statement-breakpoint
CREATE INDEX `idx_units_org_property_status` ON `units` (`organization_id`,`property_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_org_id_unique` ON `units` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_org_property_id_unique` ON `units` (`organization_id`,`property_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_property_label_unique` ON `units` (`property_id`,`label`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_org_property_external_ref_unique` ON `units` (`organization_id`,`property_id`,`external_ref`);--> statement-breakpoint
CREATE TRIGGER `case_events_reject_update`
BEFORE UPDATE ON `case_events`
BEGIN
	SELECT RAISE(ABORT, 'case_events is append-only');
END;--> statement-breakpoint
CREATE TRIGGER `case_events_reject_delete`
BEFORE DELETE ON `case_events`
BEGIN
	SELECT RAISE(ABORT, 'case_events is append-only');
END;
