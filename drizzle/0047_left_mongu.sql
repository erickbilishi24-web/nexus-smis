ALTER TABLE `assessments` MODIFY COLUMN `status` enum('draft','submitted','returned','approved','locked') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `assessments` ADD `returnedByUserId` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `returnedAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `returnReason` varchar(500);