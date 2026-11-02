CREATE TABLE `invoices` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`learnerId` int NOT NULL,
	`gradeId` int NOT NULL,
	`term` varchar(40) NOT NULL,
	`academicYear` int NOT NULL,
	`invoiceNumber` varchar(100) NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`lineItemsJson` text NOT NULL,
	`status` enum('issued','paid','void') NOT NULL DEFAULT 'issued',
	`generatedByUserId` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`),
	CONSTRAINT `invoice_learner_term_unique` UNIQUE(`schoolId`,`learnerId`,`term`,`academicYear`)
);
