import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseFrontmatter } from "../../scripts/lib/skills.mjs";

test("commit skill descriptions declare invocation conditions", async () => {
  for (const name of ["review-commits", "validate-commits"]) {
    const text = await readFile(`skills/${name}/SKILL.md`, "utf8");
    assert.match(parseFrontmatter(text).description, /^Use when /);
  }
});

test("commit review discloses branch execution without losing its gates", async () => {
  const skill = await readFile("skills/review-commits/SKILL.md", "utf8");
  assert.match(skill, /references\/branch-flow\.md/);
  assert.doesNotMatch(skill, /### Step 6: Execute/);
  const branch = await readFile("skills/review-commits/references/branch-flow.md", "utf8");
  for (const gate of ["### Step 5: Plan Review (User Gate)", "### Step 6: Execute", "### Step 7: Revalidate", "### Step 10: Validate and Cleanup", "### Soft-Reset Escape Hatch"]) {
    assert.ok(branch.includes(gate), gate);
  }
  assert.match(branch, /With `--unattended`/);
});
