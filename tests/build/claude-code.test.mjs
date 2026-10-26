import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as claudeCode from "../../harnesses/claude-code/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

test("claude-code adapter writes marketplace and copies plugin resources", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "agent-capabilities-"));
  await write(
    join(repoRoot, "skills/codebase-explore/SKILL.md"),
    "---\nname: codebase-explore\ndescription: Explore codebases.\n---\n\n# Codebase Explore\n",
  );
  await write(join(repoRoot, "skills/codebase-explore/tests/check.sh"), "echo dev-only\n");
  await write(join(repoRoot, "commands/codebase/ask.md"), "# Ask\n");
  await write(join(repoRoot, "hooks/codebase/hooks.json"), "{\"hooks\":[]}\n");

  const registry = {
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
          commands: ["codebase/ask.md"],
          agents: [],
          hooks: ["codebase/hooks.json"],
          templates: [],
          extra: [],
        },
        harnesses: { "claude-code": { enabled: true }, pi: { enabled: true } },
      },
    ],
  };

  await runAdapters({ repoRoot, registry, adapters: [claudeCode] });

  const marketplace = JSON.parse(await readFile(join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"));
  assert.equal(marketplace.plugins[0].source, "./dist/plugins/codebase");

  const plugin = JSON.parse(await readFile(join(repoRoot, "dist/plugins/codebase/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(plugin.name, "codebase");
  assert.equal(plugin.version, "0.1.0");

  assert.equal(
    await readFile(join(repoRoot, "dist/plugins/codebase/skills/codebase-explore/SKILL.md"), "utf8"),
    await readFile(join(repoRoot, "skills/codebase-explore/SKILL.md"), "utf8"),
  );
  await assert.rejects(access(join(repoRoot, "dist/plugins/codebase/skills/codebase-explore/tests")), "dev-only tests/ must not ship");
  assert.equal(await readFile(join(repoRoot, "dist/plugins/codebase/commands/ask.md"), "utf8"), "# Ask\n");
  assert.equal(await readFile(join(repoRoot, "dist/plugins/codebase/hooks/hooks.json"), "utf8"), "{\"hooks\":[]}\n");
});

test("a removed extra or plugin does not survive a rebuild", async (t) => {
  const repoRoot = await mkdtemp(join(tmpdir(), "claude-stale-"));
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  await write(join(repoRoot, "templates/codebase/old.md"), "old\n");
  const plugin = (name, extra = []) => ({
    name,
    version: "1.0.0",
    description: name,
    resources: { skills: [], commands: [], agents: [], hooks: [], templates: [], extra },
  });
  const registry = (plugins) => ({ marketplace: { name: "mp", description: "d", owner: { name: "o" } }, plugins });

  await runAdapters({ repoRoot, registry: registry([plugin("codebase", [{ from: "templates/codebase/old.md", to: "old.md" }]), plugin("gone")]), adapters: [claudeCode] });
  await access(join(repoRoot, "dist/plugins/codebase/old.md"));
  await access(join(repoRoot, "dist/plugins/gone"));

  await runAdapters({ repoRoot, registry: registry([plugin("codebase")]), adapters: [claudeCode] });
  await assert.rejects(access(join(repoRoot, "dist/plugins/codebase/old.md")), "removed extra must not ship");
  await assert.rejects(access(join(repoRoot, "dist/plugins/gone")), "removed plugin must not ship");
});
