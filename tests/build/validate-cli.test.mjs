import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A copy of the working tree (tracked and new files) without any built output.
async function sourcesOnly() {
  const dir = await mkdtemp(join(tmpdir(), "validate-cli-"));
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  for (const file of files) await cp(file, join(dir, file), { recursive: true }).catch((e) => (e.code === "ENOENT" ? undefined : Promise.reject(e)));
  for (const built of ["dist", ".claude-plugin", "plugins"]) await rm(join(dir, built), { recursive: true, force: true });
  return dir;
}

test("validate checks the current sources, not committed dist", async (t) => {
  const dir = await sourcesOnly();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const run = spawnSync(process.execPath, [join(dir, "scripts/validate.mjs")], { cwd: dir, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Validation passed/);
});
