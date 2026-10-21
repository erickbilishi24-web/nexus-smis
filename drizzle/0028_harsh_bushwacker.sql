CREATE TABLE `report_card_comment_bank` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('class_teacher','principal') NOT NULL,
	`category` enum('BE','AE','ME','EE') NOT NULL,
	`position` int NOT NULL,
	`text` text NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_card_comment_bank_id` PRIMARY KEY(`id`),
	CONSTRAINT `comment_bank_role_category_position` UNIQUE(`role`,`category`,`position`)
);
