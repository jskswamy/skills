import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, validateSkills } from "../../scripts/lib/skills.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function fixture(skills) {
  const root = await mkdtemp(join(tmpdir(), "skills-"));
  for (const [dir, body] of Object.entries(skills)) {
    await mkdir(join(root, "skills", dir), { recursive: true });
    await writeFile(join(root, "skills", dir, "SKILL.md"), body);
  }
  return root;
}

test("parseFrontmatter handles plain, quoted and block scalars", () => {
  const fm = parseFrontmatter(
    `---\nname: a\ndescription: "Use when \\"x\\": y"\nmetadata:\n  version: "1"\n---\nbody`,
  );
  assert.equal(fm.name, "a");
  assert.equal(fm.description, 'Use when "x": y');
  assert.equal(parseFrontmatter("---\ndescription: 'it''s: ok'\n---\n").description, "it's: ok");
  assert.equal(parseFrontmatter("---\ndescription: >\n  one\n  two\n\nname: z\n---\n").description, "one two");
  assert.equal(parseFrontmatter("---\ndescription: |\n  one\n  two\n---\n").description, "one\ntwo");
  assert.equal(parseFrontmatter("no frontmatter"), null);
});

test("validateSkills fails on bad fixtures", async () => {
  const root = await fixture({
    "good-skill": "---\nname: good-skill\ndescription: Use when testing.\n---\n",
    "wrong-dir": "---\nname: other\ndescription: Use when testing.\n---\n",
    "Bad_Name": "---\nname: Bad_Name\ndescription: Use when testing.\n---\n",
    "no-desc": "---\nname: no-desc\n---\n",
    "long-desc": `---\nname: long-desc\ndescription: Use when ${"x".repeat(1025)}\n---\n`,
    "no-front": "# nothing\n",
    "no-trigger": "---\nname: no-trigger\ndescription: Does a thing.\n---\n",
  });
  const { errors, warnings } = await validateSkills({ repoRoot: root });
  const text = errors.join("\n");
  for (const d of ["wrong-dir", "Bad_Name", "no-desc", "long-desc", "no-front"]) {
    assert.match(text, new RegExp(d), `expected error for ${d}`);
  }
  assert.doesNotMatch(text, /good-skill|no-trigger/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no-trigger/);
});

test("all real skills satisfy the hard frontmatter rules", async () => {
  const { errors } = await validateSkills({ repoRoot });
  assert.deepEqual(errors, []);
});
