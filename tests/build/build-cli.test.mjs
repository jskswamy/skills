import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { access, rm } from "node:fs/promises";
import { join } from "node:path";

const status = () => execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });

test("default build writes nothing in the repo", async (t) => {
  const before = status();
  const stdout = execFileSync(process.execPath, ["scripts/build.mjs"], { encoding: "utf8" });
  const out = /^Output: (.+)$/m.exec(stdout.trimEnd().split("\n").at(-1))?.[1];
  assert.ok(out, "last line names the output dir");
  t.after(() => rm(out, { recursive: true, force: true }));
  assert.equal(status(), before);
  await access(join(out, ".claude-plugin/marketplace.json"));
  await access(join(out, ".agents/plugins/marketplace.json"));
});

test("--release and --out together are refused", () => {
  const run = spawnSync(process.execPath, ["scripts/build.mjs", "--release", "--out", "x"], { encoding: "utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /--release/);
});
