import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changedPlugins } from "../../scripts/changed-plugins.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

const plugin = (name, version = "1.0.0") => ({
  name,
  version,
  description: `${name} plugin`,
  resources: { skills: [`${name}-skill`], commands: [], agents: [], hooks: [], templates: [], extra: [] },
  harnesses: { antigravity: { enabled: true }, opencode: { enabled: true } },
});
const registry = (plugins) => ({ marketplace: { name: "mp", description: "d", owner: { name: "o" } }, plugins });

// repoRoot holds sources and the committed build; outRoot gets a fresh build.
async function fixture(t) {
  const repoRoot = await mkdtemp(join(tmpdir(), "changed-repo-"));
  const outRoot = await mkdtemp(join(tmpdir(), "changed-out-"));
  t.after(() => Promise.all([rm(repoRoot, { recursive: true, force: true }), rm(outRoot, { recursive: true, force: true })]));
  for (const name of ["a", "b"]) {
    await write(join(repoRoot, `skills/${name}-skill/SKILL.md`), `---\nname: ${name}-skill\ndescription: Use when ${name}.\n---\n`);
  }
  await runAdapters({ repoRoot, registry: registry([plugin("a"), plugin("b")]) });
  const fresh = async (plugins) => {
    const reg = registry(plugins);
    await runAdapters({ repoRoot, outRoot, registry: reg });
    return changedPlugins({ repoRoot, outRoot });
  };
  return { repoRoot, outRoot, fresh };
}

test("version-only change is not a change", async (t) => {
  const { fresh } = await fixture(t);
  assert.deepEqual(await fresh([plugin("a", "1.0.1"), plugin("b")]), []);
});

test("source change reports only that plugin", async (t) => {
  const { repoRoot, fresh } = await fixture(t);
  await write(join(repoRoot, "skills/a-skill/SKILL.md"), "---\nname: a-skill\ndescription: Use when a changes.\n---\n");
  assert.deepEqual(await fresh([plugin("a"), plugin("b")]), ["a"]);
});

test("no committed output reports every plugin", async (t) => {
  const { repoRoot, fresh } = await fixture(t);
  await rm(join(repoRoot, "dist"), { recursive: true });
  assert.deepEqual(await fresh([plugin("a"), plugin("b")]), ["a", "b"]);
});

test("adapter-only change is reported", async (t) => {
  const { repoRoot, outRoot } = await fixture(t);
  const reg = registry([plugin("a"), plugin("b")]);
  await runAdapters({ repoRoot, outRoot, registry: reg });
  await write(join(outRoot, "dist/opencode/b/index.js"), "// changed by an adapter\n");
  assert.deepEqual(await changedPlugins({ repoRoot, outRoot }), ["b"]);
});

test("a plugin dropped from the build is reported", async (t) => {
  const { fresh } = await fixture(t);
  assert.deepEqual(await fresh([plugin("a")]), ["b"]);
});

test("every adapter with per-plugin output is compared", async (t) => {
  const { repoRoot, outRoot } = await fixture(t);
  await runAdapters({ repoRoot, outRoot, registry: registry([plugin("a"), plugin("b")]) });
  await mkdir(join(outRoot, "dist/fake/c"), { recursive: true });
  await writeFile(join(outRoot, "dist/fake/c/plugin.txt"), "new\n");
  const fake = { id: "fake", pluginsDir: "dist/fake" };
  assert.deepEqual(await changedPlugins({ repoRoot, outRoot, adapters: [fake] }), ["c"]);
});
