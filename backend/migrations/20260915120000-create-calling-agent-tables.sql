-- =============================================================
-- Migration: Create Calling Agent Tables (leads, calls, activities, settings)
-- Specific to BizzHub AI Calling Agent backend.
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- 1. Table: leads
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL DEFAULT 'Unknown',
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `company` VARCHAR(255) DEFAULT NULL,
  `source` VARCHAR(100) DEFAULT 'website',
  `status` VARCHAR(50) DEFAULT 'new',
  `space_type` VARCHAR(100) DEFAULT NULL,
  `seats` VARCHAR(50) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `duration` VARCHAR(100) DEFAULT NULL,
  `budget` VARCHAR(100) DEFAULT NULL,
  `recommended_centre` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `tags` TEXT DEFAULT NULL,
  `ai_score` INT DEFAULT NULL,
  `ai_score_reason` TEXT DEFAULT NULL,
  `sentiment` VARCHAR(50) DEFAULT NULL,
  `requirements_changed` TINYINT(1) DEFAULT 0,
  `assigned_to_id` VARCHAR(64) DEFAULT NULL,
  `assigned_to_name` VARCHAR(255) DEFAULT NULL,
  `assigned_to_email` VARCHAR(255) DEFAULT NULL,
  `assigned_by` VARCHAR(255) DEFAULT NULL,
  `assigned_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_leads_phone` (`phone`),
  INDEX `idx_leads_status` (`status`),
  INDEX `idx_leads_created_at` (`created_at`),
  INDEX `idx_leads_assigned_to_id` (`assigned_to_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. Table: calls
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calls` (
  `call_id` VARCHAR(128) NOT NULL,
  `lead_id` VARCHAR(64) DEFAULT NULL,
  `lead_name` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `provider` VARCHAR(50) DEFAULT 'bolna',
  `call_type` VARCHAR(50) DEFAULT 'confirm_agent',
  `status` VARCHAR(50) DEFAULT 'initiated',
  `sentiment` VARCHAR(50) DEFAULT NULL,
  `outcome` VARCHAR(255) DEFAULT NULL,
  `callback_time` VARCHAR(255) DEFAULT NULL,
  `callback_schedule` TEXT DEFAULT NULL,
  `call_summary` TEXT DEFAULT NULL,
  `transcript` LONGTEXT DEFAULT NULL,
  `recording_url` TEXT DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `original_location` VARCHAR(255) DEFAULT NULL,
  `seats` VARCHAR(50) DEFAULT NULL,
  `original_seats` VARCHAR(50) DEFAULT NULL,
  `space_type` VARCHAR(100) DEFAULT NULL,
  `original_space_type` VARCHAR(100) DEFAULT NULL,
  `recommended_centre` VARCHAR(255) DEFAULT NULL,
  `assistant_name` VARCHAR(100) DEFAULT NULL,
  `company_name` VARCHAR(100) DEFAULT NULL,
  `topic` VARCHAR(255) DEFAULT NULL,
  `source` VARCHAR(100) DEFAULT 'call',
  `ended_at` DATETIME DEFAULT NULL,
  `assigned_to_id` VARCHAR(64) DEFAULT NULL,
  `assigned_to_name` VARCHAR(255) DEFAULT NULL,
  `assigned_to_email` VARCHAR(255) DEFAULT NULL,
  `assigned_by` VARCHAR(255) DEFAULT NULL,
  `assigned_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`call_id`),
  INDEX `idx_calls_phone` (`phone`),
  INDEX `idx_calls_lead_id` (`lead_id`),
  INDEX `idx_calls_created_at` (`created_at`),
  INDEX `idx_calls_status` (`status`),
  INDEX `idx_calls_assigned_to_id` (`assigned_to_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. Table: activities
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activities` (
  `id` VARCHAR(64) NOT NULL,
  `lead_id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `detail` TEXT DEFAULT NULL,
  `metadata` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_activities_lead_id` (`lead_id`),
  INDEX `idx_activities_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. Table: settings
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(128) NOT NULL,
  `value` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
