import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const detector = join(process.cwd(), "skills/review-commits/lib/detect-tracker-leaks.sh");

async function git(cwd, args, options = {}) {
  return execFileAsync("git", args, { cwd, ...options });
}

async function makeRepo() {
  const cwd = await mkdtemp(join(tmpdir(), "tracker-leaks-"));
  await git(cwd, ["init"]);
  await git(cwd, ["config", "user.name", "Test User"]);
  await git(cwd, ["config", "user.email", "test@example.com"]);
  await writeFile(join(cwd, "file.txt"), "base\n");
  await git(cwd, ["add", "file.txt"]);
  await git(cwd, ["commit", "-m", "Initial commit"]);
  const { stdout } = await git(cwd, ["rev-parse", "HEAD"]);
  return { cwd, base: stdout.trim() };
}

async function commit(cwd, subject, body = "") {
  await writeFile(join(cwd, "file.txt"), `${subject}\n`, { flag: "a" });
  await git(cwd, ["add", "file.txt"]);
  const message = body ? `${subject}\n\n${body}` : subject;
  await git(cwd, ["commit", "-m", message]);
}

test("detect-tracker-leaks classifies tracker references in commit messages", async () => {
  const { cwd, base } = await makeRepo();
  await commit(cwd, "PROJ-123: add login checks");
  await commit(cwd, "Add config loader", "Refs: beads-abc.2");
  await commit(cwd, "Add parser hook", "A future parser shim (PROJ-789) can reuse this.");
  await commit(cwd, "Normalize store", "After claude-plugins-xyz consolidated state, keep this path stable.");

  const { stdout } = await execFileAsync("bash", [detector, base], { cwd });

  assert.match(stdout, /subject-prefix\tPROJ-123/);
  assert.match(stdout, /trailer\tbeads-abc\.2/);
  assert.match(stdout, /parenthetical\tPROJ-789/);
  assert.match(stdout, /narrative\tclaude-plugins-xyz/);
});

test("detect-tracker-leaks exits cleanly when no leaks exist", async () => {
  const { cwd, base } = await makeRepo();
  await commit(cwd, "Add config loader", "Explain why the loader normalizes paths.\n\nFixes #123\nRefs #456");

  const { stdout } = await execFileAsync("bash", [detector, base], { cwd });

  assert.equal(stdout, "");
});

test("detect-tracker-leaks reports multiple references in one commit", async () => {
  const { cwd, base } = await makeRepo();
  await commit(
    cwd,
    "Add parser hook",
    "Refs: PROJ-111\nResolves beads-parser.4\nA follow-up (PROJ-222) can reuse this.",
  );

  const { stdout } = await execFileAsync("bash", [detector, base], { cwd });
  const lines = stdout.trim().split("\n");

  assert.equal(lines.length, 3);
  assert.match(stdout, /trailer\tPROJ-111/);
  assert.match(stdout, /trailer\tbeads-parser\.4/);
  assert.match(stdout, /parenthetical\tPROJ-222/);
});

test("detect-tracker-leaks supports custom config", async () => {
  const { cwd, base } = await makeRepo();
  await mkdir(join(cwd, ".claude"));
  await writeFile(
    join(cwd, ".claude/commit-tools.local.md"),
    "---\ntracker_patterns:\n  - 'BUG-[0-9]+'\ntrailer_keys:\n  - Related\n---\n",
  );
  await commit(cwd, "Add parser hook", "Related: BUG-42");

  const { stdout } = await execFileAsync("bash", [detector, base], { cwd });

  assert.match(stdout, /trailer\tBUG-42/);
});
