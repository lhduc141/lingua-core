-- AlterTable
ALTER TABLE "onboarding_surveys" ADD COLUMN     "difficulties" JSONB,
ADD COLUMN     "self_assessed_level" TEXT,
ADD COLUMN     "usage_context" TEXT;
