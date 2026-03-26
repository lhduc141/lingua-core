-- AlterTable
ALTER TABLE "users" ADD COLUMN     "placement_skipped_at" TIMESTAMP(3),
ADD COLUMN     "survey_skipped_at" TIMESTAMP(3);
