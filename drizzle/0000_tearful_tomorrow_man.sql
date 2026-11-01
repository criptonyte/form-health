CREATE TABLE `connections` (
	`owner` text PRIMARY KEY NOT NULL,
	`credentials` text NOT NULL,
	`tokens` text,
	`synced_at` integer,
	`lock_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`goal` real DEFAULT 85 NOT NULL,
	`calories` integer DEFAULT 2000 NOT NULL,
	`water` integer DEFAULT 2500 NOT NULL,
	`timezone` text DEFAULT 'Australia/Sydney' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`body_fat` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_owner_date` ON `records` (`owner`,`date`);