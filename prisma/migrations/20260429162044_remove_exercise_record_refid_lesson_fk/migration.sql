-- DropForeignKey
ALTER TABLE "exercise_records" DROP CONSTRAINT "exercise_records_ref_id_fkey";

-- CreateIndex
CREATE INDEX "exercise_records_user_id_ref_type_ref_id_idx" ON "exercise_records"("user_id", "ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "exercise_records_ref_type_ref_id_idx" ON "exercise_records"("ref_type", "ref_id");
