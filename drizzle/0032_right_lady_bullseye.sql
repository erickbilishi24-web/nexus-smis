ALTER TABLE `academic_terms` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `alumni` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `attendance_register_approvals` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `attendances` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `smis_audit_logs` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `behaviour_records` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `report_card_comment_bank` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `communications` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `counselling_cases` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `counselling_follow_ups` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `counselling_notes` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `curriculum_offerings` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `expenditures` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `fee_structures` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `grades` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `guardians` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `learner_enrolments` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `learner_exits` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `learner_guardians` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `learners` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `library_books` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `library_categories` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `library_copies` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `library_fines` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `library_loans` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `library_reservations` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `marks` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `nexus_ai_transactions` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `nexus_feedback` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `nexus_message_recipients` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `nexus_messages` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `report_cards` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `resource_audit_logs` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `resource_categories` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `resource_role_visibility` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `resources` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `rollover_items` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `rollover_runs` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `staff_clockings` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `store_items` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `store_movements` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `subjects` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `teacher_allocations` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `timetable_entries` ADD `schoolId` int;--> statement-breakpoint
ALTER TABLE `timetable_requirements` ADD `schoolId` int;
SET @default_school_id := (SELECT id FROM schools WHERE schoolCode='EBUNANGWE-JS' LIMIT 1);
UPDATE `academic_terms` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `academic_years` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `alumni` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `assessments` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `attendance_register_approvals` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `attendances` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `smis_audit_logs` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `behaviour_records` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `report_card_comment_bank` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `communications` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `counselling_cases` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `counselling_follow_ups` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `counselling_notes` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `curriculum_offerings` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `expenditures` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `fee_structures` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `grades` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `guardians` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `learner_enrolments` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `learner_exits` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `learner_guardians` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `learners` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `library_books` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `library_categories` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `library_copies` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `library_fines` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `library_loans` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `library_reservations` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `marks` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `nexus_ai_transactions` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `nexus_feedback` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `nexus_message_recipients` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `nexus_messages` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `notifications` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `payments` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `report_cards` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `resource_audit_logs` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `resource_categories` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `resource_role_visibility` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `resources` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `rollover_items` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `rollover_runs` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `staff_clockings` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `staff_profiles` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `store_items` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `store_movements` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `subjects` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `teacher_allocations` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `timetable_entries` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
UPDATE `timetable_requirements` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
