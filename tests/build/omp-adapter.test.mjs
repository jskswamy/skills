import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as omp from "../../harnesses/omp/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";
import { pathExists, readJson } from "../../scripts/lib/fs-utils.mjs";
import { parseDocument } from "../../scripts/lib/transforms/frontmatter.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

function plugin(name, overrides = {}) {
  return {
    name,
    version: "1.0.0",
    description: `${name} plugin`,
    tags: [name],
    resources: { skills: [`${name}/setup`], agents: [], hooks: [], templates: [], extra: [] },
    harnesses: { omp: { enabled: true } },
    ...overrides,
  };
}

async function fixture(plugins, { outRoot } = {}) {
  const repoRoot = await mkdtemp(join(tmpdir(), "omp-adapter-"));
  for (const { name } of plugins) {
    await write(
      join(repoRoot, `skills/${name}/setup/SKILL.md`),
      `---\nname: setup\ndescription: Set up ${name}\nargument-hint: "<dir>"\n---\n\nRun /${name}:setup, then hand off to ${name}:helper.\n`,
    );
    await write(
      join(repoRoot, `agents/${name}/helper.md`),
      `---\nname: helper\ndescription: Helps ${name}; see ${name}:setup.\nmodel: sonnet\ntools: Read, WebFetch\n---\n\nUse /${name}:setup.\n`,
    );
  }
  const registry = { marketplace: { name: "m", description: "d", owner: { name: "o" } }, plugins };
  await writeFile(join(repoRoot, "registry.json"), JSON.stringify(registry));
  const out = outRoot ?? (await mkdtemp(join(tmpdir(), "omp-out-")));
  const report = await runAdapters({ repoRoot, outRoot: out, registry, adapters: [omp] });
  return { repoRoot, out, report, registry };
}

const withAgent = (name) => plugin(name, { resources: { skills: [`${name}/setup`], agents: [`${name}/helper.md`], hooks: [], templates: [], extra: [] } });

test("omp tree is Claude-shaped without .claude-plugin, hooks.json or a pi key", async () => {
  const { out } = await fixture([withAgent("one")]);
  const root = join(out, "dist/omp/plugins/one");
  assert.deepEqual(await readJson(join(root, ".omp-plugin/plugin.json")), {
    name: "one",
    version: "1.0.0",
    description: "one plugin",
    keywords: ["one"],
  });
  assert.equal(await pathExists(join(root, ".claude-plugin")), false);
  assert.equal(await pathExists(join(root, "hooks/hooks.json")), false);
  const pkg = await readJson(join(root, "package.json"));
  assert.equal(pkg.name, "one");
  assert.equal("pi" in pkg, false);
});

test("skills get plugin-prefixed names and keep slash references; bare references are rewritten", async () => {
  const { out } = await fixture([withAgent("one")]);
  const skill = await readFile(join(out, "dist/omp/plugins/one/skills/setup/SKILL.md"), "utf8");
  assert.equal(parseDocument(skill).frontmatter.name, "one-setup");
  assert.match(skill, /Run \/one:setup, then hand off to one-helper\./);
});

test("each runnable skill gets a commands/<skill>.md wrapper invoking the derived skill id", async () => {
  const { out } = await fixture([withAgent("one")]);
  const { frontmatter, body } = parseDocument(await readFile(join(out, "dist/omp/plugins/one/commands/setup.md"), "utf8"));
  assert.equal(frontmatter.description, "Set up one");
  assert.equal(frontmatter["argument-hint"], "<dir>");
  assert.match(body, /Invoke the `one-setup` skill/);
  assert.match(body, /\$ARGUMENTS/);
});

test("agents keep only a description and a plugin-prefixed name", async () => {
  const { out } = await fixture([withAgent("one")]);
  const { frontmatter, body } = parseDocument(await readFile(join(out, "dist/omp/plugins/one/agents/helper.md"), "utf8"));
  assert.deepEqual(frontmatter, { description: "Helps one; see one-setup.", name: "one-helper" });
  assert.match(body, /Use \/one:setup\./);
});

test("the catalog lists every omp plugin and validate accepts the tree", async () => {
  const { repoRoot, out, registry } = await fixture([withAgent("one"), withAgent("two")]);
  const catalog = await readJson(join(out, ".omp-plugin/marketplace.json"));
  assert.deepEqual(catalog.plugins.map((entry) => [entry.name, entry.source]), [
    ["one", "./dist/omp/plugins/one"],
    ["two", "./dist/omp/plugins/two"],
  ]);
  for (const entry of registry.plugins) assert.deepEqual(await omp.validate({ repoRoot, outRoot: out, plugin: entry }), []);
});

test("validate rejects a catalog that leaves out an omp plugin", async () => {
  const { repoRoot, out, registry } = await fixture([withAgent("one"), withAgent("two")]);
  const path = join(out, ".omp-plugin/marketplace.json");
  const catalog = await readJson(path);
  await writeFile(path, JSON.stringify({ ...catalog, plugins: catalog.plugins.slice(0, 1) }));
  const errors = await omp.validate({ repoRoot, outRoot: out, plugin: registry.plugins[0] });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /lists one; expected one, two/);
});

test("with no omp plugin a leftover .omp-plugin catalog is deleted and none is written", async () => {
  const outRoot = await mkdtemp(join(tmpdir(), "omp-out-"));
  await write(join(outRoot, ".omp-plugin/marketplace.json"), JSON.stringify({ plugins: [{ name: "stale" }] }));
  await fixture([plugin("one", { harnesses: {} })], { outRoot });
  assert.equal(await pathExists(join(outRoot, ".omp-plugin")), false);
  assert.equal(await pathExists(join(outRoot, "dist/omp/plugins/one")), false);
});

test("a hook whose matcher names a tool omp lacks is unsupported; session, subagent and stop hooks carry", () => {
  assert.deepEqual(omp.canCarry({ event: "pre-tool", matcher: "Bash|NotebookEdit" }), {
    unsupported: 'matcher "Bash|NotebookEdit" names a tool omp does not have',
  });
  for (const event of ["session-start", "subagent-start", "stop"]) assert.deepEqual(omp.canCarry({ event }), { ok: true });
  assert.deepEqual(omp.canCarry({ event: "pre-tool", matcher: "Bash|mcp__.*git.*commit" }), { ok: true });
});
