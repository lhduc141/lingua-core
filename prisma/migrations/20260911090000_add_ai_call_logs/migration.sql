-- CreateTable
CREATE TABLE "ai_call_logs" (
    "ai_call_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correlation_id" UUID,
    "feature" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'groq',
    "model" TEXT NOT NULL,
    "status" "ai_call_status" NOT NULL DEFAULT 'pending',
    "attempt_index" INTEGER NOT NULL DEFAULT 0,
    "credential_slot" INTEGER,
    "request_payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "provider_response_id" TEXT,
    "prompt_tokens" INTEGER,
    "cached_prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "reasoning_tokens" INTEGER,
    "total_tokens" INTEGER,
    "input_price_per_million" DECIMAL(12,6),
    "cached_input_price_per_million" DECIMAL(12,6),
    "output_price_per_million" DECIMAL(12,6),
    "estimated_cost_usd" DECIMAL(16,10),
    "queue_time_ms" DOUBLE PRECISION,
    "prompt_time_ms" DOUBLE PRECISION,
    "completion_time_ms" DOUBLE PRECISION,
    "total_time_ms" DOUBLE PRECISION,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("ai_call_log_id")
);

-- CreateIndex
CREATE INDEX "ai_call_logs_correlation_id_idx" ON "ai_call_logs"("correlation_id");

-- CreateIndex
CREATE INDEX "ai_call_logs_feature_stage_created_at_idx" ON "ai_call_logs"("feature", "stage", "created_at");

-- CreateIndex
CREATE INDEX "ai_call_logs_model_created_at_idx" ON "ai_call_logs"("model", "created_at");
