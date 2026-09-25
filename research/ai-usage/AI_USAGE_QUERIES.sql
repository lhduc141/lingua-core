-- LinguaPanda AI usage inspection helpers (PostgreSQL)
-- The token counts below are provider-reported by Groq, not local estimates.

-- 1) Latest AI calls
SELECT
    created_at,
    correlation_id,
    feature,
    stage,
    model,
    status,
    attempt_index,
    credential_slot,
    prompt_tokens,
    cached_prompt_tokens,
    completion_tokens,
    reasoning_tokens,
    total_tokens,
    estimated_cost_usd,
    total_time_ms
FROM ai_call_logs
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 100;

-- 2) One learning-plan run. Replace the UUID with aiTraceId returned by POST /learning-plan/generate.
SELECT
    created_at,
    stage,
    model,
    status,
    prompt_tokens,
    cached_prompt_tokens,
    completion_tokens,
    reasoning_tokens,
    total_tokens,
    estimated_cost_usd,
    total_time_ms
FROM ai_call_logs
WHERE correlation_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND feature = 'learning_plan'
  AND deleted_at IS NULL
ORDER BY created_at, attempt_index;

-- 3) Total tokens/cost for one learning-plan run.
-- Sum only successful provider calls so failed/retried requests do not duplicate a successful result.
SELECT
    correlation_id,
    SUM(prompt_tokens) AS prompt_tokens,
    SUM(cached_prompt_tokens) AS cached_prompt_tokens,
    SUM(completion_tokens) AS completion_tokens,
    SUM(reasoning_tokens) AS reasoning_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost_usd) AS estimated_cost_usd
FROM ai_call_logs
WHERE correlation_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND feature = 'learning_plan'
  AND status = 'success'
  AND deleted_at IS NULL
GROUP BY correlation_id;

-- 4) Exact prompt and model response for one call.
SELECT
    ai_call_log_id,
    correlation_id,
    feature,
    stage,
    model,
    request_payload #>> '{request,messages,1,content}' AS exact_user_prompt,
    response_payload #>> '{choices,0,message,content}' AS exact_model_response,
    response_payload -> 'usage' AS provider_usage
FROM ai_call_logs
WHERE ai_call_log_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 5) Aggregate usage by model and stage.
SELECT
    model,
    feature,
    stage,
    COUNT(*) FILTER (WHERE status = 'success') AS successful_calls,
    SUM(prompt_tokens) FILTER (WHERE status = 'success') AS prompt_tokens,
    SUM(cached_prompt_tokens) FILTER (WHERE status = 'success') AS cached_prompt_tokens,
    SUM(completion_tokens) FILTER (WHERE status = 'success') AS completion_tokens,
    SUM(reasoning_tokens) FILTER (WHERE status = 'success') AS reasoning_tokens,
    SUM(total_tokens) FILTER (WHERE status = 'success') AS total_tokens,
    SUM(estimated_cost_usd) FILTER (WHERE status = 'success') AS estimated_cost_usd
FROM ai_call_logs
WHERE deleted_at IS NULL
GROUP BY model, feature, stage
ORDER BY model, feature, stage;

-- 6) Verify persisted learning-plan metadata against the authoritative lesson/question-set metadata.
-- After the V3 validator fix, content-linked plan items should match source duration/skill/type.
SELECT
    lpi.item_id,
    lpi.title AS plan_title,
    lpi.item_type,
    lpi.ref_type,
    lpi.ref_id,
    lpi.skill_name AS plan_skill,
    lpi.estimated_minutes AS plan_minutes,
    COALESCE(l.skill_name::text, qs.skill_name::text) AS source_skill,
    COALESCE(l.estimated_minutes, qs.estimated_minutes) AS source_minutes,
    CASE
        WHEN lpi.ref_type = 'lesson' THEN 'lesson'
        WHEN lpi.ref_type = 'question_set' THEN 'practice_session'
        ELSE NULL
    END AS expected_item_type
FROM learning_plan_items lpi
LEFT JOIN lessons l
    ON lpi.ref_type = 'lesson' AND lpi.ref_id = l.lesson_id
LEFT JOIN question_sets qs
    ON lpi.ref_type = 'question_set' AND lpi.ref_id = qs.question_set_id
WHERE lpi.deleted_at IS NULL
  AND lpi.ref_id IS NOT NULL
ORDER BY lpi.created_at DESC;
