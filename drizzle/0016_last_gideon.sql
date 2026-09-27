ALTER TABLE `assessments` DROP INDEX `assessment_scope_unique`;--> statement-breakpoint
ALTER TABLE `marks` ADD `teacherUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessment_scope_unique` UNIQUE(`academicYear`,`term`,`assessmentType`,`gradeId`,`subjectId`);