-- CreateTable
CREATE TABLE `dicts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type_code` VARCHAR(100) NOT NULL,
    `type_name` VARCHAR(100) NOT NULL,
    `data_label` VARCHAR(100) NOT NULL,
    `data_value` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(10) NOT NULL DEFAULT '1',
    `tag_style` VARCHAR(100) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `create_by` INTEGER NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_by` INTEGER NULL,
    `update_time` DATETIME(0) NULL,
    `remark` VARCHAR(500) NULL,

    INDEX `idx_type_code`(`type_code`),
    INDEX `idx_status`(`status`),
    INDEX `idx_sort_order`(`sort_order`),
    INDEX `idx_create_time`(`create_time`),
    UNIQUE INDEX `dicts_type_code_data_value_key`(`type_code`, `data_value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
