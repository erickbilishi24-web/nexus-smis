CREATE TABLE `nexus_ai_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentType` varchar(80) NOT NULL,
	`documentTitle` varchar(255) NOT NULL,
	`phoneNumber` varchar(40),
	`amount` decimal(10,2) NOT NULL,
	`mpesaReceipt` varchar(80),
	`status` enum('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `nexus_ai_transactions_id` PRIMARY KEY(`id`)
);
