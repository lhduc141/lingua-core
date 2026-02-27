-- AlterTable
ALTER TABLE "learning_plan_items" ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimated_minutes" INTEGER,
ADD COLUMN     "feedback_submitted_at" TIMESTAMP(3),
ADD COLUMN     "rationale" TEXT,
ADD COLUMN     "skill_name" TEXT,
ADD COLUMN     "submitted_text" TEXT,
ADD COLUMN     "task_score" DECIMAL(4,2),
ADD COLUMN     "user_feedback" TEXT,
ADD COLUMN     "week_number" INTEGER;

-- CreateIndex
CREATE INDEX "learning_plan_items_user_id_plan_cycle_week_number_idx" ON "learning_plan_items"("user_id", "plan_cycle", "week_number");

-- CreateIndex
CREATE INDEX "learning_plan_items_user_id_item_type_status_idx" ON "learning_plan_items"("user_id", "item_type", "status");
