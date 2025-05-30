/*
  Warnings:

  - You are about to drop the column `managerId` on the `Project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_managerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managedCompanyId_fkey";

-- DropIndex
DROP INDEX "Project_managerId_idx";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "managerId";

-- AlterTable
ALTER TABLE "ProjectMembership" ADD COLUMN     "isManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerId" TEXT;

-- CreateIndex
CREATE INDEX "ProjectMembership_projectId_idx" ON "ProjectMembership"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMembership_userId_idx" ON "ProjectMembership"("userId");

-- CreateIndex
CREATE INDEX "ProjectMembership_managerId_idx" ON "ProjectMembership"("managerId");

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
