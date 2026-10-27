CREATE TABLE `timetable_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int,
	`name` varchar(120) NOT NULL,
	`section` varchar(60) NOT NULL,
	`academicYear` int NOT NULL,
	`term` varchar(40),
	`description` varchar(500),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timetable_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `timetable_plan_scope_unique` UNIQUE(`schoolId`,`name`,`academicYear`,`term`)
);
