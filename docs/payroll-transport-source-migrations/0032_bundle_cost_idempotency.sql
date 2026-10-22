ALTER TABLE `transport_costs` ADD `idempotencyKey` varchar(36);--> statement-breakpoint
UPDATE `transport_costs` SET `idempotencyKey` = CONCAT('legacy-cost-', `id`) WHERE `idempotencyKey` IS NULL;--> statement-breakpoint
ALTER TABLE `transport_costs` MODIFY `idempotencyKey` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `transport_costs` ADD CONSTRAINT `transport_cost_request_unique` UNIQUE(`schoolId`,`idempotencyKey`);
