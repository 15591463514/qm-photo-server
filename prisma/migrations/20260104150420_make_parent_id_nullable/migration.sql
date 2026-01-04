-- DropForeignKey
ALTER TABLE `menus` DROP FOREIGN KEY `menus_parent_id_fkey`;

-- AlterTable
ALTER TABLE `menus` MODIFY `parent_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `menus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

