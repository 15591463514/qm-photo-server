-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `nick_name` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `avatar` VARCHAR(500) NULL,
    `user_phone` VARCHAR(20) NULL,
    `user_gender` VARCHAR(10) NULL DEFAULT 'unknown',
    `status` VARCHAR(10) NOT NULL DEFAULT '1',
    `create_by` VARCHAR(50) NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_by` VARCHAR(50) NULL,
    `update_time` DATETIME(0) NULL,
    `remark` VARCHAR(500) NULL,

    UNIQUE INDEX `users_user_name_key`(`user_name`),
    INDEX `idx_status`(`status`),
    INDEX `idx_create_time`(`create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(50) NOT NULL,
    `role_code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(500) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` DATETIME(0) NULL,

    UNIQUE INDEX `roles_role_code_key`(`role_code`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menus` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT NOT NULL DEFAULT 0,
    `name` VARCHAR(100) NOT NULL,
    `path` VARCHAR(200) NOT NULL,
    `component` VARCHAR(500) NULL,
    `title` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(100) NULL,
    `is_hide` BOOLEAN NOT NULL DEFAULT false,
    `is_hide_tab` BOOLEAN NOT NULL DEFAULT false,
    `link` VARCHAR(500) NULL,
    `is_iframe` BOOLEAN NOT NULL DEFAULT false,
    `keep_alive` BOOLEAN NOT NULL DEFAULT false,
    `is_first_level` BOOLEAN NOT NULL DEFAULT false,
    `fixed_tab` BOOLEAN NOT NULL DEFAULT false,
    `active_path` VARCHAR(200) NULL,
    `is_full_page` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(10) NOT NULL DEFAULT '1',
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` DATETIME(0) NULL,

    INDEX `idx_parent_id`(`parent_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_sort_order`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_buttons` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `menu_id` BIGINT NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `auth_mark` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_menu_id`(`menu_id`),
    UNIQUE INDEX `menu_buttons_menu_id_auth_mark_key`(`menu_id`, `auth_mark`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_role_id`(`role_id`),
    UNIQUE INDEX `user_roles_user_id_role_id_key`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_menus` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT NOT NULL,
    `menu_id` BIGINT NOT NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_role_id`(`role_id`),
    INDEX `idx_menu_id`(`menu_id`),
    UNIQUE INDEX `role_menus_role_id_menu_id_key`(`role_id`, `menu_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_menu_buttons` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT NOT NULL,
    `menu_id` BIGINT NOT NULL,
    `button_id` BIGINT NOT NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_role_id`(`role_id`),
    INDEX `idx_menu_id`(`menu_id`),
    UNIQUE INDEX `role_menu_buttons_role_id_menu_id_button_id_key`(`role_id`, `menu_id`, `button_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `menus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_buttons` ADD CONSTRAINT `menu_buttons_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_menus` ADD CONSTRAINT `role_menus_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_menus` ADD CONSTRAINT `role_menus_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_menu_buttons` ADD CONSTRAINT `role_menu_buttons_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_menu_buttons` ADD CONSTRAINT `role_menu_buttons_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_menu_buttons` ADD CONSTRAINT `role_menu_buttons_button_id_fkey` FOREIGN KEY (`button_id`) REFERENCES `menu_buttons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
