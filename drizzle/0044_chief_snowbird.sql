CREATE TABLE `boarding_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`attendanceDate` date NOT NULL,
	`status` enum('present','absent','late','excused') NOT NULL,
	`notes` varchar(500),
	`recordedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boarding_attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `boarding_attendance_unique` UNIQUE(`schoolId`,`learnerId`,`attendanceDate`)
);
--> statement-breakpoint
CREATE TABLE `boarding_checkouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`checkoutAt` timestamp NOT NULL,
	`expectedReturnAt` timestamp,
	`actualReturnAt` timestamp,
	`destination` varchar(255),
	`reason` varchar(500) NOT NULL,
	`status` enum('checked_out','returned','cancelled') NOT NULL DEFAULT 'checked_out',
	`authorizedByUserId` int NOT NULL,
	`returnedByUserId` int,
	`notes` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boarding_checkouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boarding_meals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`mealDate` date NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') NOT NULL,
	`status` enum('served','skipped','excused') NOT NULL,
	`notes` varchar(500),
	`recordedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boarding_meals_id` PRIMARY KEY(`id`),
	CONSTRAINT `boarding_meal_unique` UNIQUE(`schoolId`,`learnerId`,`mealDate`,`mealType`)
);
--> statement-breakpoint
ALTER TABLE `staff_profiles` MODIFY COLUMN `role` enum('super_admin','admin','teacher','class_teacher','exam_council','nurse','boarding_master','senior_teacher','deputy_head','head_teacher','finance','storekeeper','other') NOT NULL DEFAULT 'other';
--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role`,`permissionKey`,`allowed`) VALUES ('admin','health.view',1),('admin','health.create',1),('admin','health.edit',1),('admin','boarding.view',1),('admin','boarding.create',1),('admin','boarding.edit',1),('nurse','dashboard.view',1),('nurse','learners.view',1),('nurse','health.view',1),('nurse','health.create',1),('nurse','health.edit',1),('boarding_master','dashboard.view',1),('boarding_master','learners.view',1),('boarding_master','boarding.view',1),('boarding_master','boarding.create',1),('boarding_master','boarding.edit',1);
