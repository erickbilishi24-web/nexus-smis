CREATE TABLE `platform_payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(40) NOT NULL,
	`identifier` varchar(120),
	`accountReference` varchar(120),
	`description` varchar(500),
	`instructions` text,
	`visibleToSchools` int NOT NULL DEFAULT 0,
	`enabled` int NOT NULL DEFAULT 1,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_subscription_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`planId` int,
	`paymentMethodId` int,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'KES',
	`externalReference` varchar(160),
	`status` enum('pending','submitted','verified','rejected','refunded') NOT NULL DEFAULT 'pending',
	`provider` varchar(40),
	`providerPayload` text,
	`verifiedByUserId` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_subscription_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`planId` int,
	`status` enum('trialing','pending_payment','active','expired','suspended','cancelled') NOT NULL,
	`trialStartedAt` timestamp,
	`trialEndsAt` timestamp,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`agreedPrice` decimal(12,2),
	`planSnapshot` text,
	`extensionReason` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `school_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`price` decimal(12,2) NOT NULL,
	`billingPeriod` varchar(30) NOT NULL,
	`durationDays` int NOT NULL,
	`includedFeatures` text,
	`eligibility` varchar(80) NOT NULL DEFAULT 'all_schools',
	`active` int NOT NULL DEFAULT 1,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `schools` ADD `trialStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `schools` ADD `trialEndsAt` timestamp;