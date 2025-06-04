/*
  Warnings:

  - A unique constraint covering the columns `[name,companyId]` on the table `Skill` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `Skill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Skill` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Skill_name_key";

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Skill_companyId_idx" ON "Skill"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_companyId_key" ON "Skill"("name", "companyId");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
