ALTER TABLE `booking` ADD `cancel_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking` ADD `cancelled_by` text;--> statement-breakpoint
ALTER TABLE `booking` ADD `cancelled_at` integer;--> statement-breakpoint
ALTER TABLE `event_type` ADD `min_notice` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_type` ADD `booking_window` integer DEFAULT 180 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_type` ADD `slot_interval` integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_type` ADD `daily_limit` integer;--> statement-breakpoint
ALTER TABLE `event_type` ADD `location_kind` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_type` ADD `location_value` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `event_type` SET `color` = 'amber' WHERE `color` = 'green';--> statement-breakpoint
UPDATE `event_type` SET `color` = 'sky' WHERE `color` = 'blue';