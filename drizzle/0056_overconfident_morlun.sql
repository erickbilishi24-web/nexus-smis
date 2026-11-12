CREATE TABLE `finance_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`documentType` enum('voucher','receipt') NOT NULL,
	`documentNumber` varchar(80) NOT NULL,
	`documentDate` date NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`partyName` varchar(160) NOT NULL,
	`description` varchar(500) NOT NULL,
	`paymentMethod` varchar(40),
	`reference` varchar(160),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finance_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_document_school_number_unique` UNIQUE(`schoolId`,`documentNumber`)
);
