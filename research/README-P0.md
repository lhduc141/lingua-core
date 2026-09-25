# P0 implementation — synthetic provider pilot

Authoritative base: the audited newest lingua-core.zip, SHA-256 `46c1549a0a12bfb34cdc29bba7ff184338669f9d047f83c7c271be890bc4c159`. This working copy is under `implementation-p0`; neither the original archive nor the audited extraction was edited. Historical research scripts and environment files were not copied into this implementation. No provider call or database mutation was executed.

## Architecture

Before: `LearningPlanService.generatePlan` owned selection, generation, validation and persistence in one method.

After: production constructs its DB-backed context and eligible catalog, then calls `runPlanPipeline`; its transaction and weekly review remain outside. Research imports the same pipeline and stage transport directly, with injected synthetic context/catalog and no Nest bootstrap, Prisma, queue, grading or Azure dependency. Only the two planning operations are available. Initial candidate construction receives no W. W enters both model stages, including the selection-mediated path.

`plan-pipeline.ts` contains candidate construction extracted from production, exact-N deterministic fill with diagnostics, calendar/diagnostic guards, and the shared semantic validator. `structured-plan.ts` contains both schemas, their local validator, fixed requests, usage accounting and visible attempts. `run-pilot.ts` supplies only frozen details and append-only JSONL sinks. It accepts one run, not a study schedule, and never scores WTR.

## P0 checklist

| Requirement | Status | Implementation |
|---|---|---|
| P0-1 shared pipeline | DONE | production and injected research call the same exported function; persistence stays outside |
| P0-2 canonical day | DONE | Number conversion followed by integer/range check before all counters/lookups |
| P0-3 duration | DONE | nonnull positive integer canonical duration; no AI fallback; custom disabled in research |
| P0-4 exact N | DONE | minimal selector prompt/schema; fill/invalid/duplicate counts; incomplete details fail |
| P0-5 structured output | DONE | strict provider JSON schema plus local validation; semantic validation remains separate |
| P0-6 seed/config | DONE | configurable seeds reach both stages; fixed 20B/120B; no model fallback |
| P0-7 retries/timeouts | DONE | per-request SDK maxRetries=0; visible bounded transient retries; 60-second default attempt timeout |
| P0-8 logging | DONE | null missing usage/cost; attempt transport/parse/schema statuses; final pipeline status on run record |
| P0-9 JSONL | DONE | run and attempt records, raw/final outputs, rejections/normalizations, tokens/cost/timing and failures |
| P0-10 isolation | DONE | Writing-only tags, explicit valid calendar, synthetic/persist=false required; no production write capabilities |
| P0-11 tests | DONE | 41 automated checks in research/p0.spec.ts |
| P0-12 build only | DONE | tests, full typecheck, both Nest builds, Prisma validate; no provider pilot launched |

No Prisma model/generated-type change was needed, so Prisma generation was not required. Validation used an inert localhost URL without connecting. Builds used the already installed dependency tree available on this machine (Node 24.13.0, TypeScript 5.9.3); a fresh install was not performed. Two existing e2e scaffold Supertest imports were changed to default imports to pass the full typecheck. E2e services were not started.

## Exact provider contract

- Selector `openai/gpt-oss-20b`, max_completion_tokens=2000.
- Planner `openai/gpt-oss-120b`, max_completion_tokens=4096.
- Both: temperature=0.2, n=1, stream=false, reasoning_effort=low, include_reasoning=false; reasoning_format omitted. Explicit configured seed, same request/model/seed on retry.
- response_format.type=json_schema, nested json_schema.strict=true, all declared fields required, additionalProperties=false, nullable string fields explicit.
- Retry only recognized network errors, 408/409/429/5xx; up to two retries by default with 2s/4s application delay. No schema/parse/finish-reason retry, repair prompt or alternate model. Each attempt is recorded before retry.
- A selector transport failure can invoke declared deterministic selection fill; malformed JSON/schema fails the pipeline. Exact-N applies after fill and detail resolution.

Verified on 2026-09-12 against official [Groq GPT-OSS reasoning documentation](https://console.groq.com/docs/reasoning) and [structured outputs](https://console.groq.com/docs/structured-outputs), and typechecked against the installed Groq SDK's nonstreaming request interface. Live compatibility is what the pilot will establish; it has not been assumed from a successful build.

## Output contract

`OUTPUT.jsonl.calls.jsonl`: one exact synthetic request/response record per attempt. Includes id, stage, attemptIndex, startedAt/finishedAt/elapsedMs, HTTP status, transportStatus, parseStatus, schemaStatus, pipelineStatus, finishReason/refusal/providerResponseId/systemFingerprint when available, usage, price snapshot, cost and error/retry reason. Successful stage calls have pipelineStatus=pending because semantic validation has not happened yet; join their IDs to the final run record. The AiCallLog production writer also stores this envelope in responsePayload; its legacy status denotes stage schema success, not complete plan success.

`OUTPUT.jsonl`: one final run record with research identifiers, seeds, P/C/R/W, calendar, candidatePool/hash, modelConfig, rawSelectorOutput, validatedSelection, rawSelectedCount, invalidRefs, duplicates, fillCount/fallbackUsed, rawPlannerOutput, validatedPlan, rejections, normalizations, hardConstraintResult, callAttemptReferences, usage/cost sums, stage latency and end-to-end latency. Failure records retain available partial pipeline state. Missing usage makes aggregate usage/cost unknown instead of zero. Attempt logging failures abort rather than silently losing an attempt. Stage latency sums observed attempt durations; run latency also includes application backoff and pipeline processing.

The runner rejects an existing output path, loads no .env, and requires an explicit provider flag. Input guards fail before provider work. The two fixtures use identical P/C/R/catalog/seeds and only differ in W; their IDs are not sent to the provider. Seed 17 is merely fixture configuration, not a final seed list. Catalog activities are fabricated synthetic pilot fixtures, not experiment data or a relevance matrix.

## Validation commands

From the backend root after dependencies are available:

```powershell
node node_modules/tsx/dist/cli.mjs --test research/p0.spec.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/@nestjs/cli/bin/nest.js build api-gateway
node node_modules/@nestjs/cli/bin/nest.js build ai-service
```

## Exact pilot commands — not executed

Supply GROQ_API_KEY securely in the process environment. No Azure/database credentials or application services are needed.

```powershell
node node_modules/tsx/dist/cli.mjs research/run-pilot.ts research/pilot-baseline.json research/output/pilot-baseline.jsonl --allow-provider-pilot
node node_modules/tsx/dist/cli.mjs research/run-pilot.ts research/pilot-proposed.json research/output/pilot-proposed.jsonl --allow-provider-pilot
```

These commands schedule two plan runs, nominally four provider calls before retries. Inspect schema acceptance, finish reasons, attempts, exact-N details, semantic rejections and usage. Do not treat these outputs as final experiment evidence. Pilot operation needs an externally supplied key and a fresh writable output path. No implementation blocker remains for this bounded synthetic compatibility pilot after the recorded offline checks.

**READY FOR PILOT.** Final experiment execution, WTR analysis, annotation, production grading fixes and paper edits are outside this implementation.
