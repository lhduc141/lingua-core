-- AlterEnum
ALTER TYPE "skill_name" ADD VALUE 'listening';

-- AlterTable
ALTER TABLE "passages" ADD COLUMN     "audio_url" TEXT;

-- AddForeignKey
ALTER TABLE "exercise_records" ADD CONSTRAINT "exercise_records_ref_id_fkey" FOREIGN KEY ("ref_id") REFERENCES "lessons"("lesson_id") ON DELETE RESTRICT ON UPDATE CASCADE;
