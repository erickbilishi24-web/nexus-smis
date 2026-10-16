CREATE TABLE `resource_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`resourceId` int,
	`targetLabel` varchar(200) NOT NULL,
	`beforeJson` text,
	`afterJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(64) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resource_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `resource_role_visibility` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` int NOT NULL,
	`role` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_role_visibility_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(64) NOT NULL,
	`grade` varchar(80),
	`subject` varchar(120),
	`learningArea` varchar(160),
	`mediaType` varchar(80),
	`allowHttp` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `resourceHubManage` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `resource_audit_created_idx` ON `resource_audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `resource_categories_order_idx` ON `resource_categories` (`displayOrder`);--> statement-breakpoint
CREATE INDEX `resource_role_visibility_resource_role_idx` ON `resource_role_visibility` (`resourceId`,`role`);--> statement-breakpoint
CREATE INDEX `resources_category_order_idx` ON `resources` (`categoryId`,`displayOrder`);--> statement-breakpoint
CREATE INDEX `resources_active_idx` ON `resources` (`isActive`);