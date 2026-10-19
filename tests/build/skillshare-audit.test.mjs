import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const available = !spawnSync("skillshare", ["--version"], { encoding: "utf8" }).error;

async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), "skillshare-audit-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await mkdir(join(cwd, ".skillshare"));
  await cp(".skillshare/audit-rules.yaml", join(cwd, ".skillshare/audit-rules.yaml"));
  await mkdir(join(cwd, "skills/review-commits/lib"), { recursive: true });
  await writeFile(join(cwd, "skills/review-commits/SKILL.md"), "---\nname: review-commits\ndescription: Use when reviewing local commits.\n---\n\nReview local commits.\n");
  return {
    cwd,
    audit: () => spawnSync("skillshare", ["audit", "-p", "./skills", "-T", "high", "--analyzer", "static", "--no-tui", "-y", "--format", "json"], { cwd, encoding: "utf8" }),
  };
}

test("Skillshare permits the bundled commit executor used by the split helper", { skip: !available && "skillshare is not installed" }, async (t) => {
  const { cwd, audit } = await fixture(t);
  await cp("skills/review-commits/lib/apply-split.sh", join(cwd, "skills/review-commits/lib/apply-split.sh"));
  const result = audit();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).summary.high, 0);
});

test("Skillshare still blocks arbitrary Python subprocess calls", { skip: !available && "skillshare is not installed" }, async (t) => {
  const { cwd, audit } = await fixture(t);
  const path = join(cwd, "skills/review-commits/lib/untrusted.py");
  for (const source of [
    "subprocess.run(['node', external_script])",
    "subprocess.run(['node', commit_script, '--eval', payload])",
    "subprocess.run(command, shell=True)",
  ]) {
    await writeFile(path, source + "\n");
    const result = audit();
    assert.equal(result.status, 1, `${source}\n${result.stdout}${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.ok(report.results.some((r) => r.findings.some((f) => f.ruleId === "shell-execution-0" && f.severity === "HIGH")), result.stdout);
  }
});
