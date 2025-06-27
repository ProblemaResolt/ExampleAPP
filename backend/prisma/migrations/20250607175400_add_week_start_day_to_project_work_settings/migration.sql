-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'COMPANY', 'PROJECT', 'REGIONAL');

-- CreateTable
CREATE TABLE "ProjectWorkSettings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardHours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "workStartTime" TEXT DEFAULT '09:00',
    "workEndTime" TEXT DEFAULT '18:00',
    "breakDuration" INTEGER NOT NULL DEFAULT 60,
    "overtimeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "flexTimeStart" TEXT,
    "flexTimeEnd" TEXT,
    "coreTimeStart" TEXT,
    "coreTimeEnd" TEXT,
    "isFlexTime" BOOLEAN NOT NULL DEFAULT false,
    "workLocation" TEXT,
    "address" TEXT,
    "transportationCostDefault" INTEGER DEFAULT 0,
    "weekStartDay" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWorkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectHolidaySettings" (
    "id" TEXT NOT NULL,
    "projectWorkSettingsId" TEXT NOT NULL,
    "holidayDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "holidayType" "HolidayType" NOT NULL DEFAULT 'NATIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectHolidaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProjectWorkSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectWorkSettingsId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProjectWorkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectWorkSettings_projectId_idx" ON "ProjectWorkSettings"("projectId");

-- CreateIndex
CREATE INDEX "ProjectHolidaySettings_projectWorkSettingsId_idx" ON "ProjectHolidaySettings"("projectWorkSettingsId");

-- CreateIndex
CREATE INDEX "ProjectHolidaySettings_holidayDate_idx" ON "ProjectHolidaySettings"("holidayDate");

-- CreateIndex
CREATE INDEX "UserProjectWorkSettings_userId_idx" ON "UserProjectWorkSettings"("userId");

-- CreateIndex
CREATE INDEX "UserProjectWorkSettings_projectWorkSettingsId_idx" ON "UserProjectWorkSettings"("projectWorkSettingsId");

-- CreateIndex
CREATE INDEX "UserProjectWorkSettings_startDate_idx" ON "UserProjectWorkSettings"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserProjectWorkSettings_userId_projectWorkSettingsId_startD_key" ON "UserProjectWorkSettings"("userId", "projectWorkSettingsId", "startDate");

-- AddForeignKey
ALTER TABLE "ProjectWorkSettings" ADD CONSTRAINT "ProjectWorkSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHolidaySettings" ADD CONSTRAINT "ProjectHolidaySettings_projectWorkSettingsId_fkey" FOREIGN KEY ("projectWorkSettingsId") REFERENCES "ProjectWorkSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectWorkSettings" ADD CONSTRAINT "UserProjectWorkSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectWorkSettings" ADD CONSTRAINT "UserProjectWorkSettings_projectWorkSettingsId_fkey" FOREIGN KEY ("projectWorkSettingsId") REFERENCES "ProjectWorkSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
