USE `nimeng_xinyun`;

ALTER TABLE `questions`
  ADD COLUMN `difficulty` VARCHAR(20)
  NOT NULL DEFAULT '简单' AFTER `explanation`;
