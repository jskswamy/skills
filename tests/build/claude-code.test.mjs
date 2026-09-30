import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateClaudeCode } from "../../scripts/lib/claude-code.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

test("generateClaudeCode writes marketplace and copies plugin resources", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "agent-capabilities-"));
  await write(
    join(repoRoot, "skills/codebase-explore/SKILL.md"),
    "---\nname: codebase-explore\ndescription: Explore codebases.\n---\n\n# Codebase Explore\n",
  );
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

  await generateClaudeCode({ repoRoot, registry });

  const marketplace = JSON.parse(await readFile(join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"));
  assert.equal(marketplace.plugins[0].source, "./plugins/codebase");

  const plugin = JSON.parse(await readFile(join(repoRoot, "plugins/codebase/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(plugin.name, "codebase");
  assert.equal(plugin.version, "0.1.0");

  assert.equal(
    await readFile(join(repoRoot, "plugins/codebase/skills/codebase-explore/SKILL.md"), "utf8"),
    await readFile(join(repoRoot, "skills/codebase-explore/SKILL.md"), "utf8"),
  );
  assert.equal(await readFile(join(repoRoot, "plugins/codebase/commands/ask.md"), "utf8"), "# Ask\n");
  assert.equal(await readFile(join(repoRoot, "plugins/codebase/hooks/hooks.json"), "utf8"), "{\"hooks\":[]}\n");
});
