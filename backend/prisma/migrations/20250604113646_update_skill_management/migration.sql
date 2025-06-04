/*
  Warnings:

  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,companySelectedSkillId]` on the table `UserSkill` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "clientAddress" TEXT,
ADD COLUMN     "clientCity" TEXT,
ADD COLUMN     "clientCompanyName" TEXT,
ADD COLUMN     "clientContactEmail" TEXT,
ADD COLUMN     "clientContactName" TEXT,
ADD COLUMN     "clientContactPhone" TEXT,
ADD COLUMN     "clientPrefecture" TEXT,
ADD COLUMN     "clientStreetAddress" TEXT;

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "isDeprecated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address";

-- AlterTable
ALTER TABLE "UserSkill" ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "companySelectedSkillId" TEXT,
ADD COLUMN     "lastUsed" TIMESTAMP(3),
ADD COLUMN     "level" "SkillLevel",
ALTER COLUMN "skillId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GlobalSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySelectedSkill" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "globalSkillId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySelectedSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSkill_name_key" ON "GlobalSkill"("name");

-- CreateIndex
CREATE INDEX "GlobalSkill_category_idx" ON "GlobalSkill"("category");

-- CreateIndex
CREATE INDEX "CompanySelectedSkill_companyId_idx" ON "CompanySelectedSkill"("companyId");

-- CreateIndex
CREATE INDEX "CompanySelectedSkill_globalSkillId_idx" ON "CompanySelectedSkill"("globalSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySelectedSkill_companyId_globalSkillId_key" ON "CompanySelectedSkill"("companyId", "globalSkillId");

-- CreateIndex
CREATE INDEX "UserSkill_companySelectedSkillId_idx" ON "UserSkill"("companySelectedSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_companySelectedSkillId_key" ON "UserSkill"("userId", "companySelectedSkillId");

-- AddForeignKey
ALTER TABLE "CompanySelectedSkill" ADD CONSTRAINT "CompanySelectedSkill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySelectedSkill" ADD CONSTRAINT "CompanySelectedSkill_globalSkillId_fkey" FOREIGN KEY ("globalSkillId") REFERENCES "GlobalSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_companySelectedSkillId_fkey" FOREIGN KEY ("companySelectedSkillId") REFERENCES "CompanySelectedSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
