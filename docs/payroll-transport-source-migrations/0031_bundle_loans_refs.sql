CREATE TABLE `payroll_loan_repayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`loanId` int NOT NULL,
	`runId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_loan_repayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_loan_repayment_school_loan_run_unique` UNIQUE(`schoolId`,`loanId`,`runId`)
);
--> statement-breakpoint
CREATE TABLE `payroll_loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffProfileId` int NOT NULL,
	`loanType` enum('loan','advance') NOT NULL,
	`description` varchar(160) NOT NULL,
	`principalAmount` decimal(12,2) NOT NULL,
	`outstandingBalance` decimal(12,2) NOT NULL,
	`installmentAmount` decimal(12,2) NOT NULL,
	`startPeriod` varchar(7) NOT NULL,
	`status` enum('pending','approved','rejected','closed') NOT NULL DEFAULT 'pending',
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transport_charge_payments` ADD `reference` varchar(80);--> statement-breakpoint
UPDATE `transport_charge_payments` SET `reference` = CONCAT('legacy-', `paymentId`) WHERE `reference` IS NULL;--> statement-breakpoint
ALTER TABLE `transport_charge_payments` MODIFY `reference` varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE `transport_charge_payments` ADD CONSTRAINT `transport_charge_payment_reference_unique` UNIQUE(`schoolId`,`reference`);
