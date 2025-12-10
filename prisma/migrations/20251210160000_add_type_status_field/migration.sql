-- AlterTable
ALTER TABLE `dicts` ADD COLUMN `type_status` VARCHAR(10) NOT NULL DEFAULT '1';

-- CreateIndex
CREATE INDEX `idx_type_status` ON `dicts`(`type_status`);


