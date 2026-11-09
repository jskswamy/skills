import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import * as pi from "../../harnesses/pi/adapter.mjs";
import { withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";

const shape = await readFile("skills/craft/shape/SKILL.md", "utf8");
const build = await readFile("skills/craft/build/SKILL.md", "utf8");

// Instruction contracts catch omitted gates; scenario reviews test their interpretation.
test("Shape checks reusable evidence before analysis and ideation, including existing specs", () => {
  assert.ok(shape.indexOf("**Ground Architecture") < shape.indexOf("**Acquire Specification"));
  assert.match(shape, /unchanged.*sufficient.*reuse.*without invoking/i);
  assert.match(shape, /codebase:capabilities/);
  assert.match(shape, /codebase:seams/);
  assert.match(shape, /existing.*spec.*grounding.*review gate/i);
  assert.match(shape, /scope.*paths.*source references.*revision.*uncommitted.*gaps/i);
});

test("Shape stops every ideation path before detailed implementation planning", () => {
  assert.match(shape, /EGM.*Step 5.*defer.*craft:build/i);
  assert.match(shape, /All ideation paths.*return.*Step 3/i);
  assert.doesNotMatch(shape, /and optional `\/egm-review`/);
});

test("Shape requires explicit Lightweight choice and retains Ponytail in both modes", () => {
  assert.match(shape, /Full.*default.*egm-review.*ponytail-review/i);
  assert.match(shape, /Lightweight.*explicit.*user.*ponytail-review/i);
  assert.match(shape, /Silence.*--auto.*failed.*downgrade/i);
  assert.match(shape, /independent of ideation/i);
  assert.doesNotMatch(shape, /Skip if just audited/);
});

test("Shape supplies architecture evidence to reviewers but isolates comprehension", () => {
  assert.match(shape, /context-aware reviewers.*same.*evidence/i);
  assert.match(shape, /comprehension.*only.*self-contained candidate/i);
  assert.match(shape, /no source.*supplementary.*earlier review/i);
});

test("Shape persists an established gate and dispositions instead of implying review success", () => {
  assert.match(shape, /mode.*authorization.*scope.*rationale.*candidate.*evidence.*outcomes.*dispositions.*approval/i);
  assert.match(shape, /missing.*unestablished/i);
  assert.match(shape, /historical.*coverage/i);
  assert.match(shape, /Must fix.*Blocker.*Should fix.*Major.*Nice to have.*Nit/i);
  assert.match(shape, /Blocker.*Major.*resolve.*individual.*acceptance/i);
  assert.match(shape, /acceptance.*required reviewer.*critical evidence/i);
  assert.match(shape, /re-review affected changes/i);
});

test("Shape grounds thin story slots in the issue-writer-owned contract", () => {
  assert.match(shape, /agents\/craft\/issue-writer\.md/);
  assert.match(shape, /Touch:.*concrete.*paths.*seams/i);
  assert.match(shape, /Verify:.*1[–-]3 runnable/i);
});

test("Build routes fresh and resumed work through final-scope validation before planning", () => {
  assert.match(build, /saved plan.*complete bundle/i);
  assert.doesNotMatch(build, /jump to Step [67]/);
  assert.ok(build.indexOf("**Select Complete Scope") < build.indexOf("**Validate Scope"));
  assert.ok(build.indexOf("**Validate Scope") < build.indexOf("**Story TDD Plan"));
  assert.match(build, /both fresh.*resumed/i);
  assert.match(build, /--auto.*never.*review.*approval/i);
});

test("Build establishes missing legacy gates through Shape rather than inferring approval", () => {
  assert.match(build, /craft:shape.*Evidence and review contract/i);
  assert.match(build, /missing.*mode.*authorization.*outcomes.*dispositions.*approval/i);
  assert.match(build, /Step 3.*Full.*explicit.*Lightweight/i);
  assert.match(build, /historical approval.*insufficient/i);
  assert.match(build, /no linked spec.*shape.*exclude/i);
});

test("Build validates all specs and interactions without downgrading bundled work", () => {
  assert.match(build, /every.*story.*spec.*combined interactions/i);
  assert.match(build, /Full.*keeps Full.*Lightweight/i);
  assert.match(build, /unshaped.*wisp.*approved spec.*excluded/i);
  assert.match(build, /later.*scope.*repeat.*checks/i);
  assert.match(build, /silently add or drop/i);
});

test("Build selectively refreshes evidence and applies the shared material-change rules", () => {
  assert.match(build, /reuse.*current.*evidence.*before.*codebase:capabilities.*codebase:seams/i);
  assert.match(build, /confirmed.current.*coverage.*contracts.*callers.*dependencies/i);
  assert.match(build, /Evidence.*Material changes.*contract/i);
  assert.match(shape, /elapsed time alone does not invalidate/i);
  assert.match(shape, /Moving policy ownership.*contract tests.*material.*behavior is unchanged/i);
  assert.match(shape, /internal helper.*non-material/i);
  assert.match(shape, /Uncertain classification pauses/i);
  assert.match(shape, /Lightweight.*expands.*ask for EGM.*reviewed scope/i);
});

test("Build preserves the saved base SHA and bundle when repairing a resumed plan", () => {
  assert.match(build, /Preserve.*saved bundle.*stored.*base SHA/i);
  assert.match(build, /new plan only.*STORY_BASE_SHA=\$\(git rev-parse HEAD\)/i);
  assert.match(build, /resume.*repair.*without resetting.*STORY_BASE_SHA/i);
});

test("Pi builds rewrite Craft architecture delegation to installed skill names", async () => {
  const repoRoot = process.cwd();
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  await withTempBuild({ repoRoot, registry, adapters: [pi] }, async ({ outRoot }) => {
    for (const skill of ["shape", "build"]) {
      const text = await readFile(join(outRoot, "dist/pi/plugins/craft/skills", skill, "SKILL.md"), "utf8");
      assert.match(text, /codebase-capabilities/);
      assert.match(text, /codebase-seams/);
      assert.doesNotMatch(text, /codebase:(?:capabilities|seams)/);
    }
  });
});
