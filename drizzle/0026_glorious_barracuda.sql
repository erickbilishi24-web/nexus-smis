CREATE TABLE `academic_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`name` varchar(40) NOT NULL,
	`startsOn` date NOT NULL,
	`endsOn` date NOT NULL,
	`isActive` int NOT NULL DEFAULT 0,
	CONSTRAINT `academic_terms_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_term_unique` UNIQUE(`academicYearId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `academic_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`startsOn` date NOT NULL,
	`endsOn` date NOT NULL,
	`rolloverOn` date,
	`isCurrent` int NOT NULL DEFAULT 0,
	`status` enum('planned','active','closed') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_years_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
CREATE TABLE `learner_enrolments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`academicYearId` int NOT NULL,
	`gradeId` int NOT NULL,
	`className` varchar(80),
	`status` enum('active','completed','repeating','transferred','withdrawn','pending_action') NOT NULL DEFAULT 'active',
	`source` varchar(40) NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learner_enrolments_id` PRIMARY KEY(`id`),
	CONSTRAINT `learner_year_enrolment_unique` UNIQUE(`learnerId`,`academicYearId`)
);
--> statement-breakpoint
CREATE TABLE `rollover_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`learnerId` int NOT NULL,
	`fromGradeId` int NOT NULL,
	`toGradeId` int,
	`status` enum('ready','pending_action','approved','excluded','reversed') NOT NULL DEFAULT 'ready',
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rollover_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollover_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromAcademicYearId` int NOT NULL,
	`toAcademicYearId` int NOT NULL,
	`status` enum('preview','approved','reversed','failed') NOT NULL DEFAULT 'preview',
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`reason` varchar(255),
	CONSTRAINT `rollover_runs_id` PRIMARY KEY(`id`)
);
