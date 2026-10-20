CREATE TABLE `behaviour_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`category` varchar(80) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`outcome` varchar(500),
	`isApprovedForReport` int NOT NULL DEFAULT 0,
	`recordedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `behaviour_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counselling_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`referralSource` varchar(80) NOT NULL DEFAULT 'staff',
	`concern` varchar(255) NOT NULL,
	`status` enum('open','in_progress','closed','archived') NOT NULL DEFAULT 'open',
	`assignedCounsellorUserId` int,
	`interventionPlan` text,
	`closureOutcome` text,
	`reviewDate` date,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `counselling_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counselling_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`scheduledFor` date NOT NULL,
	`action` varchar(255) NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `counselling_follow_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counselling_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`note` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `counselling_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learner_exits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`status` enum('completed','graduated','transferred','withdrawn','other') NOT NULL,
	`effectiveDate` date NOT NULL,
	`reason` varchar(255) NOT NULL,
	`finalGradeId` int,
	`notes` text,
	`processedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learner_exits_id` PRIMARY KEY(`id`),
	CONSTRAINT `learner_exit_date_unique` UNIQUE(`learnerId`,`effectiveDate`)
);
--> statement-breakpoint
ALTER TABLE `alumni` ADD `finalGradeId` int;--> statement-breakpoint
ALTER TABLE `alumni` ADD `finalClassName` varchar(120);--> statement-breakpoint
ALTER TABLE `alumni` ADD `completionStatus` enum('completed','graduated','transferred','withdrawn','other') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `alumni` ADD `completionDate` date;--> statement-breakpoint
ALTER TABLE `alumni` ADD `contactPhone` varchar(40);--> statement-breakpoint
ALTER TABLE `alumni` ADD `engagementNotes` text;