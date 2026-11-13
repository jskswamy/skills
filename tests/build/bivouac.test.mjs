import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

// The skill keeps its workflows in references/ (SKILL.md stays under Codex's 8,000-byte cut),
// so read SKILL.md first and then every reference.
const dir = "skills/bivouac/session";
const refs = (await readdir(`${dir}/references`)).filter((f) => f.endsWith(".md")).sort();
const skill = (await Promise.all([`${dir}/SKILL.md`, ...refs.map((f) => `${dir}/references/${f}`)].map((p) => readFile(p, "utf8")))).join("\n");

test("bivouac routes repo-independent image operations before repo preflight", async () => {
  const preflight = await readFile(`${dir}/references/preflight.md`, "utf8");
  const imageRoute = preflight.indexOf("Route image requests");
  const repoCheck = preflight.indexOf("git rev-parse --show-toplevel");
  assert.ok(imageRoute >= 0 && imageRoute < repoCheck);
  assert.match(skill, /image list.*image tag.*image prune/);
  assert.match(skill, /image generate --tag/);
  assert.match(skill, /image build --tag/);
  assert.match(skill, /image prune --tag.*--dry-run/);
  assert.match(skill, /--no-prune/);
  assert.match(skill, /arbitrary Nix/);
  assert.match(skill, /image_created/);
});

test("bivouac explains recorded-base replay and resumable retirement", () => {
  assert.match(skill, /recorded starting commit/);
  assert.match(skill, /retirementPhase/);
  assert.match(skill, /lastFailure/);
  assert.match(skill, /completion receipt/);
  assert.match(skill, /session delete <name> --force/);
  assert.match(skill, /merge.*has no `--force`/);
  assert.match(skill, /unreachable.*pending/);
});

test("bivouac config guidance uses public key paths and curated agents", () => {
  assert.match(skill, /public-key file paths/);
  assert.match(skill, /allowUnfreePackages/);
  assert.match(skill, /agents.*packages/);
});

test("bivouac covers session status, issues tracking, and merge verification", () => {
  assert.match(skill, /session status \[name\]/);
  assert.match(skill, /session issues \[name\]/);
  assert.match(skill, /--accept-unsynced/);
  assert.match(skill, /pausedOn.*issues/);
  assert.match(skill, /bd dolt push/);
  assert.match(skill, /synced ✓/);
});

