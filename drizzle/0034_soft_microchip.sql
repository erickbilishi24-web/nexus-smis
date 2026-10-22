ALTER TABLE `iam_sessions` ADD `expiresAt` timestamp NULL;--> statement-breakpoint
UPDATE `iam_sessions` SET `expiresAt` = DATE_ADD(`loginAt`, INTERVAL 30 DAY) WHERE `expiresAt` IS NULL;--> statement-breakpoint
ALTER TABLE `iam_sessions` MODIFY `expiresAt` timestamp NOT NULL;
