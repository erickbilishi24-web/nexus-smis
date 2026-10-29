CREATE TABLE `boarding_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`unitId` int NOT NULL,
	`allocatedFrom` date NOT NULL,
	`allocatedTo` date,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`allocatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boarding_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boarding_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`residentialStatus` enum('day_scholar','full_time_boarder','weekly_boarder','scheduled_boarder') NOT NULL DEFAULT 'day_scholar',
	`dietaryRequirements` text,
	`activeFrom` date NOT NULL,
	`activeTo` date,
	`updatedByUserId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boarding_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `boarding_profile_learner_unique` UNIQUE(`schoolId`,`learnerId`)
);
--> statement-breakpoint
CREATE TABLE `boarding_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`room` varchar(80),
	`capacity` int NOT NULL DEFAULT 1,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	CONSTRAINT `boarding_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `boarding_unit_name_unique` UNIQUE(`schoolId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `health_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`eventType` enum('illness','injury','first_aid','clinic_visit','referral','follow_up') NOT NULL,
	`eventDate` date NOT NULL,
	`notes` text NOT NULL,
	`medication` varchar(255),
	`referredTo` varchar(255),
	`recordedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `health_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `health_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`allergies` text,
	`conditions` text,
	`bloodGroup` varchar(12),
	`emergencyContactName` varchar(160),
	`emergencyContactPhone` varchar(40),
	`providerNotes` text,
	`updatedByUserId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `health_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `health_profile_learner_unique` UNIQUE(`schoolId`,`learnerId`)
);
--> statement-breakpoint
ALTER TABLE `school_settings` ADD `themePrimaryColor` varchar(9) DEFAULT '#1d6a57' NOT NULL;--> statement-breakpoint
ALTER TABLE `school_settings` ADD `themeAccentColor` varchar(9) DEFAULT '#d99b3d' NOT NULL;--> statement-breakpoint
ALTER TABLE `school_settings` ADD `themeSurfaceColor` varchar(9) DEFAULT '#f7f4ed' NOT NULL;--> statement-breakpoint
ALTER TABLE `school_settings` ADD `themeMode` enum('light','dark','system') DEFAULT 'light' NOT NULL;