CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolCode` varchar(40) NOT NULL,
	`schoolName` varchar(200) NOT NULL,
	`status` enum('active','pending_activation','suspended','disabled') NOT NULL DEFAULT 'pending_activation',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`),
	CONSTRAINT `schools_schoolCode_unique` UNIQUE(`schoolCode`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `schoolId` int;