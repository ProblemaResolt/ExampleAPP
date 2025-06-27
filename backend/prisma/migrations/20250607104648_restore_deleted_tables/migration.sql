/*
  Warnings:

  - You are about to drop the column `endTime` on the `WorkReport` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `WorkReport` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `WorkReport` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `WorkReport` table. All the data in the column will be lost.
  - You are about to drop the column `taskTitle` on the `WorkReport` table. All the data in the column will be lost.
  - Added the required column `title` to the `WorkReport` table without a default value. This is not possible if the table is not empty.
  - Made the column `duration` on table `WorkReport` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "TimeEntry_date_idx";

-- DropIndex
DROP INDEX "TimeEntry_userId_idx";

-- DropIndex
DROP INDEX "WorkReport_status_idx";

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "breakTime" INTEGER,
ADD COLUMN     "transportationCost" INTEGER,
ADD COLUMN     "workHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WorkReport" DROP COLUMN "endTime",
DROP COLUMN "progress",
DROP COLUMN "startTime",
DROP COLUMN "tags",
DROP COLUMN "taskTitle",
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'OTHER',
ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "UserWorkSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "workStartTime" TEXT DEFAULT '09:00',
    "workEndTime" TEXT DEFAULT '18:00',
    "breakTime" INTEGER NOT NULL DEFAULT 60,
    "overtimeThreshold" INTEGER NOT NULL DEFAULT 8,
    "transportationCost" INTEGER NOT NULL DEFAULT 0,
    "timeInterval" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkSettings_userId_key" ON "UserWorkSettings"("userId");

-- CreateIndex
CREATE INDEX "UserWorkSettings_userId_idx" ON "UserWorkSettings"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_date_idx" ON "TimeEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "UserWorkSettings" ADD CONSTRAINT "UserWorkSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
