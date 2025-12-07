/*
  Warnings:

  - You are about to alter the column `create_by` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Int`.
  - You are about to alter the column `update_by` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Int`.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `create_by` INTEGER NULL,
    MODIFY `update_by` INTEGER NULL;
