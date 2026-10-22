ALTER TABLE `school_settings` ADD `schoolId` int;SET @default_school_id := (SELECT id FROM schools WHERE schoolCode='EBUNANGWE-JS' LIMIT 1);
UPDATE `school_settings` SET `schoolId`=@default_school_id WHERE `schoolId` IS NULL;
