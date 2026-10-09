CREATE TABLE `booking` (
	`id` text PRIMARY KEY,
	`token` text NOT NULL UNIQUE,
	`owner_id` text NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`busy_start` integer NOT NULL,
	`busy_end` integer NOT NULL,
	`guest_name` text NOT NULL,
	`guest_email` text NOT NULL,
	`guest_timezone` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_booking_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_booking_event_id_event_type_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event_type`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `event_type` (
	`id` text PRIMARY KEY,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`duration` integer NOT NULL,
	`color` text DEFAULT 'green' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_event_type_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `scheduling_profile` (
	`owner_id` text PRIMARY KEY,
	`handle` text NOT NULL UNIQUE,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`weekly` text NOT NULL,
	`overrides` text NOT NULL,
	`buffer_before` integer DEFAULT 0 NOT NULL,
	`buffer_after` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_scheduling_profile_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `booking_owner_interval` ON `booking` (`owner_id`,`status`,`busy_start`,`busy_end`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_owner_slug` ON `event_type` (`owner_id`,`slug`);