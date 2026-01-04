-- CreateTable
CREATE TABLE `notification_rule` (
    `rule_id` BIGINT NOT NULL AUTO_INCREMENT,
    `rule_name` VARCHAR(100) NOT NULL,
    `msg_source` VARCHAR(50) NOT NULL,
    `msg_type` VARCHAR(50) NOT NULL,
    `notice_mode` INTEGER NOT NULL DEFAULT 3,
    `notice_address` VARCHAR(500) NOT NULL,
    `notice_address_name` VARCHAR(100) NULL,
    `handler_script` TEXT NULL,
    `create_username` VARCHAR(50) NULL,
    `update_username` VARCHAR(50) NULL,
    `notice_status` INTEGER NOT NULL DEFAULT 1,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_msg_source`(`msg_source`),
    INDEX `idx_msg_type`(`msg_type`),
    INDEX `idx_notice_status`(`notice_status`),
    INDEX `idx_msg_source_msg_type_status`(`msg_source`, `msg_type`, `notice_status`),
    PRIMARY KEY (`rule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_info` (
    `info_id` BIGINT NOT NULL AUTO_INCREMENT,
    `msg_source` VARCHAR(50) NOT NULL,
    `msg_type` VARCHAR(50) NOT NULL,
    `notice_content` TEXT NULL,
    `notice_mode` INTEGER NOT NULL,
    `notice_success` INTEGER NOT NULL DEFAULT 0,
    `notice_total` INTEGER NOT NULL DEFAULT 0,
    `notice_time` DATETIME(0) NOT NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_msg_source`(`msg_source`),
    INDEX `idx_msg_type`(`msg_type`),
    INDEX `idx_notice_time`(`notice_time`),
    INDEX `idx_msg_source_msg_type`(`msg_source`, `msg_type`),
    PRIMARY KEY (`info_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `info_id` BIGINT NOT NULL,
    `rule_id` BIGINT NULL,
    `notice_mode` INTEGER NOT NULL,
    `notice_address` VARCHAR(500) NOT NULL,
    `notice_result` VARCHAR(100) NULL,
    `notice_result_time` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_info_id`(`info_id`),
    INDEX `idx_rule_id`(`rule_id`),
    INDEX `idx_notice_result`(`notice_result`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_log` ADD CONSTRAINT `notification_log_info_id_fkey` FOREIGN KEY (`info_id`) REFERENCES `notification_info`(`info_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_log` ADD CONSTRAINT `notification_log_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `notification_rule`(`rule_id`) ON DELETE SET NULL ON UPDATE CASCADE;

