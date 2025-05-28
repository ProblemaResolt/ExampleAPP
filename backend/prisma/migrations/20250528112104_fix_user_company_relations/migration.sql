/*
  Warnings:

  - You are about to drop the `_ProjectMembers` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[managedCompanyId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "_ProjectMembers" DROP CONSTRAINT "_ProjectMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectMembers" DROP CONSTRAINT "_ProjectMembers_B_fkey";

-- DropIndex
DROP INDEX "Project_companyId_idx";

-- DropIndex
DROP INDEX "Project_managerId_idx";

-- DropIndex
DROP INDEX "Project_status_idx";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "startDate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managedCompanyId" TEXT,
ALTER COLUMN "password" SET NOT NULL;

-- DropTable
DROP TABLE "_ProjectMembers";

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembership_projectId_userId_key" ON "ProjectMembership"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Company_managerId_idx" ON "Company"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_managedCompanyId_key" ON "User"("managedCompanyId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_managedCompanyId_idx" ON "User"("managedCompanyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedCompanyId_fkey" FOREIGN KEY ("managedCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
