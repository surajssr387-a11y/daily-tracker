CREATE TABLE `checkins` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`goal_id` text NOT NULL,
	`checked` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `date`, `goal_id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`label` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT 'target' NOT NULL,
	`builtin` integer DEFAULT 0 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
