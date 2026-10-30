CREATE TABLE `nexus_ai_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int NOT NULL,
	`documentType` varchar(80) NOT NULL,
	`title` varchar(255) NOT NULL,
	`grade` varchar(80) NOT NULL,
	`subject` varchar(120) NOT NULL,
	`term` varchar(40) NOT NULL,
	`topic` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nexus_ai_documents_id` PRIMARY KEY(`id`)
);
