-- AlterTable
ALTER TABLE "practice_sessions" ADD COLUMN     "lesson_id" UUID;

-- CreateIndex
CREATE INDEX "practice_sessions_lesson_id_idx" ON "practice_sessions"("lesson_id");

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("lesson_id") ON DELETE SET NULL ON UPDATE CASCADE;
