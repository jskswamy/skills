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
          skills: ["codebase-explore"],
          commands: [],
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
      "codebase",
      "commit-tools",
      "craft",
      "devenv",
      "guardrails",
      "jot",
      "refactor",
      "sketch-note",
      "study",
      "typst-notes",
    ].sort(),
  );
});

test("validateRegistryResources reports missing command paths", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "registry-resources-"));
  const registry = registryWithResources({ commands: ["codebase/ask.md"] });
  const errors = await validateRegistryResources({ repoRoot, registry });
  assert.match(errors.join("\n"), /codebase commands missing: commands\/codebase\/ask\.md/);
});

test("validateRegistryResources reports skill directories without SKILL.md", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "registry-resources-"));
  await mkdir(join(repoRoot, "skills/codebase-explore"), { recursive: true });
  const registry = registryWithResources({ skills: ["codebase-explore"] });
  const errors = await validateRegistryResources({ repoRoot, registry });
  assert.match(errors.join("\n"), /codebase skills missing SKILL\.md: skills\/codebase-explore/);
});

test("validateRegistryResources reports skill frontmatter without description", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "registry-resources-"));
  await mkdir(join(repoRoot, "skills/codebase-explore"), { recursive: true });
  await writeFile(join(repoRoot, "skills/codebase-explore/SKILL.md"), "---\nname: codebase-explore\n---\n\n# Skill\n");
  const registry = registryWithResources({ skills: ["codebase-explore"] });
  const errors = await validateRegistryResources({ repoRoot, registry });
  assert.match(errors.join("\n"), /codebase skill invalid frontmatter: skills\/codebase-explore\/SKILL\.md/);
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
          commands: resources.commands ?? [],
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
