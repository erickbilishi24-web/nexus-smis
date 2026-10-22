CREATE TABLE `payroll_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffProfileId` int NOT NULL,
	`period` varchar(7) NOT NULL,
	`kind` enum('earning','deduction') NOT NULL,
	`description` varchar(120) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`taxable` int NOT NULL DEFAULT 1,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_adjustments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_adjustment_unique` UNIQUE(`schoolId`,`staffProfileId`,`period`,`kind`,`description`)
);
--> statement-breakpoint
CREATE TABLE `payroll_compensation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffProfileId` int NOT NULL,
	`effectiveFrom` date NOT NULL,
	`effectiveTo` date,
	`basicSalary` decimal(12,2) NOT NULL,
	`earningsJson` longtext NOT NULL,
	`deductionsJson` longtext NOT NULL,
	`resident` int NOT NULL DEFAULT 1,
	`additionalPension` decimal(12,2) NOT NULL DEFAULT '0',
	`postRetirementMedical` decimal(12,2) NOT NULL DEFAULT '0',
	`mortgageInterest` decimal(12,2) NOT NULL DEFAULT '0',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_compensation_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_comp_school_staff_effective_unique` UNIQUE(`schoolId`,`staffProfileId`,`effectiveFrom`)
);
--> statement-breakpoint
CREATE TABLE `payroll_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`runId` int NOT NULL,
	`staffProfileId` int NOT NULL,
	`employeeName` varchar(160) NOT NULL,
	`calculationJson` longtext NOT NULL,
	`gross` decimal(12,2) NOT NULL,
	`paye` decimal(12,2) NOT NULL,
	`net` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_item_run_staff_unique` UNIQUE(`schoolId`,`runId`,`staffProfileId`)
);
--> statement-breakpoint
CREATE TABLE `payroll_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`effectiveFrom` date NOT NULL,
	`rulesJson` longtext NOT NULL,
	`sourceNotes` varchar(600),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_rules_school_effective_unique` UNIQUE(`schoolId`,`effectiveFrom`)
);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`period` varchar(7) NOT NULL,
	`status` enum('draft','submitted','approved','recorded','closed') NOT NULL DEFAULT 'draft',
	`preparedByUserId` int NOT NULL,
	`submittedByUserId` int,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`recordedAt` timestamp,
	`financeExpenditureId` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payroll_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_run_school_period_unique` UNIQUE(`schoolId`,`period`)
);
--> statement-breakpoint
CREATE TABLE `transport_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`routeId` int NOT NULL,
	`stopName` varchar(120) NOT NULL,
	`authorizedGuardianId` int,
	`status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
	`startsOn` date NOT NULL,
	`endsOn` date,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_allocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_allocation_school_learner_unique` UNIQUE(`schoolId`,`learnerId`)
);
--> statement-breakpoint
CREATE TABLE `transport_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`routeId` int NOT NULL,
	`attendanceDate` date NOT NULL,
	`shift` enum('am','pm') NOT NULL,
	`status` enum('boarded','absent','excused') NOT NULL,
	`capturedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transport_attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_attendance_school_learner_day_shift_unique` UNIQUE(`schoolId`,`learnerId`,`attendanceDate`,`shift`)
);
--> statement-breakpoint
CREATE TABLE `transport_charge_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`chargeId` int NOT NULL,
	`paymentId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transport_charge_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_charge_payment_unique` UNIQUE(`schoolId`,`paymentId`)
);
--> statement-breakpoint
CREATE TABLE `transport_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`routeId` int NOT NULL,
	`period` varchar(20) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transport_charges_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_charge_school_learner_period_unique` UNIQUE(`schoolId`,`learnerId`,`period`)
);
--> statement-breakpoint
CREATE TABLE `transport_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`costType` enum('fuel','maintenance','repair','other') NOT NULL,
	`costDate` date NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` varchar(255) NOT NULL,
	`nextDueOn` date,
	`ledgerExpenditureId` bigint,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transport_costs_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_cost_ledger_ref_unique` UNIQUE(`ledgerExpenditureId`)
);
--> statement-breakpoint
CREATE TABLE `transport_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`routeId` int,
	`incidentDate` date NOT NULL,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`category` enum('breakdown','delay','safety','damage','other') NOT NULL,
	`description` varchar(1000) NOT NULL,
	`resolution` varchar(500),
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`reportedByUserId` int NOT NULL,
	`resolvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transport_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`vehicleId` int,
	`feeAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`billingCycle` enum('monthly','termly') NOT NULL DEFAULT 'termly',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_routes_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_route_school_name_unique` UNIQUE(`schoolId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `transport_settings` (
	`schoolId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_settings_schoolId` PRIMARY KEY(`schoolId`)
);
--> statement-breakpoint
CREATE TABLE `transport_trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`routeId` int,
	`driverStaffProfileId` int,
	`tripDate` date NOT NULL,
	`shift` enum('am','pm','other') NOT NULL,
	`odometerStartKm` decimal(11,1) NOT NULL,
	`odometerEndKm` decimal(11,1) NOT NULL,
	`notes` varchar(500),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transport_trips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transport_vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`registration` varchar(24) NOT NULL,
	`description` varchar(160) NOT NULL,
	`capacity` int NOT NULL,
	`driverStaffProfileId` int,
	`assetReference` varchar(80),
	`insuranceExpiresOn` date,
	`inspectionExpiresOn` date,
	`odometerKm` decimal(11,1) NOT NULL DEFAULT '0',
	`status` enum('active','service','retired') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_vehicle_school_reg_unique` UNIQUE(`schoolId`,`registration`)
);

--> statement-breakpoint
INSERT INTO `payroll_rules` (`schoolId`, `effectiveFrom`, `rulesJson`, `sourceNotes`, `createdByUserId`)
SELECT `id`, '2026-02-01', '{"payeBands":[{"ceiling":24000,"rate":0.1},{"ceiling":32333,"rate":0.25},{"ceiling":500000,"rate":0.3},{"ceiling":800000,"rate":0.325},{"ceiling":null,"rate":0.35}],"personalRelief":2400,"nssf":{"tierOneLimit":9000,"upperLimit":108000,"rate":0.06},"shif":{"rate":0.0275,"minimum":300},"housingLevy":{"employeeRate":0.015,"employerRate":0.015},"pensionDeductionCap":30000,"postRetirementMedicalCap":15000,"mortgageInterestCap":30000}', '2026 baseline verified against official KRA, NSSF and Kenya Law sources; verify amendments before live payroll.', 0
FROM `school_settings`
ON DUPLICATE KEY UPDATE `rulesJson` = VALUES(`rulesJson`), `sourceNotes` = VALUES(`sourceNotes`);
