ALTER TABLE `report_cards` DROP INDEX `report_card_period_unique`;--> statement-breakpoint
ALTER TABLE `assessments` MODIFY COLUMN `status` enum('draft','submitted','approved','locked') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `marks` MODIFY COLUMN `midTerm` decimal(5,2);--> statement-breakpoint
ALTER TABLE `marks` MODIFY COLUMN `endTerm` decimal(5,2);--> statement-breakpoint
ALTER TABLE `marks` MODIFY COLUMN `average` decimal(5,2);--> statement-breakpoint
ALTER TABLE `marks` MODIFY COLUMN `cbcLevel` enum('EE1','EE2','ME1','ME2','AE1','AE2','BE1','BE2');--> statement-breakpoint
ALTER TABLE `assessments` ADD `subjectId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `teacherUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `assessmentType` enum('mid_term','end_term') DEFAULT 'end_term' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `submittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `verifiedByUserId` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `lockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `marks` ADD `score` decimal(5,2);--> statement-breakpoint
ALTER TABLE `marks` ADD `updatedByUserId` int;--> statement-breakpoint
ALTER TABLE `marks` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `report_cards` ADD `assessmentType` enum('mid_term','end_term') DEFAULT 'end_term' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessment_scope_unique` UNIQUE(`academicYear`,`term`,`assessmentType`,`gradeId`,`subjectId`,`teacherUserId`);--> statement-breakpoint
ALTER TABLE `report_cards` ADD CONSTRAINT `report_card_period_unique` UNIQUE(`learnerId`,`academicYear`,`term`,`assessmentType`);