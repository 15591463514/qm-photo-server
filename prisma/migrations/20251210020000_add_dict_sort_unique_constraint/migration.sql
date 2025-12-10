-- AlterTable
ALTER TABLE `dicts` ADD UNIQUE INDEX `dicts_type_code_sort_order_key`(`type_code`, `sort_order`);


