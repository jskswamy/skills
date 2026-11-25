import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Instruction contracts for the codebase plugin (spec: 2026-11-25-codebase-architecture-design).
const skill = (s) => readFile(`skills/codebase/${s}/SKILL.md`, "utf8");
const ref = (s, f) => readFile(`skills/codebase/${s}/references/${f}`, "utf8");

// Skills that check index freshness, and skills that offer a shareable snapshot.
const FRESH = ["ask", "graph", "impact", "explore", "capabilities", "seams"];
const SHARE = ["ask", "graph", "impact", "capabilities", "seams"];

test("freshness copies are identical", async () => {
  const canonical = await ref("ask", "freshness.md");
  for (const s of FRESH) assert.equal(await ref(s, "freshness.md"), canonical, s);
});

test("freshness defines dirty_hash from git diff HEAD", async () => {
  const text = await ref("ask", "freshness.md");
  assert.match(text, /last_indexed_commit/);
  assert.match(text, /git diff HEAD \| git hash-object --stdin/);
  assert.match(text, /time alone never/i);
});

test("never blocks the edit-only refresh", async () => {
  const text = await ref("ask", "freshness.md");
  assert.match(text, /uncommitted.*fast.*without asking/i);
  assert.match(text, /auto_index: never/);
  assert.match(text, /from source inspection; graph unavailable\/stale for/);
});

test("other repos are tracked locally, never written", async () => {
  const text = await ref("ask", "freshness.md");
  assert.match(text, /projects:/);
  assert.match(text, /never writes? (?:files )?into another repo/i);
  assert.match(text, /--link/);
});

test("skills point to freshness and drop the 24h rule", async () => {
  for (const s of FRESH) {
    const text = await skill(s);
    assert.match(text, /references\/freshness\.md/, s);
    assert.doesNotMatch(text, /24 ?h|24 hours|\$>24\$/, s);
  }
});

test("index records commit and dirty hash", async () => {
  const text = await skill("index");
  assert.match(text, /last_indexed_commit/);
  assert.match(text, /dirty_hash/);
});

test("share copies are identical", async () => {
  const canonical = await ref("ask", "share.md");
  for (const s of SHARE) assert.equal(await ref(s, "share.md"), canonical, s);
});

test("share stamps snapshots and keeps them away from agents", async () => {
  const text = await ref("ask", "share.md");
  assert.match(text, /Want a shareable copy\?/);
  assert.match(text, /Snapshot of <repo>@<short-sha>/);
  assert.match(text, /agents must re-run the skill instead of reading this/);
  assert.match(text, /Mermaid/);
  assert.match(text, /Artifact/);
  assert.match(text, /invoked by another skill or a subagent.*skip/i);
  assert.match(text, /never write.*into the repo unless/i);
});

test("explore and index never offer sharing", async () => {
  for (const s of ["explore", "index"]) assert.doesNotMatch(await skill(s), /share\.md|shareable/, s);
});

test("report skills point to share", async () => {
  for (const s of SHARE) assert.match(await skill(s), /references\/share\.md/, s);
});
