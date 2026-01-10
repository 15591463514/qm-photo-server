-- CreateTable
CREATE TABLE `tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_code` VARCHAR(100) NOT NULL,
    `group_name` VARCHAR(100) NOT NULL,
    `group_status` INTEGER NOT NULL DEFAULT 1,
    `label` VARCHAR(100) NOT NULL,
    `value` VARCHAR(100) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `description` VARCHAR(500) NULL,
    `create_by` INTEGER NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_by` INTEGER NULL,
    `update_time` DATETIME(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tags_group_code_value_key`(`group_code`, `value`),
    INDEX `idx_group_code`(`group_code`),
    INDEX `idx_status`(`status`),
    INDEX `idx_group_status`(`group_status`),
    INDEX `idx_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

