/*
  Warnings:

  - You are about to drop the column `managerId` on the `ProjectMembership` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectMembership" DROP CONSTRAINT "ProjectMembership_managerId_fkey";

-- DropIndex
DROP INDEX "ProjectMembership_managerId_idx";

-- AlterTable
ALTER TABLE "ProjectMembership" DROP COLUMN "managerId";
