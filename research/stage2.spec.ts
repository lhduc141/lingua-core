import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateFreeze, makeInput } from "./run-experiment";

test("validate-only contract has 12 profiles, 72 entries and counterbalanced pairs", () => {
  const f = validateFreeze();
  assert.equal(f.summary.runs, 72);
  assert.equal(f.summary.pairs, 36);
  const first = f.schedule.filter((_, i) => i % 2 === 0);
  assert.equal(first.filter((e) => e.condition === "baseline").length, 18);
});
test("each paired input differs only in W and metadata, with identical catalog and seeds", () => {
  const f = validateFreeze();
  for (let i = 0; i < 72; i += 2) {
    const a = f.schedule[i],
      b = f.schedule[i + 1],
      p = f.profiles.find((p) => p.profileId === a.profileId);
    const x = makeInput(p, a, f.config, f.snapshot),
      y = makeInput(p, b, f.config, f.snapshot);
    assert.deepEqual(x.catalog, y.catalog);
    assert.deepEqual(x.config, y.config);
    assert.deepEqual(
      { ...x.context, recentWeaknesses: [] },
      { ...y.context, recentWeaknesses: [] },
    );
    assert.equal(
      x.context.recentWeaknesses.length + y.context.recentWeaknesses.length,
      1,
    );
    assert.equal(x.persist, false);
  }
});
test("validation calls no network sockets or provider client", () => {
  const net = require("node:net");
  let calls = 0;
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function () {
    calls++;
    throw Error("Network forbidden in validate-only");
  };
  try {
    validateFreeze();
    assert.equal(calls, 0);
  } finally {
    net.Socket.prototype.connect = original;
  }
});
test("changed artifact rejected before provider work", () => {
  // Only a minimal manifest is needed to test fail-closed hashing; no source mutation.
  const root = resolve(__dirname, "..");
  const temp = mkdtempSync(join(root, ".stage2-negative-"));
  mkdirSync(join(temp, "research/freeze"), { recursive: true });
  for (const name of [
    "profiles.json",
    "experiment-config.json",
    "run-schedule.json",
    "catalog-snapshot.json",
    "freeze-manifest.json",
  ])
    writeFileSync(
      join(temp, "research/freeze", name),
      readFileSync(join(root, "research/freeze", name)),
    );
  writeFileSync(join(temp, "research/freeze/profiles.json"), "[]");
  assert.throws(() => validateFreeze(temp), /hash mismatch/);
});
