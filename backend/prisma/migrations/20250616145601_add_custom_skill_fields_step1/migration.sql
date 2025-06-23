-- AlterTable
ALTER TABLE "CompanySelectedSkill" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skillName" TEXT,
ALTER COLUMN "globalSkillId" DROP NOT NULL;
