CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_role_unique` UNIQUE(`userId`,`role`)
);
--> statement-breakpoint
ALTER TABLE `staff_profiles` MODIFY COLUMN `role` enum('super_admin','admin','teacher','class_teacher','exam_council','senior_teacher','deputy_head','head_teacher','finance','storekeeper','other') NOT NULL DEFAULT 'other';
--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role`,`permissionKey`,`allowed`) VALUES
('exam_council','dashboard.view',1),
('exam_council','assessments.view',1),
('exam_council','marklists.view',1),
('exam_council','reports.view',1);
