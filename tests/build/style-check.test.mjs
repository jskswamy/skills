import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);
const script = "plugins/commit-tools/skills/review-commits/lib/style-check.sh";
const classic = "plugins/commit-tools/styles/classic.md";

async function check(subject) {
  try {
    await execFileAsync("bash", [script, subject, classic]);
    return { ok: true, output: "" };
  } catch (error) {
    return { ok: false, output: `${error.stdout}${error.stderr}` };
  }
}

test("classic style rejects label-like subject prefixes", async () => {
  const subjects = [
    "Provision: add SHA-256 config hash",
    "Release notes: provisioning CLI commands",
    "[server] increase request timeout",
    "(parser) handle empty documents",
  ];

  for (const subject of subjects) {
    const result = await check(subject);
    assert.equal(result.ok, false, `${subject} should fail classic style`);
    assert.match(result.output, /prefix/, `${subject} should fail for prefix reason`);
  }
});

test("classic style documents broad prefix prohibition", async () => {
  const content = await readFile(classic, "utf8");

  assert.match(content, /### No Prefixes/);
  assert.match(content, /Provision:/);
  assert.match(content, /Release notes:/);
  assert.match(content, /\[server\]/);
  assert.match(content, /\(parser\)/);
});
