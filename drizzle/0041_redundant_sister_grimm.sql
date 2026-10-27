CREATE TABLE `school_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`schoolId` int NOT NULL,
	`status` enum('active','suspended','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `school_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_membership_unique` UNIQUE(`userId`,`schoolId`)
);
--> statement-breakpoint
ALTER TABLE `schools` MODIFY COLUMN `status` enum('active','pending_activation','suspended','disabled','archived') NOT NULL DEFAULT 'pending_activation';