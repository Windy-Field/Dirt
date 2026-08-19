CREATE DATABASE IF NOT EXISTS `nimeng_xinyun`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `nimeng_xinyun`;

CREATE TABLE IF NOT EXISTS `sites` (
  `id` INT NOT NULL,
  `city` VARCHAR(120) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `period` VARCHAR(255) NOT NULL,
  `tags` JSON NOT NULL,
  `count` INT NOT NULL DEFAULT 0,
  `x` DECIMAL(6,2) NOT NULL,
  `y` DECIMAL(6,2) NOT NULL,
  `seals` JSON NOT NULL,
  `admin` VARCHAR(255) NOT NULL,
  `note` TEXT NOT NULL,
  `description` TEXT NOT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sites_published` (`is_published`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `relics` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `inscription` VARCHAR(160) NOT NULL,
  `period` VARCHAR(80) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `category` VARCHAR(120) NOT NULL,
  `tone` VARCHAR(40) NOT NULL DEFAULT 'clay',
  `value` VARCHAR(120) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL DEFAULT '',
  `summary` TEXT NOT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_relics_published` (`is_published`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `lesson` INT NOT NULL DEFAULT 1,
  `duration` VARCHAR(40) NOT NULL DEFAULT '',
  `description` TEXT NOT NULL,
  `video_url` VARCHAR(500) NOT NULL DEFAULT '',
  `poster_url` VARCHAR(500) NOT NULL DEFAULT '',
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_published` (`is_published`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `creative_works` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `mark` VARCHAR(20) NOT NULL,
  `description` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_creative_published` (`is_published`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `question_text` TEXT NOT NULL,
  `option_a` VARCHAR(500) NOT NULL,
  `option_b` VARCHAR(500) NOT NULL,
  `option_c` VARCHAR(500) NOT NULL,
  `option_d` VARCHAR(500) NOT NULL,
  `correct_answer` CHAR(1) NOT NULL,
  `explanation` TEXT NOT NULL,
  `difficulty` VARCHAR(20) NOT NULL DEFAULT '简单',
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_questions_published` (`is_published`),
  CONSTRAINT `chk_questions_answer` CHECK (`correct_answer` IN ('A', 'B', 'C', 'D'))
) ENGINE=InnoDB;
