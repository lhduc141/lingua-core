import assert from "node:assert/strict";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import {
  buildCandidatePool,
  guardContext,
  WRITING_TAGS,
} from "../apps/api-gateway/src/modules/learning-plan/plan-pipeline";
import { requestFor } from "../apps/ai-service/src/planning/structured-plan";
import { runResearch } from "./run-pilot";

export const EXPECTED_POOLS = {
  A2: "cd1e16737e9872acc97ca751c5cbab1caf6e744ee17bf4e031c3a211fd82f8c6",
  B1: "6e8adb98ed81e11a7e26c709957344a37ab17072dd4f8715fa70c1e777459457",
  B2: "473ac6cbf3e8a5e7a78e010a10edcba1475daa12215ebf6888993fcb9adeacb8",
};
const sha = (b: string | Buffer) =>
  createHash("sha256").update(b).digest("hex");
const json = (file: string) =>
  JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const canonical = (v: unknown) => sha(JSON.stringify(v));
const criteria = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammatical Range & Accuracy",
};
const sharedC = {
  primaryGoal: "communication",
  targetGoal: "Improve written English communication",
  focusSkills: ["writing"],
  planSkills: ["reading", "writing", "speaking"],
  availableDays: ["MONDAY", "WEDNESDAY", "FRIDAY", "SATURDAY"],
  plannedStudyHoursPerWeek: 4,
  dailyMinutesLimit: 60,
};
export function makeInput(
  profile: any,
  entry: any,
  config: any,
  snapshot: any,
) {
  const pool = snapshot.candidatePoolsByCefr[profile.P];
  const ids = new Set(pool.map((i) => i.fullRefId));
  return {
    synthetic: true,
    persist: false,
    meta: {
      experimentId: config.experimentId,
      runId: entry.runId,
      pairId: entry.pairId,
      profileId: profile.profileId,
      condition: entry.condition,
      repeat: entry.repeat,
    },
    context: {
      cefrLevel: profile.P,
      contentTargetLevel: profile.P,
      learnerContext: profile.C,
      skillPerformance: profile.R,
      recentWeaknesses:
        entry.condition === "baseline" ? [] : [profile.proposedWeakness],
      weekStartDate: config.weekStartDate,
      weekEndDate: config.weekEndDate,
      weekDates: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ].map((weekday, i) => ({
        day: i + 1,
        weekday,
        date: `2026-09-${14 + i}`,
      })),
    },
    catalog: {
      lessons: snapshot.catalog.lessons.filter((i) => ids.has(i.lessonId)),
      questionSets: snapshot.catalog.questionSets.filter((i) =>
        ids.has(i.questionSetId),
      ),
      details: snapshot.catalog.details.filter((i) => ids.has(i.fullRefId)),
    },
    config: {
      selectorSeed: entry.seed,
      plannerSeed: entry.seed,
      selectionTarget: config.selectionTarget,
      maxRetries: config.maxRetries,
      timeoutMs: config.timeoutMs,
    },
  };
}
export function validateFreeze(root = resolve(__dirname, "..")) {
  const dir = join(root, "research/freeze"),
    manifest = json(join(dir, "freeze-manifest.json"));
  const profiles = json(join(dir, "profiles.json")),
    config = json(join(dir, "experiment-config.json")),
    schedule = json(join(dir, "run-schedule.json")),
    snapshot = json(join(dir, "catalog-snapshot.json"));
  assert.equal(manifest.annotationStatus, "FROZEN_AI_ASSISTED_SECOND_PASS");
  assert.equal(manifest.experimentStatus, "FROZEN_READY_TO_RUN");
  for (const [file, expected] of Object.entries(
    manifest.stage2FileHashes as Record<string, string>,
  )) {
    const path = resolve(root, file);
    assert.ok(path.startsWith(root + require("path").sep));
    assert.equal(
      sha(readFileSync(path)),
      expected,
      `File hash mismatch: ${file}`,
    );
  }
  for (const file of [
    "profiles.json",
    "experiment-config.json",
    "run-schedule.json",
  ])
    assert.ok(manifest.stage2FileHashes["research/freeze/" + file]);
  for (const file of [
    "apps/ai-service/src/prompts/plan.prompt.ts",
    "apps/ai-service/src/planning/structured-plan.ts",
    "apps/api-gateway/src/modules/learning-plan/plan-pipeline.ts",
    "research/run-experiment.ts",
    "research/run-pilot.ts",
  ])
    assert.ok(manifest.stage2FileHashes[file]);
  assert.equal(
    sha(readFileSync(join(dir, "relevance-matrix.csv"))),
    manifest.relevanceMatrixSha256,
    "Relevance matrix mismatch",
  );
  for (const [file, key] of [
    ["annotation-guideline.md", "annotationGuidelineSha256"],
    ["annotation-review.csv", "annotationReviewSha256"],
    ["annotation-second-pass-changes.csv", "secondPassChangesSha256"],
  ])
    assert.equal(sha(readFileSync(join(dir, file))), manifest[key], file);
  const payload = { ...snapshot };
  delete payload.snapshotSha256;
  assert.equal(canonical(payload), manifest.catalogSnapshotSha256);
  assert.equal(snapshot.snapshotSha256, manifest.catalogSnapshotSha256);
  assert.equal(snapshot.sourceDbSha256, manifest.sourceDbSha256);
  assert.deepEqual(config, {
    experimentId: "writing-w-ablation-v1",
    selectorModel: "openai/gpt-oss-20b",
    plannerModel: "openai/gpt-oss-120b",
    temperature: 0.2,
    selectorMaxCompletionTokens: 2000,
    plannerMaxCompletionTokens: 4096,
    strictJsonSchema: true,
    include_reasoning: false,
    reasoning_effort: "low",
    n: 1,
    stream: false,
    maxRetries: 2,
    timeoutMs: 60000,
    selectionTarget: 8,
    allowCustomActivity: false,
    seeds: [101, 202, 303],
    weekStartDate: "2026-09-14",
    weekEndDate: "2026-09-20",
    expectedProfiles: 12,
    expectedRuns: 72,
    expectedNominalStageCalls: 144,
  });
  const expectedIds = Object.keys(EXPECTED_POOLS).flatMap((level) =>
    Object.keys(criteria).map((k) => `${level}_${k}`),
  );
  assert.equal(profiles.length, 12);
  assert.deepEqual(profiles.map((p) => p.profileId).sort(), expectedIds.sort());
  for (const p of profiles) {
    const [level, k] = p.profileId.split("_");
    assert.equal(p.P, level);
    assert.deepEqual(p.C, sharedC);
    assert.deepEqual(p.R, [{ skill: "writing", avg: 60 }]);
    assert.deepEqual(p.baselineWeaknesses, []);
    assert.deepEqual(p.proposedWeakness, {
      skill: "writing",
      criterion: criteria[k],
      tag: WRITING_TAGS[criteria[k]],
      severity: "high",
      score: 5,
    });
  }
  assert.equal(schedule.length, 72);
  assert.equal(new Set(schedule.map((e) => e.runId)).size, 72);
  assert.equal(schedule.filter((e) => e.condition === "baseline").length, 36);
  assert.equal(schedule.filter((e) => e.condition === "proposed").length, 36);
  const pairs = new Map<string, any[]>();
  for (const [i, e] of schedule.entries()) {
    assert.equal(e.runIndex, i + 1);
    assert.ok(profiles.some((p) => p.profileId === e.profileId));
    assert.ok(["baseline", "proposed"].includes(e.condition));
    assert.equal(e.seed, config.seeds[e.repeat - 1]);
    assert.equal(e.pairId, `${e.profileId}_seed${e.seed}`);
    assert.equal(e.runId, `${e.pairId}_${e.condition}`);
    pairs.set(e.pairId, [...(pairs.get(e.pairId) ?? []), e]);
  }
  assert.equal(pairs.size, 36);
  let pairIndex = 0;
  for (const entries of pairs.values()) {
    assert.equal(entries.length, 2);
    assert.equal(entries[0].profileId, entries[1].profileId);
    assert.equal(entries[0].seed, entries[1].seed);
    assert.equal(entries[1].runIndex, entries[0].runIndex + 1);
    assert.deepEqual(
      entries.map((e) => e.condition),
      pairIndex++ % 2 ? ["proposed", "baseline"] : ["baseline", "proposed"],
    );
  }
  const ids = snapshot.catalog.details.map((d) => d.fullRefId);
  assert.equal(ids.length, 72);
  assert.equal(new Set(ids).size, 72);
  for (const level of Object.keys(EXPECTED_POOLS)) {
    const pool = snapshot.candidatePoolsByCefr[level];
    assert.equal(pool.length, 24);
    assert.equal(canonical(pool), EXPECTED_POOLS[level]);
    assert.equal(
      manifest.candidatePoolHashesByCefr[level],
      EXPECTED_POOLS[level],
    );
    for (const i of pool) {
      assert.equal(i.cefrLevel, level);
      const d = snapshot.catalog.details.find(
        (d) => d.fullRefId === i.fullRefId,
      );
      assert.ok(d);
      for (const key of [
        "title",
        "itemType",
        "skillName",
        "cefrLevel",
        "estimatedMinutes",
      ])
        assert.equal(d[key], i[key]);
      assert.ok(Number.isInteger(d.estimatedMinutes) && d.estimatedMinutes > 0);
    }
  }
  for (const e of schedule) {
    const p = profiles.find((p) => p.profileId === e.profileId),
      input = makeInput(p, e, config, snapshot);
    guardContext(input.context, true);
    const generated = buildCandidatePool(
      input.catalog.lessons,
      input.catalog.questionSets,
      p.P,
      p.C.focusSkills,
      p.C.planSkills,
      24,
    );
    assert.equal(
      canonical(generated),
      EXPECTED_POOLS[p.P],
      "Shared candidate construction differs from frozen pool",
    );
    for (const stage of ["selector", "planner"] as const) {
      const req = requestFor(stage, {
        ...input.context,
        goals: p.C,
        seed: e.seed,
        allowCustomActivity: false,
      });
      assert.equal(req.seed, e.seed);
      assert.equal(
        req.model,
        stage === "selector" ? config.selectorModel : config.plannerModel,
      );
      assert.equal(req.temperature, config.temperature);
      assert.equal(
        req.max_completion_tokens,
        stage === "selector" ? 2000 : 4096,
      );
      assert.equal(req.include_reasoning, false);
      assert.equal(req.reasoning_effort, "low");
      assert.equal(req.n, 1);
      assert.equal(req.stream, false);
      assert.equal(req.response_format?.type, "json_schema");
      assert.equal((req.response_format as any).json_schema.strict, true);
      if (stage === "planner")
        assert.deepEqual(
          (req.response_format as any).json_schema.schema.properties.planItems
            .items.properties.itemType.enum,
          ["lesson", "practice_session"],
        );
    }
  }
  return {
    root,
    manifest,
    profiles,
    config,
    schedule,
    snapshot,
    summary: {
      status: "PASS",
      profiles: 12,
      runs: 72,
      baseline: 36,
      proposed: 36,
      pairs: 36,
      seeds: [101, 202, 303],
      candidatePoolHashes: EXPECTED_POOLS,
      providerCalls: 0,
      dbCalls: 0,
      azureCalls: 0,
      customActivities: false,
    },
  };
}
// Validation has no client constructor or application bootstrap. Provider creation is explicit and late.
export async function main(args = process.argv.slice(2)) {
  assert.ok(
    args.length === 1 && ["--validate-only", "--run"].includes(args[0]),
    "Use --validate-only or explicit --run",
  );
  const frozen = validateFreeze();
  if (args[0] === "--validate-only") {
    console.log(JSON.stringify(frozen.summary, null, 2));
    return;
  }
  if (!process.env.GROQ_API_KEY)
    throw Error("GROQ_API_KEY must be supplied externally; no .env is loaded");
  const out = join(frozen.root, "research/output", frozen.config.experimentId);
  // Exclusive directory creation prevents accidental restarts, overwrite, or duplicate append.
  mkdirSync(join(frozen.root, "research/output"), { recursive: true });
  mkdirSync(out);
  const handles = Object.fromEntries(
    ["runs", "calls", "validation"].map((n) => [
      n,
      openSync(join(out, n + ".jsonl"), "ax"),
    ]),
  );
  const append = (name: string, value: any) => {
    writeSync(handles[name], JSON.stringify(value) + "\n");
    fsyncSync(handles[name]);
  };
  const { Groq } = await import("groq-sdk");
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    maxRetries: 0,
    timeout: 60000,
  });
  const summary: any = {
    experimentId: frozen.config.experimentId,
    expectedRuns: 72,
    completed: 0,
    succeeded: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    status: "running",
  };
  try {
    for (const e of frozen.schedule) {
      const input = makeInput(
        frozen.profiles.find((p) => p.profileId === e.profileId),
        e,
        frozen.config,
        frozen.snapshot,
      );
      const result = await runResearch(
        input,
        client,
        (a) => append("calls", a),
        (r) => {
          append("runs", {
            ...r,
            freezeManifestSha256: sha(
              readFileSync(
                join(frozen.root, "research/freeze/freeze-manifest.json"),
              ),
            ),
          });
          append("validation", {
            runId: r.runId,
            pipelineStatus: r.pipelineStatus,
            candidatePoolHash: r.candidatePoolHash,
            hardConstraintResult: r.hardConstraintResult,
            rejections: r.rejections,
            normalizations: r.normalizations,
            failure: r.failure,
          });
          assert.equal(
            r.candidatePoolHash,
            EXPECTED_POOLS[input.context.cefrLevel],
          );
        },
      );
      summary.completed++;
      summary[result.pipelineStatus === "success" ? "succeeded" : "failed"]++;
    }
    summary.status = "completed";
  } catch (e) {
    summary.status = "aborted";
    summary.error = String(e.message);
    throw e;
  } finally {
    summary.finishedAt = new Date().toISOString();
    for (const fd of Object.values(handles)) closeSync(fd);
    writeFileSync(
      join(out, "run-summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
      { flag: "wx" },
    );
  }
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
