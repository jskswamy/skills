import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, validateAgents, validateSkills } from "../../scripts/lib/skills.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// a registry with plugin "p" listing every "p/<skill>" fixture entry
const registryFor = (...entries) => ({
  plugins: [...new Set(entries.map((e) => e.split("/")[0]))].map((name) => ({
    name,
    resources: { skills: entries.filter((e) => e.startsWith(`${name}/`)) },
  })),
});

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
  const names = ["good-skill", "wrong-dir", "Bad_Name", "no-desc", "empty-block-desc", "long-desc", "no-front", "no-trigger"];
  const root = await fixture({
    "p/good-skill": "---\nname: good-skill\ndescription: Use when testing.\n---\n",
    "p/wrong-dir": "---\nname: other\ndescription: Use when testing.\n---\n",
    "p/Bad_Name": "---\nname: Bad_Name\ndescription: Use when testing.\n---\n",
    "p/no-desc": "---\nname: no-desc\n---\n",
    "p/empty-block-desc": "---\nname: empty-block-desc\ndescription: |\n---\n",
    "p/long-desc": `---\nname: long-desc\ndescription: Use when ${"x".repeat(1025)}\n---\n`,
    "p/no-front": "# nothing\n",
    "p/no-trigger": "---\nname: no-trigger\ndescription: Does a thing.\n---\n",
  });
  const { errors } = await validateSkills({ repoRoot: root, registry: registryFor(...names.map((n) => `p/${n}`)) });
  const text = errors.join("\n");
  for (const d of ["wrong-dir", "Bad_Name", "no-desc", "empty-block-desc", "long-desc", "no-front", "no-trigger"]) {
    assert.match(text, new RegExp(d), `expected error for ${d}`);
  }
  assert.doesNotMatch(text, /good-skill/);
});

test("validateSkills rejects a SKILL.md that reads a file under agents/", async () => {
  const head = (n) => `---\nname: ${n}\ndescription: Use when testing.\n---\n`;
  const root = await fixture({
    "p/rooted": `${head("rooted")}Read \`<package-root>/agents/p/x.md\` for the session.\n`,
    "p/bare": `${head("bare")}Use \`agents/p/x.md\` as the template.\n`,
    "p/clean": `${head("clean")}Read \`references/x.md\`, then dispatch the \`p:x\` agent.\n`,
  }, { "p/clean/references/x.md": "x\n" });
  const { errors } = await validateSkills({ repoRoot: root, registry: registryFor("p/rooted", "p/bare", "p/clean") });
  const text = errors.join("\n");
  assert.match(text, /rooted\/SKILL\.md: reads agents\/p\/x\.md/);
  assert.match(text, /bare\/SKILL\.md: reads agents\/p\/x\.md/);
  assert.doesNotMatch(text, /clean/);
});

test("validateAgents wants a one-line description of at most 250 chars, no examples, valid as YAML", async () => {
  const root = await mkdtemp(join(tmpdir(), "agents-"));
  const agents = {
    "good.md": '---\nname: good\ndescription: "Use this agent to test: it is quoted."\nmodel: sonnet\n---\nBody\n',
    "plain.md": "---\nname: plain\ndescription: Generates notes from content.\n---\nBody\n",
    "block.md": "---\nname: block\ndescription: |\n  Use this agent to test.\n---\nBody\n",
    "example.md": '---\nname: example\ndescription: "Use this agent. <example>x</example>"\n---\nBody\n',
    "long.md": `---\nname: long\ndescription: ${"x".repeat(251)}\n---\nBody\n`,
    "colon.md": "---\nname: colon\ndescription: Use this agent to test: unquoted.\n---\nBody\n",
  };
  for (const [file, body] of Object.entries(agents)) {
    await mkdir(join(root, "agents", "p"), { recursive: true });
    await writeFile(join(root, "agents", "p", file), body);
  }
  const registry = { plugins: [{ name: "p", resources: { agents: Object.keys(agents).map((f) => `p/${f}`) } }] };
  const text = (await validateAgents({ repoRoot: root, registry })).join("\n");
  for (const bad of ["block", "example", "long", "colon"]) assert.match(text, new RegExp(`agents/p/${bad}\\.md`), `expected error for ${bad}`);
  assert.doesNotMatch(text, /good\.md|plain\.md/);
});

test("all real agents satisfy the description rules", async () => {
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  assert.deepEqual(await validateAgents({ repoRoot, registry }), []);
});

test("all real skills satisfy the hard frontmatter rules", async () => {
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  const { errors } = await validateSkills({ repoRoot, registry });
  assert.deepEqual(errors, []);
});

test("validateSkills checks references/ links in both directions", async () => {
  const fm = (n, body) => `---\nname: ${n}\ndescription: Use when testing.\n---\n${body}`;
  const root = await fixture(
    {
      "p/ok": fm("ok", "Read references/a.md, which links references/b.md.\n"),
      "p/dangling": fm("dangling", "Read references/missing.md.\n"),
      "p/orphan": fm("orphan", "No links here.\n"),
    },
    {
      "p/ok/references/a.md": "see references/b.md\n",
      "p/ok/references/b.md": "leaf\n",
      "p/orphan/references/unused.md": "nobody links me\n",
    },
  );
  const text = (await validateSkills({ repoRoot: root, registry: registryFor("p/ok", "p/dangling", "p/orphan") })).errors.join("\n");
  assert.match(text, /dangling.*references\/missing\.md/);
  assert.match(text, /orphan.*references\/unused\.md/);
  assert.doesNotMatch(text, /skills\/p\/ok\//);
});

test("validateSkills enforces the folder rules", async () => {
  const fm = (n) => `---\nname: ${n}\ndescription: Use when testing.\n---\n`;
  const root = await fixture({
    "p/fine": fm("fine"),
    "p/unlisted": fm("unlisted"),
    "p/p-prefixed": fm("p-prefixed"),
    "ghost/x": fm("x"),
    "local-skill": fm("local-skill"),
  });
  await mkdir(join(root, "skills/empty-plugin"), { recursive: true });
  const text = (await validateSkills({ repoRoot: root, registry: registryFor("p/fine", "p/p-prefixed") })).errors.join("\n");
  assert.match(text, /skills\/p\/unlisted\/SKILL\.md: not listed by plugin p/);
  assert.match(text, /p-prefixed.*must not start with "p-"/);
  assert.match(text, /ghost\/x.*not a registry plugin/);
  assert.match(text, /empty-plugin: plugin folder holds no skill/);
  assert.doesNotMatch(text, /fine\/SKILL|local-skill/);
});
