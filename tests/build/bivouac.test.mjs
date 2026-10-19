import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const skill = await readFile("skills/bivouac/SKILL.md", "utf8");

test("bivouac routes repo-independent image operations before repo preflight", () => {
  const imageRoute = skill.indexOf("Route image requests");
  const repoCheck = skill.indexOf("git rev-parse --show-toplevel");
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
