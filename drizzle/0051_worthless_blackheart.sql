ALTER TABLE `learners` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `learners` ADD `deletedByUserId` int;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `deletedByUserId` int;