CREATE INDEX `learner_school_name_idx` ON `learners` (`schoolId`,`fullName`);--> statement-breakpoint
CREATE INDEX `staff_school_name_idx` ON `staff_profiles` (`schoolId`,`displayName`);