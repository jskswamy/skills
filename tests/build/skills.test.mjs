import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, validateSkills } from "../../scripts/lib/skills.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function fixture(skills, extra = {}) {
  const root = await mkdtemp(join(tmpdir(), "skills-"));
  for (const [dir, body] of Object.entries(skills)) {
    await mkdir(join(root, "skills", dir), { recursive: true });
    await writeFile(join(root, "skills", dir, "SKILL.md"), body);
  }
  for (const [path, body] of Object.entries(extra)) {
    await mkdir(dirname(join(root, "skills", path)), { recursive: true });
    await writeFile(join(root, "skills", path), body);
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
  const { errors } = await validateSkills({ repoRoot: root });
  const text = errors.join("\n");
  for (const d of ["wrong-dir", "Bad_Name", "no-desc", "long-desc", "no-front", "no-trigger"]) {
    assert.match(text, new RegExp(d), `expected error for ${d}`);
  }
  assert.doesNotMatch(text, /good-skill/);
});

test("all real skills satisfy the hard frontmatter rules", async () => {
  const { errors } = await validateSkills({ repoRoot });
  assert.deepEqual(errors, []);
});

test("validateSkills checks references/ links in both directions", async () => {
  const fm = (n, body) => `---\nname: ${n}\ndescription: Use when testing.\n---\n${body}`;
  const root = await fixture(
    {
      ok: fm("ok", "Read references/a.md, which links references/b.md.\n"),
      dangling: fm("dangling", "Read references/missing.md.\n"),
      orphan: fm("orphan", "No links here.\n"),
    },
    {
      "ok/references/a.md": "see references/b.md\n",
      "ok/references/b.md": "leaf\n",
      "orphan/references/unused.md": "nobody links me\n",
    },
  );
  const text = (await validateSkills({ repoRoot: root })).errors.join("\n");
  assert.match(text, /dangling.*references\/missing\.md/);
  assert.match(text, /orphan.*references\/unused\.md/);
  assert.doesNotMatch(text, /skills\/ok\//);
});
