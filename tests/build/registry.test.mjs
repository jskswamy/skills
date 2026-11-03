import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateRegistryResources, validateRegistryShape } from "../../scripts/lib/registry.mjs";

test("validateRegistryShape accepts a minimal valid registry", () => {
  const errors = validateRegistryShape({
    marketplace: {
      name: "agent-capabilities",
      description: "Reusable agent capabilities",
      owner: { name: "Owner", email: "owner@example.com" },
    },
    plugins: [
      {
        name: "codebase",
        version: "0.1.0",
        description: "Codebase plugin",
        author: { name: "Owner" },
        category: "code-intelligence",
        tags: ["codebase"],
        resources: {
          skills: ["codebase/explore"],
          agents: [],
          hooks: [],
          templates: [],
          extra: [],
        },
        harnesses: { "claude-code": { enabled: true }, pi: { enabled: true } },
      },
    ],
  });
  assert.deepEqual(errors, []);
});

test("validateRegistryShape reports duplicate plugin names", () => {
  const registry = {
    marketplace: { name: "x", description: "x", owner: { name: "x" } },
    plugins: [
      { name: "dup", version: "1.0.0", description: "x", resources: {}, harnesses: {} },
      { name: "dup", version: "1.0.0", description: "x", resources: {}, harnesses: {} },
    ],
  };
  assert.match(validateRegistryShape(registry).join("\n"), /duplicate plugin name: dup/);
});

test("registry lists all current marketplace plugins", async () => {
  const registry = JSON.parse(await readFile(new URL("../../registry.json", import.meta.url), "utf8"));
  assert.deepEqual(
    registry.plugins.map((plugin) => plugin.name).sort(),
    [
      "bivouac",
      "codebase",
      "commit-tools",
      "craft",
      "devenv",
      "jot",
      "refactor",
      "sketch-note",
      "study",
      "typst-notes",
    ].sort(),
  );
});

test("validateRegistryResources reports missing agent paths", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "registry-resources-"));
  const registry = registryWithResources({ agents: ["codebase/explorer.md"] });
  const errors = await validateRegistryResources({ repoRoot, registry });
  assert.match(errors.join("\n"), /codebase agents missing: agents\/codebase\/explorer\.md/);
});

test("validateRegistryShape requires plugin/skill entries and unique derived ids", () => {
  const plugin = (name, skills) => ({
    name,
    version: "1.0.0",
    description: "x",
    resources: { skills, agents: [], hooks: [], templates: [], extra: [] },
    harnesses: {},
  });
  const shape = (...plugins) =>
    validateRegistryShape({ marketplace: { name: "x", description: "x", owner: { name: "x" } }, plugins }).join("\n");
  assert.match(shape(plugin("a", ["c"])), /skill entry must be "a\/<skill>": c/);
  assert.match(shape(plugin("a", ["b/c"])), /skill entry must be "a\/<skill>": b\/c/);
  assert.match(shape(plugin("a-b", ["a-b/c"]), plugin("a", ["a/b-c"])), /derived id a-b-c is used by/);
  assert.equal(shape(plugin("a", ["a/b"]), plugin("c", ["c/b"])), "");
});

test("the real registry has no commands resource", async () => {
  const registry = JSON.parse(await readFile(new URL("../../registry.json", import.meta.url), "utf8"));
  for (const plugin of registry.plugins) assert.equal(plugin.resources.commands, undefined, plugin.name);
});

test("validateRegistryResources reports skill directories without SKILL.md", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "registry-resources-"));
  await mkdir(join(repoRoot, "skills/codebase/explore"), { recursive: true });
  const registry = registryWithResources({ skills: ["codebase/explore"] });
  const errors = await validateRegistryResources({ repoRoot, registry });
  assert.match(errors.join("\n"), /codebase skills missing SKILL\.md: skills\/codebase\/explore/);
});

function registryWithResources(resources) {
  return {
    marketplace: { name: "x", description: "x", owner: { name: "x" } },
    plugins: [
      {
        name: "codebase",
        version: "0.1.0",
        description: "x",
        resources: {
          skills: resources.skills ?? [],
          agents: resources.agents ?? [],
          hooks: resources.hooks ?? [],
          templates: resources.templates ?? [],
          extra: resources.extra ?? [],
        },
        harnesses: { "claude-code": { enabled: true } },
      },
    ],
  };
}
