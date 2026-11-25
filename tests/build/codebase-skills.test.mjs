import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Instruction contracts for the codebase plugin (spec: 2026-11-25-codebase-architecture-design).
const skill = (s) => readFile(`skills/codebase/${s}/SKILL.md`, "utf8");
const ref = (s, f) => readFile(`skills/codebase/${s}/references/${f}`, "utf8");

// Skills that check index freshness, and skills that offer a shareable snapshot.
const FRESH = ["ask", "graph", "impact", "explore", "capabilities", "seams"];
const SHARE = ["ask", "graph", "impact", "capabilities", "seams"];
// Skills added by the 2026-11-25 design; each checks freshness and offers sharing.
const NEW = ["architecture", "tour", "domain", "hotspots", "dead-code"];
FRESH.push(...NEW);
SHARE.push(...NEW);
const refs = async (s) => {
  const dir = `skills/codebase/${s}/references`;
  const names = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  return (await Promise.all(names.map((f) => readFile(`${dir}/${f}`, "utf8")))).join("\n");
};

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

test("new skills are registered", async () => {
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  const skills = registry.plugins.find((p) => p.name === "codebase").resources.skills;
  for (const s of NEW) assert.ok(skills.includes(`codebase/${s}`), s);
});

test("architecture ignores prose and handles missing rules", async () => {
  const text = await refs("architecture");
  assert.match(text, /only.*codebase-rules.*block/i);
  assert.match(text, /prose.*never.*(?:rules|fact)/i);
  assert.match(text, /no rules (?:file|block).*recover only.*offer.*draft/i);
});

test("check reports dead components and violations with why", async () => {
  const text = await ref("architecture", "check.md");
  assert.match(text, /matches no files/);
  assert.match(text, /file:line/);
  assert.match(text, /why/);
  assert.match(text, /never edits? .*ARCHITECTURE\.md/i);
  assert.match(text, /forbid/);
  assert.match(text, /allow-only/);
});

test("recover produces components, dependencies, layers, cycles, diagram", async () => {
  const text = await ref("architecture", "recover.md");
  for (const re of [/get_architecture/, /edge count/i, /layer/i, /cycle/i, /mermaid/i]) assert.match(text, re);
});

test("multi-project checks each repo against its own rules", async () => {
  const text = await ref("architecture", "multi-project.md");
  assert.match(text, /own (?:ARCHITECTURE\.md|rules)/i);
  assert.match(text, /not linked/i);
  assert.match(text, /cross-repo rules.*out of scope/i);
});

test("check runs automatically when a rules block exists", async () => {
  assert.match(await skill("architecture"), /automatic.*rules block|rules block.*automatic/i);
});

test("tour orders entry points, core, edges", async () => {
  const text = await ref("tour", "tour-steps.md");
  assert.match(text, /entry point/i);
  assert.match(text, /fan-in/i);
  assert.match(text, /why.*next/i);
  const at = (w) => text.search(new RegExp(w, "i"));
  assert.ok(at("entry") < at("core") && at("core") < at("edge"), "entry < core < edge");
});

test("domain maps entities to owners and create/modify/read", async () => {
  const text = await ref("domain", "entities.md");
  assert.match(text, /reference count/i);
  assert.match(text, /exclud.*util/i);
  assert.match(text, /own/i);
  assert.match(text, /creat.*modif.*read/i);
});

test("hotspots ranks churn by risk", async () => {
  const text = await ref("hotspots", "ranking.md");
  for (const re of [/git log --since/, /6 months/, /15/, /fan-in/i, /file length.*fallback|fallback.*file length/i, /bd.*offer|offer.*beads/i]) assert.match(text, re);
});

test("dead-code verifies candidates and never deletes", async () => {
  const text = await ref("dead-code", "candidates.md");
  for (const re of [/no inbound/i, /entry point/i, /export/i, /test/i, /\brg\b/, /likely dead/, /unsure: /, /never delete/i]) assert.match(text, re);
});

const description = async (s) => (await skill(s)).match(/^description: "(.*)"$/m)[1];

test("neighbour routing", async () => {
  assert.match(await description("explore"), /codebase:tour/);
  assert.match(await description("capabilities"), /codebase:domain/);
  assert.match(await description("seams"), /codebase:architecture/);
  assert.match(await description("impact"), /codebase:hotspots/);
  assert.match(await description("impact"), /codebase:dead-code/);
  assert.match(await description("ask"), /codebase:architecture/);
});

test("explore includes live rule check", async () => {
  const text = await skill("explore");
  assert.match(text, /codebase-rules/);
  assert.match(text, /codebase:architecture/);
});

test("hooks mention architecture", async () => {
  const bin = await mkdtemp(join(tmpdir(), "cbm-stub-"));
  await writeFile(join(bin, "codebase-memory-mcp"), "#!/bin/sh\n");
  await chmod(join(bin, "codebase-memory-mcp"), 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const run = (f) => execFileSync("bash", [`hooks/codebase/${f}`], { env, encoding: "utf8" });
  assert.match(run("session-reminder.sh"), /codebase:architecture/);
  const sub = JSON.parse(run("subagent-reminder.sh"));
  assert.match(sub.hookSpecificOutput.additionalContext, /codebase:architecture/);
});

test("README lists all twelve skills", async () => {
  const text = await readFile("templates/codebase/README.md", "utf8");
  for (const s of NEW) assert.match(text, new RegExp(`/codebase:${s}`), s);
});
