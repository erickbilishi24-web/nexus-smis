ALTER TABLE `school_settings` MODIFY COLUMN `enabledSchoolLevels` varchar(255) NOT NULL DEFAULT 'ECDE,Lower Primary,Upper Primary,Junior School,Senior School';
UPDATE `school_settings` SET `enabledSchoolLevels` = 'ECDE,Lower Primary,Upper Primary,Junior School,Senior School' WHERE `enabledSchoolLevels` = 'ECDE,Primary,Junior School,Senior School';
UPDATE `curriculum_offerings` SET `level` = 'Lower Primary' WHERE `level` = 'Primary' AND `gradeLabel` IN ('Grade 1', 'Grade 2', 'Grade 3');
UPDATE `curriculum_offerings` SET `level` = 'Upper Primary' WHERE `level` = 'Primary' AND `gradeLabel` IN ('Grade 4', 'Grade 5', 'Grade 6');
